import TiptapImage from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useUploadCallbacks } from "../uploadContext";
import { cropImageToBlob, type PixelCrop } from "./cropImage";
import styles from "../styles/ImageNode.module.css";

export type ImageAlign = "left" | "center" | "right" | "none";

export interface ImageCrop {
  x: number;
  y: number;
  zoom: number;
}

export interface ImageAttrs {
  src: string;
  originalSrc: string | null;
  alt: string;
  title: string | null;
  width: number | null;
  height: number | null;
  align: ImageAlign;
  crop: ImageCrop | null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Extends Tiptap's stock image node (kept as the `image` node name, so it
 * stays schema-compatible with plain @tiptap/extension-image content) with
 * the attrs needed for resize, text-wrap alignment, drag-reposition, and
 * in-place crop/zoom: width/height, `align`, and `originalSrc`/`crop` (the
 * uncropped source + last crop state, so re-cropping is never lossy).
 */
export const Image = TiptapImage.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      originalSrc: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-original-src"),
        renderHTML: (attrs) => (attrs.originalSrc ? { "data-original-src": attrs.originalSrc } : {}),
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
      align: {
        default: "none",
        parseHTML: (el) => el.getAttribute("data-align") || "none",
        renderHTML: (attrs) => ({ "data-align": attrs.align ?? "none" }),
      },
      crop: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                src: options.src,
                originalSrc: options.src,
                alt: options.alt ?? "",
                title: options.title ?? null,
                width: null,
                height: null,
                align: "none",
                crop: null,
              },
            })
            .run(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

const ALIGN_OPTIONS: { value: ImageAlign; label: string; icon: string }[] = [
  { value: "none", label: "No wrap", icon: "▭" },
  { value: "left", label: "Float left, wrap text", icon: "◧" },
  { value: "center", label: "Center", icon: "▣" },
  { value: "right", label: "Float right, wrap text", icon: "◨" },
];

function ImageView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as ImageAttrs;
  const readOnly = !editor.isEditable;
  const { onUploadImage } = useUploadCallbacks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const naturalRatio = useRef<number | null>(null);
  const resizeState = useRef<{ startX: number; startWidth: number; containerWidth: number } | null>(null);

  const [replacing, setReplacing] = useState(false);
  const [editingCrop, setEditingCrop] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: attrs.crop?.x ?? 0, y: attrs.crop?.y ?? 0 });
  const [zoom, setZoom] = useState(attrs.crop?.zoom ?? 1);
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);

  const originalSrc = attrs.originalSrc || attrs.src;

  const onImageLoad = useCallback(() => {
    const el = imgRef.current;
    if (el && el.naturalWidth && el.naturalHeight) {
      naturalRatio.current = el.naturalWidth / el.naturalHeight;
    }
  }, []);

  const handleReplace = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setReplacing(true);
      try {
        const result = await onUploadImage(file);
        updateAttributes({
          src: result.url,
          originalSrc: result.url,
          alt: result.alt ?? attrs.alt,
          crop: null,
        });
      } finally {
        setReplacing(false);
      }
    },
    [onUploadImage, updateAttributes, attrs.alt]
  );

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const container = imgRef.current?.closest(`.${styles.wrapper}`)?.parentElement;
      const containerWidth = container?.getBoundingClientRect().width ?? 640;
      const startWidth = attrs.width ?? imgRef.current?.getBoundingClientRect().width ?? containerWidth;
      (e.target as Element).setPointerCapture(e.pointerId);
      resizeState.current = { startX: e.clientX, startWidth, containerWidth };
    },
    [attrs.width]
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeState.current) return;
      const dx = e.clientX - resizeState.current.startX;
      const nextWidth = clamp(resizeState.current.startWidth + dx, 80, resizeState.current.containerWidth);
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

  const openCropEditor = useCallback(() => {
    setCrop({ x: attrs.crop?.x ?? 0, y: attrs.crop?.y ?? 0 });
    setZoom(attrs.crop?.zoom ?? 1);
    setPixelCrop(null);
    setEditingCrop(true);
  }, [attrs.crop]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setPixelCrop(areaPixels);
  }, []);

  const applyCrop = useCallback(async () => {
    if (!pixelCrop) return;
    setCropping(true);
    try {
      const region: PixelCrop = {
        x: Math.round(pixelCrop.x),
        y: Math.round(pixelCrop.y),
        width: Math.round(pixelCrop.width),
        height: Math.round(pixelCrop.height),
      };
      const blob = await cropImageToBlob(originalSrc, region);
      const file = new File([blob], "cropped-image.jpg", { type: blob.type });
      const result = await onUploadImage(file);
      updateAttributes({
        src: result.url,
        alt: result.alt ?? attrs.alt,
        width: null,
        height: null,
        crop: { x: crop.x, y: crop.y, zoom },
      });
      setEditingCrop(false);
    } finally {
      setCropping(false);
    }
  }, [pixelCrop, originalSrc, onUploadImage, updateAttributes, attrs.alt, crop, zoom]);

  const cancelCrop = useCallback(() => setEditingCrop(false), []);

  // Bail out of an in-progress crop if the node loses selection (e.g. the
  // admin clicks elsewhere in the document without applying/cancelling).
  useEffect(() => {
    if (!selected && editingCrop) setEditingCrop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <NodeViewWrapper
      className={`${styles.wrapper} ${selected ? styles.selected : ""}`}
      data-align={attrs.align ?? "none"}
      style={{ width: attrs.width ?? undefined }}
    >
      {editingCrop ? (
        <div contentEditable={false}>
          <div className={styles.cropEditor}>
            <Cropper
              image={originalSrc}
              crop={crop}
              zoom={zoom}
              aspect={attrs.width && attrs.height ? attrs.width / attrs.height : 4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className={styles.cropControls}>
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <div className={styles.cropActions}>
              <button type="button" onClick={cancelCrop} disabled={cropping}>
                Cancel
              </button>
              <button type="button" className={styles.primary} onClick={applyCrop} disabled={cropping || !pixelCrop}>
                {cropping ? "Applying…" : "Apply crop"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.frame}>
          {attrs.src ? (
            <img
              ref={imgRef}
              src={attrs.src}
              alt={attrs.alt}
              className={styles.img}
              draggable={false}
              onLoad={onImageLoad}
            />
          ) : (
            <div className={styles.placeholder}>{replacing ? "Uploading…" : "No image"}</div>
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
                <button type="button" title="Edit (crop / zoom)" onClick={openCropEditor}>
                  ✂
                </button>
                <button type="button" title="Replace image" onClick={handleReplace} disabled={replacing}>
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
      )}

      {!readOnly && <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />}
    </NodeViewWrapper>
  );
}
