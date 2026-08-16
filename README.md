# content-editor

Standalone Tiptap component pair for authoring and rendering one document as
a single rich-text document with embedded images and videos, built on
`StarterKit` plus a custom image node (extends `@tiptap/extension-image`)
and a custom video node (`extensions/Video.tsx`, fully custom — Tiptap has no
generic video extension) — see `data/tiptap-journal-entry-component.md` for
the original spec this was first built against (a journal-entry admin
editor; the package was later generalized and renamed to `content-editor`
since it's used for more than that now) and
`data/tiptap-image-editor-feature-spec_2.md` for the image-editing feature
spec the image node implements. Gallery blocks remain out of scope (dropped
in favor of just image + video; may return as a deliberate follow-up).

## Layout

```
packages/content-editor/   the component library (this is what gets installed elsewhere)
playground/                 Vite app that mounts it against mock data — the demo
```

## Run the demo

```bash
npm install       # once, from the repo root (npm workspaces)
npm run dev        # starts the playground at http://localhost:5173
```

The playground has three tabs:
- **Editor** — the authoring experience (toolbar, "/" slash menu, ":" emoji typeahead,
  a 🙂 toolbar dropdown to search/browse and click an emoji directly, image + video
  upload). Select an inserted image or video to get its floating toolbar: align
  (none/left/right/center, driving CSS-float text wrap), replace (⟳), delete (✕); both also
  get a resize handle (drag the bottom-right corner) — images additionally get crop/zoom
  (✂), which doesn't apply to video. Drag the grip (⠿) in the corner of either to move it
  elsewhere in the document.
- **Read-only viewer** — renders the same JSON with no editing chrome, for WYSIWYG parity;
  shown side by side at desktop width and a 375px mobile-width frame, so layout (especially
  floated/wrapped images) can be checked at both sizes at once.
- **JSON** — live Tiptap/ProseMirror JSON of the current draft.

"Save" persists the draft to `localStorage`; "Reload saved" proves the JSON round-trips; "Reset to sample" restores the bundled example document. Image/video uploads are mocked with `URL.createObjectURL` — video additionally gets a real poster frame + duration via an offscreen `<video>` + `<canvas>` grab, no server involved — see `playground/src/mockUpload.ts`.

## Installing in another project

Published to GitHub Packages as `@s195640/content-editor` (private — this repo contains
some non-public context, see `data/tiptap-journal-entry-component.md`). The consuming
project needs its own `.npmrc` (not committed — put the token somewhere untracked, e.g. an
env var or your global `~/.npmrc`) pointing the `@s195640` scope at GitHub Packages:

```
@s195640:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<a GitHub PAT with read:packages scope>
```

Then it installs like any normal package:

```bash
npm install @s195640/content-editor
```

## Using it in a host app

```tsx
import { ContentEditor, ContentViewer, ContentJsonViewer } from "@s195640/content-editor";
import "@s195640/content-editor/styles.css";

<ContentEditor
  content={initialJson}
  onChange={(json) => save(json)}
  onUploadImage={async (file) => ({ url: await uploadToHost(file) })}
  onUploadVideo={async (file) => ({ url: await uploadToHost(file), poster, duration })}
  onSave={(json) => persist(json)}
  active={entry.active}
  onActiveChange={(active) => setEntryActive(active)}
  toolbarOffset={64} // clears a 64px fixed/sticky app header — see below
/>

<ContentViewer content={savedJson} />

<ContentJsonViewer content={savedJson} />
```

`onUploadImage`/`onUploadVideo` are the only seam to the outside world — the
component never assumes a backend. Content is plain Tiptap JSON; the viewer
sanitizes/validates it before rendering (see `packages/content-editor/src/sanitize.ts`)
since it renders user-authored content publicly.

`ContentJsonViewer` is a third, optional export: a pretty-printed, read-only dump of the raw
JSON with a "Copy" button — an inspection/debugging aid (what the playground's "JSON" tab
uses), not part of the editing or public-rendering path. Unlike `ContentViewer` it doesn't
sanitize its input, since it only ever renders the JSON as inert text on the page, never as
live DOM.

To build the installable package (`dist/`, with type declarations):

```bash
npm run build:lib
```

That produces ESM + CJS bundles plus `content-editor.css`, ready to `npm link`
or install as a `file:` dependency in another project. During local dev the
playground skips this build entirely and imports the library's `src/`
directly (see `playground/vite.config.ts`) for instant HMR.

## Releasing a new version

Publishing is CI-driven (`.github/workflows/publish-content-editor.yml`), triggered by
pushing a version tag — pushing to `main` alone does *not* publish:

```bash
npm version <patch|minor|major> --workspace @s195640/content-editor
git tag content-editor-v$(node -p "require('./packages/content-editor/package.json').version")
git push && git push --tags
```

The workflow builds and runs `npm publish --workspace @s195640/content-editor` using
GitHub's automatically-provisioned per-run token — no personal access token needed for
publishing, only for installing (see "Installing in another project" above).

## Compatibility

Pinned to `@tiptap/*` `3.27.4` and React `^18.2.0` (see root `package.json`
`overrides` — tiptap's own sub-packages don't consistently pin each other, so
those overrides are load-bearing; don't remove them without re-checking
`npm ls @tiptap/core`).

## Image editing

The `image` node (`packages/content-editor/src/extensions/Image.tsx`) extends
`@tiptap/extension-image` rather than replacing it, so plain `{ type: "image", attrs: { src, alt } }`
JSON is still valid — the extra attrs below are additive:

| Attr | Purpose |
|---|---|
| `originalSrc` | Uncropped source, kept alongside the (possibly cropped) `src` so re-cropping is never lossy. Defaults to `src` on insert. |
| `width` / `height` | Explicit display size in px (drag-resize sets both, preserving aspect ratio); `null` = intrinsic size. |
| `align` | `"none" \| "left" \| "center" \| "right"` — `left`/`right` render as CSS `float` so paragraph text wraps around the image, in both the editor and the read-only viewer/any HTML rendered from the JSON. |
| `crop` | `{ x, y, zoom } \| null` — last crop/pan/zoom state, so reopening the crop editor resumes where you left off. |

Cropping is destructive-on-apply: it draws the selected region of `originalSrc` to an
off-screen canvas, exports a blob, and re-runs it through the host's `onUploadImage`
callback — same upload seam as inserting a new image, no separate endpoint needed.

The `left`/`right`/`center` float only applies when the component itself has enough
horizontal room: `.root` is a CSS container (`container-type: inline-size`), and below
`420px` of *component* width — not browser viewport width, so this also kicks in inside a
narrow desktop column, not just on an actual phone — floated/fixed-width images drop the
float and go full-width instead, so a sized-for-desktop image can't crush the wrapped text
into a sliver. See it in the playground's side-by-side desktop/mobile viewer.

## Video

The `video` node (`extensions/Video.tsx`) is fully custom — unlike images, Tiptap ships no
generic video extension to extend. Built for parity with the image node's alignment,
reposition, and resize behavior, while deliberately skipping crop — that doesn't map onto a
video stream the same way:

| Attr | Purpose |
|---|---|
| `src` | Video URL. |
| `poster` | Poster/thumbnail image URL, shown before playback starts. |
| `duration` | Seconds; rendered as an `mm:ss` badge over the video. |
| `align` | Same four values and same float/text-wrap behavior as the image node's `align`, including the same `<420px` component-width fallback to full-width. |
| `width` / `height` | Explicit display size in px (drag the bottom-right corner to resize, same as images — aspect ratio preserved via the loaded video's own `videoWidth`/`videoHeight`); `null` = fills the available width. |

Insertable via the toolbar's 🎬 button, the "/" slash menu, or drag-drop/paste (the same
`FileHandler` config used for images branches on MIME type). Uses the host's
`onUploadVideo` callback — same seam/shape as `onUploadImage`, just for video (it's on the
host to generate the poster/duration; the playground's mock does this locally via an
offscreen `<video>` + `<canvas>` frame grab, no server involved).

## Text styling

Font family, font size, text color, and background color (`Toolbar.tsx`'s
`FontFamilyDropdown`/`FontSizeDropdown`/`TextColorDropdown`/`BackgroundColorDropdown`, in
`components/TextStyleControls.tsx`) — all live on the same `textStyle` mark, via
`@tiptap/extension-text-style`'s `TextStyleKit` (which also brought in a `lineHeight`
extension we don't expose any UI for yet, left enabled since it's inert unless someone sets
it directly in JSON). Color/background pickers offer a preset swatch grid plus a native
`<input type="color">` for anything else; font family/size are curated preset lists, not
freeform text input.

Since `color`/`backgroundColor`/`fontFamily`/`fontSize` render straight into a `style="..."`
attribute in content the viewer renders publicly, the sanitizer validates each one against a
strict pattern (hex/`rgb()`/`hsl()` for colors, a `<number><unit>` pattern for font size, an
alphanumeric-plus-quotes-and-commas pattern for font family) and drops anything that doesn't
match, rather than trusting arbitrary strings into a style attribute.

A 🧹 **Clear formatting** button (also in `TextStyleControls.tsx`) resets font family, font
size, text color, background color, bold, italic, and strikethrough in one click — a
deliberately narrower "clear" than the term usually implies: underline, code, links,
alignment, and block formatting (headings/lists/blockquote) are left alone.

**Text alignment** — left/center/right/justify (`Toolbar.tsx`'s `TextAlignDropdown`, via
`@tiptap/extension-text-align`) applies to paragraphs and headings. The sanitizer validates
`textAlign` against that same four-value allowlist on both node types.

## Links

The toolbar's Link button (and `@tiptap/extension-link`'s `autolink`) store whatever href you
give it verbatim — the viewer is what enforces safety, via `sanitize.ts`'s `sanitizeHref`.
A bare host with no scheme at all (`google.com`, `www.google.com` — what people actually type
more often than a full `https://...`) is treated as shorthand for `https://` rather than
dropped; `http:`/`https:`/`mailto:` links and site-relative `/path`/`#fragment` links pass
through as-is. Anything with an explicit *other* scheme (`javascript:`, `data:`, `vbscript:`,
`ftp:`, ...) is rejected outright, including past a classic bypass (stripped control
characters splitting the scheme, e.g. `"java\tscript:alert(1)"`) that a naive `startsWith`
check would miss.

## Emoji

Two ways to insert one, both matched by name/shortcode/tag against the same data:
- Typing `:` opens a typeahead (`extensions/EmojiSuggestion.tsx`), same pattern as the "/"
  slash menu.
- The toolbar's 🙂 dropdown (`Toolbar.tsx`'s `EmojiPickerDropdown`) opens a search box +
  scrollable grid for browsing/clicking one directly, no typing required.

Either way, picking one inserts the literal unicode character as plain text — there's no
custom `emoji` node/attrs (uses `@tiptap/extension-emoji` only for its data, not its Node),
so it needs no schema or sanitizer entry and round-trips through anything that can store a
string.

The searchable emoji dataset (`@tiptap/extension-emoji`'s `emojis` list, ~1,950 entries) is
a few hundred KB, so both the typeahead and the toolbar dropdown share one lazily-loaded,
cached copy (`extensions/emojiData.ts`, `import()`ed on first actual use — first `:`
keystroke or first click on 🙂 — not from `extensions/index.ts`). Confirmed via
`npm run build:lib` to land in its own chunk (`dist/index-*.js`), separate from the
eagerly-loaded main bundle (`content-editor.js`) that both the toolbar UI and the rest of the
editor ship in. Net effect: the read-only viewer (which never registers either picker) never
fetches it, and the editor only fetches it on first actual use.

## Save button and Active switch

Two icon-only buttons (💾 and ⏻), after a divider immediately right of the 🙂 emoji picker —
host-wired controls, neither of which the component gives any meaning to on its own:

- **💾 Save** — disabled until the document actually changes (tracked internally from
  Tiptap's `onUpdate`), so it can't fire a no-op save. Clicking it calls `onSave(json)` with
  the current document and clears the dirty flag; it doesn't touch `onChange`, which still
  fires on every keystroke as before.
- **⏻ Active** — a toggle button, highlighted (same blue "active" state as Bold/Italic/etc.)
  when on; what it *means* (published vs. draft, enabled vs. disabled, etc.) is entirely up
  to the host. `active` sets its initial state (defaults to `true`); `onActiveChange(active)`
  fires on every toggle. Like `content`, it's initial-value-only — the button owns its state
  internally after mount, it isn't re-synced from a later `active` prop change.

Both are optional; omit `onSave`/`onActiveChange` and the controls render but are inert.

## Toolbar sticky offset

The toolbar sticks to the top of its scroll container while editing (`position: sticky; top`)
so it stays visible on a long document. If the host app has its own fixed/sticky header above
it, that header would otherwise cover the toolbar once the page scrolls past it — set
`toolbarOffset` to the header's height to push the sticky point down below it. A number is
treated as px; a string is passed straight through as any CSS length (`"4rem"`,
`"var(--header-height)"`, ...). Defaults to `0`. See the playground's `APP_BAR_HEIGHT` /
mock nav bar (`playground/src/App.tsx`) for a working example.

## Status / known gaps

- **No gallery block** — the earlier custom multi-image `galleryBlock` NodeView was removed and hasn't come back; Tiptap has no generic equivalent for it, so it'd need its own designed node if/when needed.
- **No crop on video** — deliberately out of scope (see "Video" above); doesn't map onto a video stream the way it does for a still image.
- **No captions** on the image or video node.
- **No block drag-reorder** for non-image/video node types (paragraphs/headings/etc).
- No `npm link`/`file:`-install smoke test against a *second* real host app yet — only verified via the in-repo playground.
