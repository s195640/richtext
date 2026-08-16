import { createContext, useContext } from "react";
import type { UploadCallbacks } from "./types";

/**
 * Makes the host's upload callbacks available to the toolbar and slash
 * menu, which trigger image uploads and insert the result via Tiptap's
 * generic image extension.
 */
export const UploadCallbacksContext = createContext<UploadCallbacks | null>(null);

export function useUploadCallbacks(): UploadCallbacks {
  const ctx = useContext(UploadCallbacksContext);
  if (!ctx) {
    throw new Error(
      "content-editor: upload callbacks not found. This node view must render inside <ContentEditor>."
    );
  }
  return ctx;
}
