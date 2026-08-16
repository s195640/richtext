# Build spec: standalone Tiptap journal-entry component

## How to use this doc
Hand this whole file to Claude Code as the opening prompt in a **brand-new, empty project** (not this repo — a separate git repo/folder created for this purpose). That project's only goal is to build, run, and debug this component in isolation until it works, as a portable package that can later be installed/imported into another React app. Nothing in the target app (routes, DB, existing admin UI) needs to exist for this build — treat all of that as out of reach; the only contract with it is the integration surface described below.

## Context (why this exists)
The target app is a memorial site with a page ("Honoring Aiden") built from an ordered list of journal entries, each currently composed of separate, independently-typed content blocks (a paragraph of rich text, a single image, a multi-image gallery, a video) stitched together by bespoke React/JS glue. This new component replaces that entire approach for one journal entry: instead of an array of differently-typed rows, one journal entry becomes **one Tiptap document** that natively contains rich text and embedded media blocks together, edited and viewed through Tiptap itself. You do not need any detail about the app's current implementation to build this — design the component fresh, against the requirements below.

## What "done" looks like
A component (or small pair of components) that:
1. Lets an admin author one journal entry as a single free-flowing document: normal rich text (headings, paragraphs, bold/italic/strike, links, bullet/ordered lists, blockquote, horizontal rule) interleaved anywhere with image, gallery, and video blocks, in any order, any number of times.
2. Persists and reloads that document as **Tiptap/ProseMirror JSON** (not HTML) — the custom node types (image/gallery/video) need structured fields (paths, captions, ordering, crop/transform state, video duration, etc.) that don't round-trip cleanly through HTML.
3. Renders that same JSON back in a read-only view that visually matches what the admin saw while editing — no separate "preview" layout.
4. Ships with a runnable local playground (e.g. a small Vite app inside this new project) that mounts both the editor and the read-only viewer against sample/mock data, with no external services required, so it can be driven and debugged directly (type in it, insert media, reorder, reload, inspect the JSON) before it ever gets imported anywhere.

## Content model
One journal entry = one Tiptap document. Custom node types needed, at minimum:
- **Image** — single embedded image; needs a display/crop-ish transform (existing precedent in the target app: pan/zoom/fit within a fixed frame, resizable), a caption/alt if useful, and a way to replace or delete just this block.
- **Gallery** — an ordered set of images grouped as one block (its own internal reorder, add/remove one image without affecting the rest).
- **Video** — an embedded video block with a poster/thumbnail and duration metadata alongside the media reference.
- Standard text nodes/marks Tiptap's StarterKit already covers (paragraph, headings, bold/italic/strike, bullet/ordered list, blockquote, horizontal rule, link).

Design the exact node schema (attrs, node names, NodeView structure) yourself — there's no existing schema to match.

## Editing UX (lives inside the editor itself)
This is a from-scratch Tiptap-native editing experience, not a port of anything existing:
- Insert text formatting via a toolbar and/or slash-style menu.
- Insert image / gallery / video blocks at any point in the document.
- Drag-to-reorder blocks within the document (including reordering images within one gallery block).
- Delete a block.
- Resize/transform an image within its block.
- All of this should feel native to editing a document, not like a stack of separately-managed widgets — that's the whole point of moving to Tiptap.

## Media upload — must stay host-agnostic
This component must not hardcode any upload endpoint, URL scheme, or backend assumption. Media upload should be an **injected capability** — e.g. the host app passes in async callback props (`onUploadImage(file) -> {url, ...}`, `onUploadVideo(file) -> {url, poster, duration}`, or similar; design the exact shape) that the component calls and awaits, then stores whatever the callback returns into the node's attrs. The playground app can implement these callbacks with a trivial local mock (e.g. `URL.createObjectURL`, fake metadata) — it doesn't need a real server.

## Portability / integration contract
The whole reason this is being built standalone is to import cleanly into a separate React app later, so:
- Package it so it can be installed as a dependency (local `npm link`/`file:` install, or built as a proper library bundle — your call, but make sure there's a clear "here's how another project installs and imports this" story documented in the new project's own README).
- Export at least: an editable component (`JournalEntryEditor` or similar — takes initial JSON + upload callbacks + onChange) and a read-only component (`JournalEntryViewer` or similar — takes JSON, renders it).
- Peer-dependency-friendly: assume the host app already has `react`/`react-dom` (v18) and will provide its own React tree — don't bundle a second React instance.
- No global CSS leakage — scope this component's styles (CSS Modules, or another scoped approach) so dropping it into another app doesn't clash with that app's existing styles.
- Sanitize/validate JSON content on the read-only render path (this will hold user-authored rich content, including raw HTML-adjacent marks like links) rather than trusting it blindly, since the host app will be rendering it publicly.

## Compatibility ceiling (target app's current versions — build against these so integration later is a drop-in, not a migration)
- `@tiptap/react` / `@tiptap/starter-kit` and related extensions: **v3.27.x**
- `react` / `react-dom`: **^18.2.0**
- If you want image crop/pan/zoom, `react-easy-crop` (already used in the target app, so a safe pick, not a requirement) is a reasonable option — free to choose a different approach.
- Plain CSS Modules is the target app's convention — not required for this standalone build, but keeps later integration friction-free.

## Explicitly out of scope for this build
- Any real backend/database/persistence — mock it in the playground.
- Matching the target app's current visual design/branding — build your own reasonable default styling; restyling happens at integration time.
- Replicating any of the target app's existing admin components/internals — none of that detail is provided on purpose. Design this fresh against the requirements above.
- Server-side media processing (image conversion, video probing/poster extraction) — the upload callback contract above is the seam; assume the host app's real callbacks will do that work.

## Suggested build order
1. Scaffold the new project + playground app (Vite + React 18) with a bare Tiptap StarterKit editor rendering/saving JSON, to prove the harness works end to end.
2. Add the custom node types (image, gallery, video) as NodeViews with mock upload callbacks wired to the playground.
3. Build the editing UX: insertion, drag-reorder (blocks + within-gallery), delete, image transform.
4. Build the read-only viewer from the same JSON schema; confirm WYSIWYG parity against the editor.
5. Package for import (build/export setup) and write the "how to install this in another project" notes.
6. Debug pass: exercise every interaction in the playground (type, insert each block type, reorder, delete, reload from saved JSON, resize browser) until it's solid.

When this is working end to end in its own project, bring it back here and we'll handle the actual integration into the target app (replacing the current journal-entry rendering, wiring real upload endpoints, data migration if needed) as a separate, deliberate step.
