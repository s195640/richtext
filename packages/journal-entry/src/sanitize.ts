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
  "imageBlock",
  "galleryBlock",
  "videoBlock",
]);

const ALLOWED_MARKS = new Set(["bold", "italic", "strike", "underline", "link", "code"]);

const SAFE_URL = /^(https?:|mailto:|\/|#)/i;

function sanitizeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!SAFE_URL.test(trimmed)) return null;
  return trimmed;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function sanitizeImageBlockAttrs(attrs: Record<string, unknown> = {}) {
  return {
    src: sanitizeString(attrs.src),
    alt: sanitizeString(attrs.alt),
    caption: sanitizeString(attrs.caption),
    width: typeof attrs.width === "number" ? clampNumber(attrs.width, 40, 4000, 0) || null : null,
    frameHeight: clampNumber(attrs.frameHeight, 40, 2000, 360),
    zoom: clampNumber(attrs.zoom, 1, 6, 1),
    focalX: clampNumber(attrs.focalX, 0, 1, 0.5),
    focalY: clampNumber(attrs.focalY, 0, 1, 0.5),
  };
}

function sanitizeGalleryBlockAttrs(attrs: Record<string, unknown> = {}) {
  const items = Array.isArray(attrs.items) ? attrs.items : [];
  return {
    items: items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        id: sanitizeString(item.id) || Math.random().toString(36).slice(2, 10),
        src: sanitizeString(item.src),
        alt: sanitizeString(item.alt),
        caption: sanitizeString(item.caption),
      }))
      .filter((item) => item.src),
  };
}

function sanitizeVideoBlockAttrs(attrs: Record<string, unknown> = {}) {
  return {
    src: sanitizeString(attrs.src),
    poster: sanitizeString(attrs.poster),
    duration: typeof attrs.duration === "number" && Number.isFinite(attrs.duration) ? attrs.duration : null,
    caption: sanitizeString(attrs.caption),
  };
}

function sanitizeMark(mark: NonNullable<JSONContent["marks"]>[number]) {
  if (!ALLOWED_MARKS.has(mark.type)) return null;
  if (mark.type === "link") {
    const href = sanitizeHref(mark.attrs?.href);
    if (!href) return null;
    return { type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer nofollow" } };
  }
  return { type: mark.type };
}

/**
 * Defensively validates/normalizes a Tiptap JSON document before it is
 * handed to the read-only viewer, which renders user-authored content
 * (including link marks) in a public context. Unknown node/mark types are
 * dropped rather than trusted; known node attrs are coerced to safe shapes.
 */
export function sanitizeJournalEntryContent(input: unknown): JSONContent {
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
    if (type === "imageBlock") out.attrs = sanitizeImageBlockAttrs(node.attrs as Record<string, unknown>);
    else if (type === "galleryBlock") out.attrs = sanitizeGalleryBlockAttrs(node.attrs as Record<string, unknown>);
    else if (type === "videoBlock") out.attrs = sanitizeVideoBlockAttrs(node.attrs as Record<string, unknown>);
    else if (type === "heading") out.attrs = { level: clampNumber((node.attrs as any).level, 1, 6, 2) };
    else out.attrs = node.attrs;
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
