import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { useUploadCallbacks } from "../uploadContext";
import styles from "../styles/VideoNode.module.css";

export type VideoAlign = "left" | "center" | "right" | "none";

export interface VideoAttrs {
  src: string;
  poster: string | null;
  duration: number | null;
  align: VideoAlign;
  width: number | null;
  height: number | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (attrs: { src: string; poster?: string | null; duration?: number | null }) => ReturnType;
    };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Custom node — there's no official/generic Tiptap video extension the way
 * there is for images. Deliberately mirrors `./Image.tsx`'s approach to
 * `align` (float-based text wrap), drag-reposition (grip marked
 * `data-drag-handle`), and now resize (drag the bottom-right corner,
 * aspect-ratio preserved via the loaded video's own `videoWidth`/
 * `videoHeight`, same as Image does with `naturalWidth`/`naturalHeight`).
 * Still skips crop — that doesn't map onto a video stream the same way, and
 * wasn't asked for.
 */
export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
      duration: { default: null },
      align: {
        default: "none",
        parseHTML: (el) => el.getAttribute("data-align") || "none",
        renderHTML: (attrs) => ({ "data-align": attrs.align ?? "none" }),
      },
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.style.width || el.getAttribute("width");
          return w ? parseInt(w, 10) || null : null;
        },
        renderHTML: (attrs) => (attrs.width ? { style: `width: ${attrs.width}px` } : {}),
      },
      height: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video" })];
  },

  addCommands() {
    return {
      setVideo:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                src: attrs.src,
                poster: attrs.poster ?? null,
                duration: attrs.duration ?? null,
                align: "none",
                width: null,
                height: null,
              },
            })
            .run(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});

const ALIGN_OPTIONS: { value: VideoAlign; label: string; icon: string }[] = [
  { value: "none", label: "No wrap", icon: "▭" },
  { value: "left", label: "Float left, wrap text", icon: "◧" },
  { value: "center", label: "Center", icon: "▣" },
  { value: "right", label: "Float right, wrap text", icon: "◨" },
];

function formatDuration(seconds: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as VideoAttrs;
  const readOnly = !editor.isEditable;
  const { onUploadVideo } = useUploadCallbacks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const naturalRatio = useRef<number | null>(null);
  const resizeState = useRef<{ startX: number; startWidth: number; containerWidth: number } | null>(null);
  const [replacing, setReplacing] = useState(false);

  const handleReplace = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setReplacing(true);
      try {
        const result = await onUploadVideo(file);
        updateAttributes({ src: result.url, poster: result.poster ?? null, duration: result.duration ?? null });
      } finally {
        setReplacing(false);
      }
    },
    [onUploadVideo, updateAttributes]
  );

  const onLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (el && el.videoWidth && el.videoHeight) {
      naturalRatio.current = el.videoWidth / el.videoHeight;
    }
  }, []);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const container = videoRef.current?.closest(`.${styles.wrapper}`)?.parentElement;
      const containerWidth = container?.getBoundingClientRect().width ?? 640;
      const startWidth = attrs.width ?? videoRef.current?.getBoundingClientRect().width ?? containerWidth;
      (e.target as Element).setPointerCapture(e.pointerId);
      resizeState.current = { startX: e.clientX, startWidth, containerWidth };
    },
    [attrs.width]
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeState.current) return;
      const dx = e.clientX - resizeState.current.startX;
      const nextWidth = clamp(resizeState.current.startWidth + dx, 160, resizeState.current.containerWidth);
      const ratio = naturalRatio.current;
      updateAttributes({
        width: Math.round(nextWidth),
        height: ratio ? Math.round(nextWidth / ratio) : null,
      });
    },
    [updateAttributes]
  );

  const onResizePointerUp = useCallback((e: React.PointerEvent) => {
    resizeState.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  const durationLabel = formatDuration(attrs.duration);

  return (
    <NodeViewWrapper
      className={`${styles.wrapper} ${selected ? styles.selected : ""}`}
      data-align={attrs.align ?? "none"}
      style={{ width: attrs.width ?? undefined }}
    >
      <div className={styles.frame}>
        {attrs.src ? (
          <video
            ref={videoRef}
            src={attrs.src}
            poster={attrs.poster ?? undefined}
            controls
            className={styles.video}
            onLoadedMetadata={onLoadedMetadata}
          />
        ) : (
          <div className={styles.placeholder}>{replacing ? "Uploading…" : "No video"}</div>
        )}

        {durationLabel && (
          <span className={styles.duration} contentEditable={false}>
            {durationLabel}
          </span>
        )}

        {!readOnly && (
          <>
            <div className={styles.grip} data-drag-handle="" title="Drag to reposition">
              ⠿
            </div>

            <div className={styles.toolbar} contentEditable={false}>
              {ALIGN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  className={attrs.align === opt.value ? styles.active : undefined}
                  onClick={() => updateAttributes({ align: opt.value })}
                >
                  {opt.icon}
                </button>
              ))}
              <button type="button" title="Replace video" onClick={handleReplace} disabled={replacing}>
                ⟳
              </button>
              <button type="button" title="Delete" className={styles.danger} onClick={() => deleteNode()}>
                ✕
              </button>
            </div>

            <div
              className={styles.resizeHandle}
              onPointerDown={onResizePointerDown}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              contentEditable={false}
            />
          </>
        )}
      </div>

      {!readOnly && <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={handleFileChange} />}
    </NodeViewWrapper>
  );
}
