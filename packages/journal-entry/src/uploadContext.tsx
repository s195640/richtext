import { createContext, useContext } from "react";
import type { UploadCallbacks } from "./types";

/**
 * Makes the host's upload callbacks available to every custom NodeView
 * (image/gallery/video), which render inside the same React tree as
 * <EditorContent/> via @tiptap/react's ReactNodeViewRenderer.
 */
export const UploadCallbacksContext = createContext<UploadCallbacks | null>(null);

export function useUploadCallbacks(): UploadCallbacks {
  const ctx = useContext(UploadCallbacksContext);
  if (!ctx) {
    throw new Error(
      "journal-entry: upload callbacks not found. This node view must render inside <JournalEntryEditor>."
    );
  }
  return ctx;
}
