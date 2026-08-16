import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { useUploadCallbacks } from "../uploadContext";
import styles from "../styles/ImageBlock.module.css";

export interface ImageBlockAttrs {
  src: string;
  alt: string;
  caption: string;
  width: number | null; // px; null = fill container
  frameHeight: number; // px, fixed frame the image is cropped into
  zoom: number; // 1 = fit, >1 = zoomed in
  focalX: number; // 0..1
  focalY: number; // 0..1
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      insertImageBlock: (attrs: Partial<ImageBlockAttrs> & { src: string }) => ReturnType;
    };
  }
}

const DEFAULTS: Omit<ImageBlockAttrs, "src"> = {
  alt: "",
  caption: "",
  width: null,
  frameHeight: 360,
  zoom: 1,
  focalX: 0.5,
  focalY: 0.5,
};

export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: DEFAULTS.alt },
      caption: { default: DEFAULTS.caption },
      width: { default: DEFAULTS.width },
      frameHeight: { default: DEFAULTS.frameHeight },
      zoom: { default: DEFAULTS.zoom },
      focalX: { default: DEFAULTS.focalX },
      focalY: { default: DEFAULTS.focalY },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-block" })];
  },

  addCommands() {
    return {
      insertImageBlock:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { ...DEFAULTS, ...attrs } })
            .run(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function ImageBlockView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as ImageBlockAttrs;
  const readOnly = !editor.isEditable;
  const { onUploadImage } = useUploadCallbacks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; focalX: number; focalY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startWidth: number; containerWidth: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const handleReplace = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setUploading(true);
      try {
        const result = await onUploadImage(file);
        updateAttributes({
          src: result.url,
          alt: result.alt ?? attrs.alt,
          zoom: 1,
          focalX: 0.5,
          focalY: 0.5,
        });
      } finally {
        setUploading(false);
      }
    },
    [onUploadImage, updateAttributes, attrs.alt]
  );

  const onPanPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!adjusting) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      dragState.current = { startX: e.clientX, startY: e.clientY, focalX: attrs.focalX, focalY: attrs.focalY };
    },
    [adjusting, attrs.focalX, attrs.focalY]
  );

  const onPanPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current || !frameRef.current) return;
      const { width, height } = frameRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragState.current.startX) / width;
      const dy = (e.clientY - dragState.current.startY) / height;
      // Dragging the image right should reveal what's to the left, so subtract.
      const focalX = clamp(dragState.current.focalX - dx, 0, 1);
      const focalY = clamp(dragState.current.focalY - dy, 0, 1);
      updateAttributes({ focalX, focalY });
    },
    [updateAttributes]
  );

  const onPanPointerUp = useCallback((e: React.PointerEvent) => {
    dragState.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const container = frameRef.current?.parentElement;
      const containerWidth = container?.getBoundingClientRect().width ?? 640;
      (e.target as Element).setPointerCapture(e.pointerId);
      resizeState.current = {
        startX: e.clientX,
        startWidth: attrs.width ?? containerWidth,
        containerWidth,
      };
    },
    [attrs.width]
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeState.current) return;
      const dx = e.clientX - resizeState.current.startX;
      const next = clamp(resizeState.current.startWidth + dx, 120, resizeState.current.containerWidth);
      updateAttributes({ width: Math.round(next) });
    },
    [updateAttributes]
  );

  const onResizePointerUp = useCallback((e: React.PointerEvent) => {
    resizeState.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <NodeViewWrapper className={`${styles.wrapper} ${selected ? styles.selected : ""}`} style={{ width: attrs.width ?? "100%" }} data-drag-handle={readOnly ? undefined : ""}>
      <div
        ref={frameRef}
        className={styles.frame}
        style={{ height: attrs.frameHeight, cursor: adjusting ? "grab" : "default" }}
        onPointerDown={onPanPointerDown}
        onPointerMove={onPanPointerMove}
        onPointerUp={onPanPointerUp}
      >
        {attrs.src ? (
          <img
            src={attrs.src}
            alt={attrs.alt}
            className={styles.img}
            draggable={false}
            style={{
              transform: `scale(${attrs.zoom})`,
              objectPosition: `${attrs.focalX * 100}% ${attrs.focalY * 100}%`,
            }}
          />
        ) : (
          <div className={styles.placeholder}>{uploading ? "Uploading…" : "No image"}</div>
        )}

        {!readOnly && (
          <div className={styles.toolbar} contentEditable={false}>
            <button type="button" onClick={handleReplace} disabled={uploading}>
              Replace
            </button>
            <button
              type="button"
              className={adjusting ? styles.active : undefined}
              onClick={() => setAdjusting((v) => !v)}
            >
              {adjusting ? "Done" : "Adjust"}
            </button>
            <button type="button" onClick={() => deleteNode()} className={styles.danger}>
              Delete
            </button>
          </div>
        )}

        {!readOnly && adjusting && (
          <div className={styles.zoomControl} contentEditable={false}>
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={attrs.zoom}
              onChange={(e) => updateAttributes({ zoom: Number(e.target.value) })}
            />
          </div>
        )}

        {!readOnly && (
          <div
            className={styles.resizeHandle}
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            contentEditable={false}
          />
        )}
      </div>

      {readOnly ? (
        attrs.caption && <p className={styles.captionText}>{attrs.caption}</p>
      ) : (
        <input
          type="text"
          className={styles.caption}
          placeholder="Add a caption…"
          value={attrs.caption}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
        />
      )}

      {!readOnly && <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />}
    </NodeViewWrapper>
  );
}
