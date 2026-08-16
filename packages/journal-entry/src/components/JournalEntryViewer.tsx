import { useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { buildExtensions } from "../extensions";
import { UploadCallbacksContext } from "../uploadContext";
import { sanitizeJournalEntryContent } from "../sanitize";
import type { JournalEntryContent, UploadCallbacks } from "../types";
import styles from "../styles/JournalEntry.module.css";

export interface JournalEntryViewerProps {
  content: JournalEntryContent;
  className?: string;
}

const NOOP_UPLOAD: UploadCallbacks = {
  onUploadImage: () => Promise.reject(new Error("journal-entry: uploads are disabled in the read-only viewer.")),
  onUploadVideo: () => Promise.reject(new Error("journal-entry: uploads are disabled in the read-only viewer.")),
};

/**
 * Read-only render of a journal entry from persisted Tiptap JSON. Uses the
 * same node schema/NodeViews as the editor (each NodeView checks
 * `editor.isEditable` to drop its editing chrome) so this is a true WYSIWYG
 * match for what the admin authored, not a separate preview layout.
 */
export function JournalEntryViewer({ content, className }: JournalEntryViewerProps) {
  const safeContent = useMemo(() => sanitizeJournalEntryContent(content), [content]);

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
