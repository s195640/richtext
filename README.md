# journal-entry

Standalone Tiptap component pair for authoring and rendering one journal
entry as a single rich-text document with embedded image, gallery, and video
blocks — built per `data/tiptap-journal-entry-component.md`.

## Layout

```
packages/journal-entry/   the component library (this is what gets installed elsewhere)
playground/                Vite app that mounts it against mock data — the demo
```

## Run the demo

```bash
npm install       # once, from the repo root (npm workspaces)
npm run dev        # starts the playground at http://localhost:5173
```

The playground has three tabs:
- **Editor** — the authoring experience (toolbar, "/" slash menu, drag blocks, image adjust/resize, gallery add/reorder/remove, video upload).
- **Read-only viewer** — renders the same JSON with no editing chrome, for WYSIWYG parity.
- **JSON** — live Tiptap/ProseMirror JSON of the current draft.

"Save" persists the draft to `localStorage`; "Reload saved" proves the JSON round-trips; "Reset to sample" restores the bundled example entry. Uploads are mocked with `URL.createObjectURL` (images) and an offscreen `<video>` + `<canvas>` frame grab for a real poster/duration (videos) — see `playground/src/mockUpload.ts`. No network/backend involved.

## Using it in a host app

```tsx
import { JournalEntryEditor, JournalEntryViewer } from "journal-entry";
import "journal-entry/styles.css";

<JournalEntryEditor
  content={initialJson}
  onChange={(json) => save(json)}
  onUploadImage={async (file) => ({ url: await uploadToHost(file) })}
  onUploadVideo={async (file) => ({ url, poster, duration })}
/>

<JournalEntryViewer content={savedJson} />
```

`onUploadImage`/`onUploadVideo` are the only seam to the outside world — the
component never assumes a backend. Content is plain Tiptap JSON; the viewer
sanitizes/validates it before rendering (see `packages/journal-entry/src/sanitize.ts`)
since it renders user-authored content publicly.

To build the installable package (`dist/`, with type declarations):

```bash
npm run build:lib
```

That produces ESM + CJS bundles plus `journal-entry.css`, ready to `npm link`
or install as a `file:` dependency in another project. During local dev the
playground skips this build entirely and imports the library's `src/`
directly (see `playground/vite.config.ts`) for instant HMR.

## Compatibility

Pinned to `@tiptap/*` `3.27.4` and React `^18.2.0` (see root `package.json`
`overrides` — tiptap's own sub-packages don't consistently pin each other, so
those overrides are load-bearing; don't remove them without re-checking
`npm ls @tiptap/core`).

## Status / known gaps (first working pass)

Everything in the spec's "suggested build order" steps 1–2 is done, most of 3
and 4 too. What's still rough, called out for the next pass:
- **Block drag-reorder** is per-node (image/gallery/video have a drag handle via `draggable` node option); there's no Notion-style handle for plain text blocks (paragraphs/headings) yet.
- **Image resize** is width-only (drag bottom-right corner); pan/zoom is a drag-on-image + slider.
- **Gallery reorder** uses plain HTML5 drag-and-drop (not ProseMirror's), since gallery images are attrs (an array), not child nodes.
- No `npm link`/`file:`-install smoke test against a *second* real host app yet — only verified via the in-repo playground.
