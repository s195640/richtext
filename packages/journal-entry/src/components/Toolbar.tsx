import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useUploadCallbacks } from "../uploadContext";
import styles from "../styles/Toolbar.module.css";

export interface ToolbarProps {
  editor: Editor;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${active ? styles.active : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const { onUploadImage, onUploadVideo } = useUploadCallbacks();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"image" | "video" | null>(null);

  const insertImage = useCallback(() => imageInputRef.current?.click(), []);
  const insertVideo = useCallback(() => videoInputRef.current?.click(), []);
  const insertGallery = useCallback(() => {
    editor.chain().focus().insertGalleryBlock({ items: [] }).run();
  }, [editor]);

  const onImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setBusy("image");
      try {
        const result = await onUploadImage(file);
        editor.chain().focus().insertImageBlock({ src: result.url, alt: result.alt ?? "" }).run();
      } finally {
        setBusy(null);
      }
    },
    [editor, onUploadImage]
  );

  const onVideoFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setBusy("video");
      try {
        const result = await onUploadVideo(file);
        editor
          .chain()
          .focus()
          .insertVideoBlock({ src: result.url, poster: result.poster ?? "", duration: result.duration ?? null })
          .run();
      } finally {
        setBusy(null);
      }
    },
    [editor, onUploadVideo]
  );

  if (!editor) return null;

  return (
    <div className={styles.toolbar}>
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>i</em>
      </ToolbarButton>
      <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Link URL", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        }}
      >
        🔗
      </ToolbarButton>

      <span className={styles.divider} />

      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •—
      </ToolbarButton>
      <ToolbarButton
        label="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolbarButton>
      <ToolbarButton label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        ―
      </ToolbarButton>

      <span className={styles.divider} />

      <ToolbarButton label="Insert image" disabled={busy === "image"} onClick={insertImage}>
        🖼
      </ToolbarButton>
      <ToolbarButton label="Insert gallery" onClick={insertGallery}>
        🗂
      </ToolbarButton>
      <ToolbarButton label="Insert video" disabled={busy === "video"} onClick={insertVideo}>
        🎬
      </ToolbarButton>

      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={onImageFile} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={onVideoFile} />
    </div>
  );
}
