import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import FileHandler from "@tiptap/extension-file-handler";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import type { Extensions } from "@tiptap/core";
import { Image } from "./Image";
import { Video } from "./Video";
import { SlashCommand } from "./SlashCommand";
import { EmojiPicker } from "./EmojiSuggestion";
import type { UploadCallbacks } from "../types";

export { Image, Video, SlashCommand };
export type { ImageAttrs, ImageAlign, ImageCrop } from "./Image";
export type { VideoAttrs, VideoAlign } from "./Video";

export interface BuildExtensionsOptions {
  editable: boolean;
  upload?: UploadCallbacks | null;
  placeholder?: string;
}

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];

/** Shared node/mark schema used by both the editor and the read-only viewer. */
export function buildExtensions({ editable, upload = null, placeholder }: BuildExtensionsOptions): Extensions {
  const extensions: Extensions = [
    // Link and Underline are bundled in StarterKit as of Tiptap v3 — configure
    // them here rather than adding @tiptap/extension-link/-underline
    // separately, which would register duplicate extension names.
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: !editable,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
    }),
    // color, backgroundColor, fontFamily, fontSize (+ lineHeight, unused —
    // no UI for it yet, left on rather than adding a config surface no one
    // needs) all live on the shared "textStyle" mark.
    TextStyleKit,
    TextAlign.configure({ types: ["paragraph", "heading"] }),
    Image,
    Video,
  ];

  if (editable) {
    extensions.push(
      Placeholder.configure({
        placeholder: placeholder ?? "Write the entry… type “/” to insert an image or video, or “:” for an emoji.",
      }),
      SlashCommand.configure({ upload }),
      EmojiPicker
    );

    // Drag-drop and paste of image/video files, in addition to the
    // toolbar/slash menu's file picker — same upload seam
    // (`upload.onUploadImage`/`onUploadVideo`) either way.
    if (upload) {
      extensions.push(
        FileHandler.configure({
          allowedMimeTypes: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
          onDrop: (editor, files, pos) => {
            files.forEach((file) => {
              if (file.type.startsWith("video/")) {
                upload.onUploadVideo(file).then((result) => {
                  editor
                    .chain()
                    .insertContentAt(pos, {
                      type: "video",
                      attrs: { src: result.url, poster: result.poster ?? null, duration: result.duration ?? null },
                    })
                    .focus()
                    .run();
                });
              } else {
                upload.onUploadImage(file).then((result) => {
                  editor
                    .chain()
                    .insertContentAt(pos, {
                      type: "image",
                      attrs: { src: result.url, originalSrc: result.url, alt: result.alt ?? "" },
                    })
                    .focus()
                    .run();
                });
              }
            });
          },
          onPaste: (editor, files) => {
            files.forEach((file) => {
              if (file.type.startsWith("video/")) {
                upload.onUploadVideo(file).then((result) => {
                  editor
                    .chain()
                    .focus()
                    .setVideo({ src: result.url, poster: result.poster ?? null, duration: result.duration ?? null })
                    .run();
                });
              } else {
                upload.onUploadImage(file).then((result) => {
                  editor.chain().focus().setImage({ src: result.url, alt: result.alt ?? "" }).run();
                });
              }
            });
          },
        })
      );
    }
  }

  return extensions;
}
