import { useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { buildExtensions } from "../extensions";
import { UploadCallbacksContext } from "../uploadContext";
import { sanitizeContent } from "../sanitize";
import type { ContentDocument, UploadCallbacks } from "../types";
import styles from "../styles/ContentEditor.module.css";

export interface ContentViewerProps {
  content: ContentDocument;
  className?: string;
}

const NOOP_UPLOAD: UploadCallbacks = {
  onUploadImage: () => Promise.reject(new Error("content-editor: uploads are disabled in the read-only viewer.")),
  onUploadVideo: () => Promise.reject(new Error("content-editor: uploads are disabled in the read-only viewer.")),
};

/**
 * Read-only render of a document from persisted Tiptap JSON. Uses the
 * same node schema as the editor so this is a true WYSIWYG match for what
 * the admin authored, not a separate preview layout.
 */
export function ContentViewer({ content, className }: ContentViewerProps) {
  const safeContent = useMemo(() => sanitizeContent(content), [content]);

  const editor = useEditor(
    {
      extensions: buildExtensions({ editable: false }),
      content: safeContent,
      editable: false,
      editorProps: {
        attributes: { class: styles.editorSurface },
      },
    },
    [safeContent]
  );

  if (!editor) return null;

  return (
    <UploadCallbacksContext.Provider value={NOOP_UPLOAD}>
      <div className={`${styles.root} ${styles.readOnly} ${className ?? ""}`}>
        <EditorContent editor={editor} />
      </div>
    </UploadCallbacksContext.Provider>
  );
}
