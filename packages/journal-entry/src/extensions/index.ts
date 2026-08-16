import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import type { Extensions } from "@tiptap/core";
import { ImageBlock } from "./ImageBlock";
import { GalleryBlock } from "./GalleryBlock";
import { VideoBlock } from "./VideoBlock";
import { SlashCommand } from "./SlashCommand";
import type { UploadCallbacks } from "../types";

export { ImageBlock, GalleryBlock, VideoBlock, SlashCommand };
export type { ImageBlockAttrs } from "./ImageBlock";
export type { GalleryBlockAttrs, GalleryImage } from "./GalleryBlock";
export type { VideoBlockAttrs } from "./VideoBlock";

export interface BuildExtensionsOptions {
  editable: boolean;
  upload?: UploadCallbacks | null;
  placeholder?: string;
}

/** Shared node/mark schema used by both the editor and the read-only viewer. */
export function buildExtensions({ editable, upload = null, placeholder }: BuildExtensionsOptions): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
    }),
    Link.configure({
      openOnClick: !editable,
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    }),
    Underline,
    ImageBlock,
    GalleryBlock,
    VideoBlock,
  ];

  if (editable) {
    extensions.push(
      Placeholder.configure({
        placeholder: placeholder ?? "Write the entry… type “/” to insert an image, gallery, or video.",
      }),
      SlashCommand.configure({ upload })
    );
  }

  return extensions;
}
