import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useUploadCallbacks } from "../uploadContext";
import { loadEmojiData, searchEmojis, type EmojiItem } from "../extensions/emojiData";
import {
  ClearFormattingButton,
  FontFamilyDropdown,
  FontSizeDropdown,
  TextColorDropdown,
  BackgroundColorDropdown,
} from "./TextStyleControls";
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

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** Paragraph + Heading 1-6 as one dropdown, instead of a button per level. */
function HeadingDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeLevel = HEADING_LEVELS.find((level) => editor.isActive("heading", { level }));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const setParagraph = () => {
    editor.chain().focus().setParagraph().run();
    setOpen(false);
  };

  const setLevel = (level: (typeof HEADING_LEVELS)[number]) => {
    editor.chain().focus().toggleHeading({ level }).run();
    setOpen(false);
  };

  return (
    <div className={styles.headingRoot} ref={rootRef}>
      <button
        type="button"
        className={`${styles.btn} ${styles.headingTrigger} ${activeLevel ? styles.active : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Paragraph style"
        aria-label="Paragraph style"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        H<span className={styles.headingCaret}>▾</span>
      </button>

      {open && (
        <div className={styles.headingMenu} role="listbox">
          <button
            type="button"
            className={`${styles.headingMenuItem} ${!activeLevel ? styles.headingMenuItemActive : ""}`}
            onClick={setParagraph}
          >
            Paragraph
          </button>
          {HEADING_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`${styles.headingMenuItem} ${activeLevel === level ? styles.headingMenuItemActive : ""}`}
              data-level={level}
              onClick={() => setLevel(level)}
            >
              Heading {level}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TEXT_ALIGNS = [
  { value: "left", label: "Align left" },
  { value: "center", label: "Align center" },
  { value: "right", label: "Align right" },
  { value: "justify", label: "Justify" },
] as const;

/** Three bars drawn in CSS (`data-align` picks the per-bar widths/position
 * in Toolbar.module.css) rather than an emoji stand-in — there's no emoji
 * that reads clearly as "justify" vs "center" at a glance. */
function AlignIcon({ align }: { align: string }) {
  return (
    <span className={styles.alignIcon} data-align={align}>
      <i />
      <i />
      <i />
    </span>
  );
}

function TextAlignDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = TEXT_ALIGNS.find((a) => editor.isActive({ textAlign: a.value }))?.value ?? "left";

  const pick = (value: (typeof TEXT_ALIGNS)[number]["value"]) => {
    editor.chain().focus().setTextAlign(value).run();
    setOpen(false);
  };

  return (
    <div className={styles.headingRoot} ref={rootRef}>
      <button
        type="button"
        className={`${styles.btn} ${styles.alignTrigger}`}
        onClick={() => setOpen((v) => !v)}
        title="Text align"
        aria-label="Text align"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <AlignIcon align={active} />
        <span className={styles.headingCaret}>▾</span>
      </button>

      {open && (
        <div className={styles.headingMenu} role="listbox">
          {TEXT_ALIGNS.map((a) => (
            <button
              key={a.value}
              type="button"
              className={`${styles.headingMenuItem} ${styles.alignMenuItem} ${active === a.value ? styles.headingMenuItemActive : ""}`}
              onClick={() => pick(a.value)}
            >
              <AlignIcon align={a.value} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EMOJI_GRID_MAX = 200;

/** Browse-and-click alternative to the ":" typeahead — same underlying
 * lazily-loaded data (see `extensions/emojiData.ts`), fetched on first open
 * rather than on toolbar mount, so it's still never paid for unless someone
 * actually opens the picker. */
function EmojiPickerDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allEmojis, setAllEmojis] = useState<EmojiItem[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    if (allEmojis) return;
    let cancelled = false;
    loadEmojiData().then((data) => {
      if (!cancelled) setAllEmojis(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, allEmojis]);

  const insert = (item: EmojiItem) => {
    editor.chain().focus().insertContent(item.emoji ?? `:${item.name}:`).run();
    setOpen(false);
    setQuery("");
  };

  const results = allEmojis ? searchEmojis(allEmojis, query, EMOJI_GRID_MAX) : [];

  return (
    <div className={styles.emojiRoot} ref={rootRef}>
      <button
        type="button"
        className={`${styles.btn} ${open ? styles.active : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Insert emoji"
        aria-label="Insert emoji"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        🙂
      </button>

      {open && (
        <div className={styles.emojiMenu}>
          <input
            ref={searchRef}
            type="text"
            className={styles.emojiSearch}
            placeholder="Search emoji…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={styles.emojiGrid} role="listbox">
            {!allEmojis && <div className={styles.emojiEmpty}>Loading…</div>}
            {allEmojis && results.length === 0 && <div className={styles.emojiEmpty}>No matches</div>}
            {results.map((item) => (
              <button
                key={item.name}
                type="button"
                className={styles.emojiCell}
                title={`:${item.shortcodes[0]}:`}
                onClick={() => insert(item)}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const { onUploadImage, onUploadVideo } = useUploadCallbacks();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"image" | "video" | null>(null);

  const insertImage = useCallback(() => imageInputRef.current?.click(), []);
  const insertVideo = useCallback(() => videoInputRef.current?.click(), []);

  const onImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setBusy("image");
      try {
        const result = await onUploadImage(file);
        editor.chain().focus().setImage({ src: result.url, alt: result.alt ?? "" }).run();
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
          .setVideo({ src: result.url, poster: result.poster ?? null, duration: result.duration ?? null })
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

      <ClearFormattingButton editor={editor} />
      <FontFamilyDropdown editor={editor} />
      <FontSizeDropdown editor={editor} />
      <TextColorDropdown editor={editor} />
      <BackgroundColorDropdown editor={editor} />

      <span className={styles.divider} />

      <HeadingDropdown editor={editor} />
      <TextAlignDropdown editor={editor} />
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
      <ToolbarButton label="Insert video" disabled={busy === "video"} onClick={insertVideo}>
        🎬
      </ToolbarButton>
      <EmojiPickerDropdown editor={editor} />

      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={onImageFile} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={onVideoFile} />
    </div>
  );
}
