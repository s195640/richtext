import type { JSONContent } from "@tiptap/core";

const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "hardBreak",
  "image",
  "video",
]);

const ALLOWED_MARKS = new Set(["bold", "italic", "strike", "underline", "link", "code", "textStyle"]);

const SAFE_URL = /^(https?:|mailto:|\/|#)/i;
// Anything of the shape "word:" at the very start — catches every other
// explicit scheme ("javascript:", "data:", "vbscript:", "ftp:", ...) so
// those get rejected outright rather than falling through to the bare-host
// branch below.
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Accepts an absolute http(s)/mailto link, a site-relative path ("/x") or
 * fragment ("#x") as-is; a bare host with no scheme at all (e.g. "google.com",
 * "www.google.com" — what someone actually types into the link prompt more
 * often than not) is treated as shorthand for `https://` rather than
 * dropped, since a bare host isn't a scheme-injection risk (no colon at the
 * front to sniff a scheme from). Any other explicit scheme is rejected.
 */
function sanitizeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  // Strip characters browsers ignore mid-scheme — a classic filter-bypass
  // trick ("java\tscript:alert(1)" still runs as javascript: once rendered).
  const trimmed = href.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!trimmed) return null;
  if (SAFE_URL.test(trimmed)) return trimmed;
  if (ANY_SCHEME.test(trimmed)) return null;
  return `https://${trimmed}`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

const ALLOWED_ALIGN = new Set(["left", "center", "right", "none"]);
const ALLOWED_TEXT_ALIGN = new Set(["left", "center", "right", "justify"]);

function sanitizeTextAlign(value: unknown): string | undefined {
  return typeof value === "string" && ALLOWED_TEXT_ALIGN.has(value) ? value : undefined;
}

function sanitizeImageCrop(value: unknown): { x: number; y: number; zoom: number } | null {
  if (!value || typeof value !== "object") return null;
  const crop = value as Record<string, unknown>;
  if (typeof crop.x !== "number" || typeof crop.y !== "number" || typeof crop.zoom !== "number") return null;
  return {
    x: clampNumber(crop.x, -100000, 100000, 0),
    y: clampNumber(crop.y, -100000, 100000, 0),
    zoom: clampNumber(crop.zoom, 1, 10, 1),
  };
}

function sanitizeImageAttrs(attrs: Record<string, unknown> = {}) {
  const src = sanitizeString(attrs.src);
  return {
    src,
    originalSrc: sanitizeString(attrs.originalSrc) || src || null,
    alt: sanitizeString(attrs.alt),
    title: sanitizeString(attrs.title) || null,
    width: typeof attrs.width === "number" ? clampNumber(attrs.width, 40, 4000, 0) || null : null,
    height: typeof attrs.height === "number" ? clampNumber(attrs.height, 40, 4000, 0) || null : null,
    align: typeof attrs.align === "string" && ALLOWED_ALIGN.has(attrs.align) ? attrs.align : "none",
    crop: sanitizeImageCrop(attrs.crop),
  };
}

function sanitizeVideoAttrs(attrs: Record<string, unknown> = {}) {
  return {
    src: sanitizeString(attrs.src),
    poster: sanitizeString(attrs.poster) || null,
    duration:
      typeof attrs.duration === "number" && Number.isFinite(attrs.duration) && attrs.duration >= 0
        ? attrs.duration
        : null,
    align: typeof attrs.align === "string" && ALLOWED_ALIGN.has(attrs.align) ? attrs.align : "none",
    width: typeof attrs.width === "number" ? clampNumber(attrs.width, 80, 4000, 0) || null : null,
    height: typeof attrs.height === "number" ? clampNumber(attrs.height, 80, 4000, 0) || null : null,
  };
}

// textStyle's color/backgroundColor/fontFamily/fontSize render straight into
// a `style="..."` attribute, so — unlike node attrs, which only ever affect
// this component's own known rendering — these need real validation, not
// just type-coercion: an unvalidated string here is a CSS-injection point
// (e.g. `"red; position:fixed; ..."`) in content the viewer renders publicly.
const SAFE_HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const SAFE_RGB_COLOR = /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i;
const SAFE_HSL_COLOR = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i;
const SAFE_FONT_SIZE = /^\d{1,3}(\.\d+)?(px|pt|em|rem|%)$/;
// Font stacks only ever need letters/digits/spaces/commas/hyphens/quotes
// (e.g. `'Times New Roman', Times, serif`) — anything else (`;`, `(`, `<`, …)
// is rejected outright rather than stripped, since a value like
// `Arial; background:url(...)` should be dropped, not silently truncated.
const SAFE_FONT_FAMILY = /^[a-z0-9\s,'-]{1,120}$/i;

function sanitizeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return SAFE_HEX_COLOR.test(v) || SAFE_RGB_COLOR.test(v) || SAFE_HSL_COLOR.test(v) ? v : null;
}

function sanitizeFontSize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return SAFE_FONT_SIZE.test(v) ? v : null;
}

function sanitizeFontFamily(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v && SAFE_FONT_FAMILY.test(v) ? v : null;
}

/** Drops any attr that doesn't validate, and drops the whole mark if nothing
 * survives (rather than persisting an empty `textStyle` span). */
function sanitizeTextStyleAttrs(attrs: Record<string, unknown> = {}): Record<string, string> | null {
  const out: Record<string, string> = {};
  const color = sanitizeColor(attrs.color);
  if (color) out.color = color;
  const backgroundColor = sanitizeColor(attrs.backgroundColor);
  if (backgroundColor) out.backgroundColor = backgroundColor;
  const fontFamily = sanitizeFontFamily(attrs.fontFamily);
  if (fontFamily) out.fontFamily = fontFamily;
  const fontSize = sanitizeFontSize(attrs.fontSize);
  if (fontSize) out.fontSize = fontSize;
  return Object.keys(out).length ? out : null;
}

function sanitizeMark(mark: NonNullable<JSONContent["marks"]>[number]) {
  if (!ALLOWED_MARKS.has(mark.type)) return null;
  if (mark.type === "link") {
    const href = sanitizeHref(mark.attrs?.href);
    if (!href) return null;
    return { type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer nofollow" } };
  }
  if (mark.type === "textStyle") {
    const attrs = sanitizeTextStyleAttrs(mark.attrs as Record<string, unknown>);
    if (!attrs) return null;
    return { type: "textStyle", attrs };
  }
  return { type: mark.type };
}

/**
 * Defensively validates/normalizes a Tiptap JSON document before it is
 * handed to the read-only viewer, which renders user-authored content
 * (including link marks) in a public context. Unknown node/mark types are
 * dropped rather than trusted; known node attrs are coerced to safe shapes.
 */
export function sanitizeContent(input: unknown): JSONContent {
  const node = sanitizeNode(input as JSONContent, true);
  return node ?? { type: "doc", content: [] };
}

function sanitizeNode(node: JSONContent | null | undefined, isRoot = false): JSONContent | null {
  if (!node || typeof node !== "object" || typeof node.type !== "string") return null;
  if (!ALLOWED_NODES.has(node.type) && !isRoot) return null;
  const type = isRoot ? "doc" : node.type;

  const out: JSONContent = { type };

  if (type === "text") {
    out.text = typeof node.text === "string" ? node.text : "";
    if (!out.text) return null;
  }

  if (node.attrs && typeof node.attrs === "object") {
    if (type === "image") out.attrs = sanitizeImageAttrs(node.attrs as Record<string, unknown>);
    else if (type === "video") out.attrs = sanitizeVideoAttrs(node.attrs as Record<string, unknown>);
    else if (type === "heading") {
      const level = clampNumber((node.attrs as any).level, 1, 6, 2);
      const textAlign = sanitizeTextAlign((node.attrs as any).textAlign);
      out.attrs = textAlign ? { level, textAlign } : { level };
    } else if (type === "paragraph") {
      const textAlign = sanitizeTextAlign((node.attrs as any).textAlign);
      if (textAlign) out.attrs = { textAlign };
    } else out.attrs = node.attrs;
  }

  if (Array.isArray(node.marks)) {
    const marks = node.marks.map(sanitizeMark).filter((m): m is NonNullable<typeof m> => !!m);
    if (marks.length) out.marks = marks;
  }

  if (Array.isArray(node.content)) {
    const content = node.content.map((child) => sanitizeNode(child)).filter((c): c is JSONContent => !!c);
    if (content.length) out.content = content;
  }

  return out;
}
