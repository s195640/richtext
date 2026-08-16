import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import styles from "../styles/Toolbar.module.css";

function useCloseOnOutsideOrEscape(open: boolean, rootRef: React.RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, rootRef, close]);
}

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Sans-serif", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "ui-serif, Georgia, serif" },
  { label: "Monospace", value: "ui-monospace, Menlo, monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

export function FontFamilyDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(open, rootRef, () => setOpen(false));

  const active = (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? null;
  const activeLabel = FONT_FAMILIES.find((f) => f.value === active)?.label ?? "Font";

  const pick = (value: string) => {
    editor.chain().focus().setFontFamily(value).run();
    setOpen(false);
  };

  return (
    <div className={styles.headingRoot} ref={rootRef}>
      <button
        type="button"
        className={`${styles.btn} ${styles.fontFamilyTrigger} ${active ? styles.active : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Font family"
        aria-label="Font family"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.fontTriggerLabel}>{activeLabel}</span>
        <span className={styles.headingCaret}>▾</span>
      </button>

      {open && (
        <div className={styles.headingMenu} role="listbox">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.label}
              type="button"
              className={`${styles.headingMenuItem} ${active === f.value ? styles.headingMenuItemActive : ""}`}
              style={{ fontFamily: f.value }}
              onClick={() => pick(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FONT_SIZES: { label: string; value: string }[] = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "40px", value: "40px" },
];

export function FontSizeDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(open, rootRef, () => setOpen(false));

  const active = (editor.getAttributes("textStyle").fontSize as string | undefined) ?? null;
  const activeLabel = FONT_SIZES.find((s) => s.value === active)?.label ?? "Size";

  const pick = (value: string) => {
    editor.chain().focus().setFontSize(value).run();
    setOpen(false);
  };

  return (
    <div className={styles.headingRoot} ref={rootRef}>
      <button
        type="button"
        className={`${styles.btn} ${styles.fontSizeTrigger} ${active ? styles.active : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Font size"
        aria-label="Font size"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.fontTriggerLabel}>{activeLabel}</span>
        <span className={styles.headingCaret}>▾</span>
      </button>

      {open && (
        <div className={styles.headingMenu} role="listbox">
          {FONT_SIZES.map((s) => (
            <button
              key={s.label}
              type="button"
              className={`${styles.headingMenuItem} ${active === s.value ? styles.headingMenuItemActive : ""}`}
              style={{ fontSize: `min(${s.value}, 1.3rem)` }}
              onClick={() => pick(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Resets font family, font size, text color, background color, bold,
 * italic, and strikethrough. Deliberately narrower than "everything" —
 * leaves underline, code, links, and block formatting (headings, lists,
 * blockquote, alignment) alone, since those weren't asked for. */
export function ClearFormattingButton({ editor }: { editor: Editor }) {
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={() =>
        editor
          .chain()
          .focus()
          .unsetFontFamily()
          .unsetFontSize()
          .unsetColor()
          .unsetBackgroundColor()
          .unsetBold()
          .unsetItalic()
          .unsetStrike()
          .run()
      }
      title="Clear formatting"
      aria-label="Clear formatting"
    >
      🧹
    </button>
  );
}

const COLOR_SWATCHES = [
  "#1a1a1e",
  "#5c5c66",
  "#a3a3ad",
  "#c0392b",
  "#d9822b",
  "#c9a227",
  "#2f9e64",
  "#1f8a70",
  "#2f7bd9",
  "#4f5fd9",
  "#8a4fd9",
  "#c04fa0",
];

interface ColorDropdownProps {
  label: string;
  activeColor: string | null;
  onPick: (color: string) => void;
  onClear: () => void;
  renderTrigger: (color: string | null) => React.ReactNode;
}

function ColorDropdown({ label, activeColor, onPick, onClear, renderTrigger }: ColorDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideOrEscape(open, rootRef, () => setOpen(false));

  return (
    <div className={styles.headingRoot} ref={rootRef}>
      <button
        type="button"
        className={`${styles.btn} ${open ? styles.active : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {renderTrigger(activeColor)}
      </button>

      {open && (
        <div className={styles.colorMenu}>
          <div className={styles.colorSwatchGrid}>
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.colorSwatch} ${activeColor === c ? styles.colorSwatchActive : ""}`}
                style={{ background: c }}
                title={c}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <div className={styles.colorCustomRow}>
            <label className={styles.colorCustomLabel} title="Custom color">
              <input
                type="color"
                className={styles.colorCustomInput}
                value={activeColor && /^#[0-9a-fA-F]{6}$/.test(activeColor) ? activeColor : "#000000"}
                onChange={(e) => onPick(e.target.value)}
              />
              Custom…
            </label>
            <button type="button" className={styles.colorClearBtn} onClick={() => { onClear(); setOpen(false); }}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TextColorDropdown({ editor }: { editor: Editor }) {
  const active = (editor.getAttributes("textStyle").color as string | undefined) ?? null;
  return (
    <ColorDropdown
      label="Text color"
      activeColor={active}
      onPick={(c) => editor.chain().focus().setColor(c).run()}
      onClear={() => editor.chain().focus().unsetColor().run()}
      renderTrigger={(c) => (
        <span className={styles.textColorGlyph} style={{ borderBottomColor: c ?? "currentColor" }}>
          A
        </span>
      )}
    />
  );
}

export function BackgroundColorDropdown({ editor }: { editor: Editor }) {
  const active = (editor.getAttributes("textStyle").backgroundColor as string | undefined) ?? null;
  return (
    <ColorDropdown
      label="Background color"
      activeColor={active}
      onPick={(c) => editor.chain().focus().setBackgroundColor(c).run()}
      onClear={() => editor.chain().focus().unsetBackgroundColor().run()}
      renderTrigger={(c) => (
        <span className={styles.bgColorGlyph} style={{ background: c ?? "transparent" }}>
          A
        </span>
      )}
    />
  );
}
