import { useEffect } from "react";
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
}: ContentEditorProps) {
  const upload: UploadCallbacks = { onUploadImage, onUploadVideo };

  const editor = useEditor(
    {
      extensions: buildExtensions({ editable: true, upload, placeholder }),
      content: content ?? EMPTY_DOC,
      editable: true,
      autofocus,
      onUpdate: ({ editor: e }) => onChange?.(e.getJSON()),
      editorProps: {
        attributes: { class: styles.editorSurface },
      },
    },
    []
  );

  useEffect(() => {
    if (editor && onReady) onReady(() => editor.getJSON());
  }, [editor, onReady]);

  if (!editor) return null;

  return (
    <UploadCallbacksContext.Provider value={upload}>
      <div className={`${styles.root} ${className ?? ""}`}>
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </UploadCallbacksContext.Provider>
  );
}
