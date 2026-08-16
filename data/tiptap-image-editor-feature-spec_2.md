# Feature Spec: Advanced Image Handling in Tiptap Editor

## Implementation status: done, with one deviation

Implemented in `packages/content-editor/src/extensions/Image.tsx` (package
renamed from `journal-entry` since — see root `README.md`) — all four
capabilities (insert, text-wrap alignment, drag-reposition, inline
crop/zoom/pan) and the attr schema below are in place; see the "Image
editing" section of the root `README.md` for the attr table and how the crop
upload seam works.

**Deviation:** skipped the Tiptap CLI `image-node-pro` component (its
licensing/auth model wasn't verified for this project) in favor of one
custom `Image.extend()` NodeView built directly on `@tiptap/extension-image`
+ `@tiptap/extension-file-handler` (paste/drop) + `react-easy-crop`, covering
the same four requirements with only free/MIT packages. Concretely, this
means:
- Reposition uses ProseMirror's native node-drag (a small grip icon marked
  `data-drag-handle`) rather than `@tiptap/extension-drag-handle-react`'s
  Notion-style handle that floats next to any block.
- No caption field (not in this spec's four requirements; the old removed
  `imageBlock` node had one, `image` doesn't).
- The `tiptap-extension-resize-image` fallback mentioned below wasn't
  needed — resize is hand-rolled (drag the bottom-right corner) directly in
  the same NodeView as everything else.

## Context

This is a React (Vite) + Node project with a Tiptap-based rich text editor used by admins
to edit website pages. Page content is stored as Tiptap's ProseMirror JSON in a database
and rendered back out on the public site (JSON is the source of truth; HTML is generated
from it for display).

## Current state (starting point for this spec)

The `journal-entry` package previously had bespoke `imageBlock`/`galleryBlock`/
`videoBlock` Tiptap nodes (custom pan/zoom/crop UI, multi-image grouping,
video+poster+duration). Those were removed in favor of Tiptap's stock
`@tiptap/extension-image` node — currently just a plain `<img>` with
`src`/`alt`/`title`, inserted via the toolbar or "/" slash menu, no resize,
crop, alignment, or reposition support. Gallery and video blocks are gone
entirely for now (out of scope here; would come back as their own deliberate
design later). This spec's job is to build the richer image editing
experience (wrap, reposition, crop/zoom/pan) back on top of that plain image
node using the packages below, rather than reviving the old custom NodeView.

## Goal

Add rich image handling to the existing Tiptap editor with four capabilities:

1. **Insert images** into the editor content (upload + insert as a node).
2. **Text wrap** — images can float left/right/center so surrounding paragraph text
   wraps around them, like a traditional CMS/blog image.
3. **Reposition** — admin can drag the image to a different point in the document
   (move it earlier/later in the content), in addition to left/right alignment.
4. **Inline crop/zoom/pan** — admin can crop, zoom, and pan the image directly in the
   editor (in place, not in a separate modal), and see the result live in the document.

Use existing, maintained open-source/free packages wherever possible instead of building
from scratch. Custom code should only fill the gaps between these packages.

---

## Recommended packages

Install these (all free/MIT unless noted):

```bash
# Base image node + upload handling (official Tiptap, MIT)
npm install @tiptap/extension-image @tiptap/extension-file-handler

# Drag-to-reposition any block, including images (official Tiptap, MIT)
npm install @tiptap/extension-drag-handle-react @tiptap/extension-drag-handle

# Inline crop / zoom / pan UI (MIT)
npm install react-easy-crop
```

Also pull in Tiptap's official prebuilt **Image Node Pro** UI component. This is not an
npm package — it's copied into your codebase via the Tiptap CLI and already provides
drag-to-resize, alignment (left/center/right → float-based text wrap), a floating
toolbar, captions, download/replace/delete actions, and correct node-position tracking:

```bash
npx @tiptap/cli@latest add image-node-pro floating-element toolbar
```

This single component covers requirements #2 (text wrap via alignment) and most of the
resize part of #4 out of the box. We only need to layer in crop/zoom/pan and reordering
on top of it.

If `image-node-pro` doesn't fit (e.g. you want a lighter footprint), the fallback is the
community package `tiptap-extension-resize-image` (MIT) which provides similar
resize + align + caption functionality as a single extension.

---

## Architecture

Four building blocks working together on one custom Image node:

| Requirement | Solution |
|---|---|
| Insert images | `@tiptap/extension-image` + `@tiptap/extension-file-handler` (handles paste/drop/file-picker → upload → insert node) |
| Text wrap (left/right/center) | `align` attribute on the image node, rendered as CSS `float: left / right / none` — provided by Image Node Pro's alignment controls |
| Reposition in document | `@tiptap/extension-drag-handle-react` — adds a Notion-style grip handle that drags the whole node to a new position in the doc. Works alongside alignment (drag handle = "where in the flow", alignment = "float side") |
| Inline crop/zoom/pan | Custom React Node View wrapping `react-easy-crop`, toggled in place over the same node (no modal) |

### Image node attribute schema

Extend the image node's attrs to support all of this:

```ts
{
  src: string          // current, possibly-cropped image URL (what's displayed)
  originalSrc: string  // uncropped source image URL — kept so re-cropping isn't lossy
  alt: string
  width: number | null
  height: number | null
  align: 'left' | 'center' | 'right' | 'none'
  crop: {              // optional, lets you reopen the cropper at the last state
    x: number
    y: number
    zoom: number
  } | null
}
```

### CSS for text wrap

Whatever renders the image node (Image Node Pro's markup, or your own) needs float CSS
driven by the `align` attribute:

```css
.tiptap-image[data-align="left"]   { float: left;  margin: 0 1rem 1rem 0; }
.tiptap-image[data-align="right"]  { float: right; margin: 0 0 1rem 1rem; }
.tiptap-image[data-align="center"] { float: none;  display: block; margin: 1rem auto; }
.tiptap-image[data-align="none"]   { float: none; }
```

Apply the same classes/attributes when generating public-facing HTML from the stored
JSON, so text wrap looks the same on the live site as it does in the editor.

---

## Implementation steps

1. **Install packages** listed above.

2. **Set up base image + upload.** Configure `Image` with the `FileHandler` extension so
   drag-drop and paste of image files trigger an upload to your backend (existing image
   upload endpoint, or add one — store the file, return a URL). Insert the returned URL
   as both `src` and `originalSrc` on a new image node.

3. **Wire in Image Node Pro.** Follow its docs to mount `FloatingElement` + `Toolbar` +
   `ImageNodeFloating` so that selecting an image shows alignment, resize, and other
   controls. Confirm alignment produces the `align` attribute and float CSS behaves as
   above, with adjacent paragraph text wrapping correctly.

4. **Add the drag handle.** Mount `<DragHandle>` (React) at the editor root per its docs.
   Confirm you can grab an image block and drag it to a new position in the document,
   same as any other block.

5. **Build the inline crop/zoom node view.** Extend or wrap the image node's React
   component with an `editing` boolean state:
   - **View mode (default):** renders the image normally (through Image Node Pro or your
     own markup), with an "Edit image" button/icon added to its floating toolbar.
   - **Edit mode (on click):** in the same position in the document, render
     `react-easy-crop`'s `<Cropper>` against `originalSrc`, inside a container with a
     fixed size (`position: relative`, explicit width/height — required by the library).
     Show local crop/zoom controls (slider for zoom, drag to pan) plus "Apply" / "Cancel"
     buttons.
   - **On Apply:** use the crop pixel data from `onCropComplete` to draw the cropped
     region to an off-screen `<canvas>`, export it as a blob, upload it, and call
     `updateAttributes({ src: newUrl, crop: { x, y, zoom } })`. Set `editing` back to
     false. `originalSrc` is left untouched so the crop is always re-editable from the
     unmodified source.
   - **On Cancel:** discard local state, `editing` back to false, no attrs change.

6. **Persistence** — no changes needed here. All of this (src, originalSrc, align, crop,
   width, height) lives in node attrs, which are already part of `editor.getJSON()` and
   flow through your existing save/load API untouched.

7. **Public-site rendering** — when generating HTML from stored JSON for the live page,
   make sure your renderer (`generateHTML` / static renderer / custom renderer) applies
   the same `data-align` → float CSS mapping used in the editor, so wrapped text looks
   identical on the published page.

---

## Notes / gotchas

- Node views for atomic content like images render with `contentEditable="false"`
  automatically, so `react-easy-crop`'s internal drag/mouse handling won't conflict with
  ProseMirror's text selection/editing elsewhere in the doc — no extra work needed there.
- Only mount the live `Cropper` component for the one image currently being edited, not
  for every image in the document — toggle it per-instance via local state to avoid
  running multiple crop canvases at once.
- Resizing (Image Node Pro's resize handles) changes *display* width/height only, not the
  underlying file. If large source images become a performance concern later, consider
  generating optimized/resized derivatives server-side (e.g. with `sharp` in Node) — a
  separate concern from the editor itself, not needed for an initial version.
- Keep `originalSrc` around indefinitely (or at least until you're sure no one needs to
  re-crop) — deleting it turns future re-crops into lossy re-crops-of-crops.

---

## Acceptance criteria

- [x] Admin can insert an image via file picker, drag-drop, or paste.
- [x] Admin can set an image to float left, right, or center, with paragraph text
      wrapping around it correctly in both the editor and the published page.
- [x] Admin can drag an image (via drag handle) to a different position in the page
      content, independent of its left/right alignment.
- [x] Admin can click "Edit image" and crop/zoom/pan the image in place, inline in the
      document, and see the result immediately without leaving the editor or opening a
      modal.
- [x] Re-opening "Edit image" on an already-cropped image crops from the original
      uncropped source, not the previously-cropped result.
- [x] All of the above persists correctly through save → reload (page refresh restores
      exact image, position, alignment, and size) — verified in the `journal-entry`
      playground (localStorage round-trip), not yet against a real "published page" /
      second host app (no such app exists yet — see README's "Status / known gaps").
