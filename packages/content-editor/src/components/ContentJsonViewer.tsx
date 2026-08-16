import { useCallback, useState } from "react";
import type { ContentDocument } from "../types";
import styles from "../styles/ContentJsonViewer.module.css";

export interface ContentJsonViewerProps {
  content: ContentDocument;
  className?: string;
  /** @default 2 */
  indent?: number;
}

/**
 * Read-only, pretty-printed dump of a document's raw Tiptap/ProseMirror
 * JSON — for debugging/inspection (an "inspect element" for the content),
 * not for editing. Renders whatever JSON it's given as-is; unlike
 * `ContentViewer`, it doesn't sanitize, since it never turns the JSON into
 * live DOM (marks/attrs stay inert text on the page).
 */
export function ContentJsonViewer({ content, className, indent = 2 }: ContentJsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(content, null, indent);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context, permission denied) — no-op */
    }
  }, [json]);

  return (
    <div className={`${styles.root} ${className ?? ""}`}>
      <button type="button" className={styles.copyBtn} onClick={handleCopy}>
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className={styles.json}>{json}</pre>
    </div>
  );
}
