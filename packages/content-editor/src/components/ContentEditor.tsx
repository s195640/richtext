import { useCallback, useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { buildExtensions } from "../extensions";
import { UploadCallbacksContext } from "../uploadContext";
import { Toolbar } from "./Toolbar";
import type { UploadCallbacks, ContentDocument } from "../types";
import styles from "../styles/ContentEditor.module.css";

export interface ContentEditorProps extends UploadCallbacks {
  /** Initial Tiptap/ProseMirror JSON. Omit or pass `null` for a blank document. */
  content?: ContentDocument | null;
  /** Called with the current document JSON on every change. */
  onChange?: (content: ContentDocument) => void;
  placeholder?: string;
  className?: string;
  /** Exposes the underlying Tiptap editor instance once created (e.g. for a "Save" button). */
  onReady?: (getJSON: () => ContentDocument) => void;
  autofocus?: boolean;
  /**
   * Called with the current document JSON when the toolbar's Save button is
   * clicked. The button is disabled until the document changes, so this only
   * ever fires on an actual edit — wire it to your persistence call.
   */
  onSave?: (content: ContentDocument) => void;
  /** Initial state of the toolbar's Active on/off switch. Defaults to `true`. */
  active?: boolean;
  /** Called with the new state whenever the toolbar's Active switch is toggled. */
  onActiveChange?: (active: boolean) => void;
  /**
   * The toolbar sticks to the top of its scroll container while editing
   * (`position: sticky; top`). If the host app has its own fixed/sticky
   * header above it, that header would otherwise cover the toolbar once the
   * page scrolls — set this to the header's height (a number is treated as
   * px, or pass any CSS length e.g. `"4rem"`) to push the sticky offset down
   * below it. Defaults to `0`.
   */
  toolbarOffset?: number | string;
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function ContentEditor({
  content,
  onChange,
  onUploadImage,
  onUploadVideo,
  placeholder,
  className,
  onReady,
  autofocus = false,
  onSave,
  active,
  onActiveChange,
  toolbarOffset = 0,
}: ContentEditorProps) {
  const upload: UploadCallbacks = { onUploadImage, onUploadVideo };
  const [dirty, setDirty] = useState(false);
  const [isActive, setIsActive] = useState(active ?? true);

  const editor = useEditor(
    {
      extensions: buildExtensions({ editable: true, upload, placeholder }),
      content: content ?? EMPTY_DOC,
      editable: true,
      autofocus,
      onUpdate: ({ editor: e }) => {
        setDirty(true);
        onChange?.(e.getJSON());
      },
      // Tiptap v3 defaults to *not* re-rendering on transactions (a
      // perf-oriented default change from v2) — without this, moving the
      // cursor/selection alone (no doc change) leaves every `editor.isActive(...)`
      // read in the toolbar stale until some unrelated state update happens to
      // force a re-render, so e.g. the Block type dropdown keeps showing "H2"
      // after clicking into plain paragraph text.
      shouldRerenderOnTransaction: true,
      editorProps: {
        attributes: { class: styles.editorSurface },
      },
    },
    []
  );

  useEffect(() => {
    if (editor && onReady) onReady(() => editor.getJSON());
  }, [editor, onReady]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    onSave?.(editor.getJSON());
    setDirty(false);
  }, [editor, onSave]);

  const handleToggleActive = useCallback(() => {
    // Side effects (calling onActiveChange) don't belong inside a setState
    // updater — React may invoke it more than once (e.g. StrictMode's
    // purity check), so compute `next` here and fire the callback directly
    // in this event handler instead.
    const next = !isActive;
    setIsActive(next);
    onActiveChange?.(next);
  }, [isActive, onActiveChange]);

  if (!editor) return null;

  return (
    <UploadCallbacksContext.Provider value={upload}>
      <div className={`${styles.root} ${className ?? ""}`}>
        <Toolbar
          editor={editor}
          dirty={dirty}
          onSave={handleSave}
          active={isActive}
          onToggleActive={handleToggleActive}
          offset={toolbarOffset}
        />
        <EditorContent editor={editor} />
      </div>
    </UploadCallbacksContext.Provider>
  );
}
