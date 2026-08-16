import type { JSONContent } from "@tiptap/core";

/** The persisted shape of one document: raw Tiptap/ProseMirror JSON. */
export type ContentDocument = JSONContent;

export interface ImageUploadResult {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface VideoUploadResult {
  url: string;
  poster?: string;
  /** Duration in seconds. */
  duration?: number;
}

/**
 * Injected, host-provided media upload capability. The component never talks
 * to a backend directly — it calls these and stores whatever they resolve to
 * into the relevant node's attrs.
 */
export interface UploadCallbacks {
  onUploadImage: (file: File) => Promise<ImageUploadResult>;
  onUploadVideo: (file: File) => Promise<VideoUploadResult>;
}
