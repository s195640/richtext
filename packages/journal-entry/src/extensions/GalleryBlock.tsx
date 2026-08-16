import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { useUploadCallbacks } from "../uploadContext";
import styles from "../styles/GalleryBlock.module.css";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

export interface GalleryBlockAttrs {
  items: GalleryImage[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    galleryBlock: {
      insertGalleryBlock: (attrs?: Partial<GalleryBlockAttrs>) => ReturnType;
    };
  }
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export const GalleryBlock = Node.create({
  name: "galleryBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      items: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="gallery-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "gallery-block" })];
  },

  addCommands() {
    return {
      insertGalleryBlock:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { items: [], ...attrs } })
            .run(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryBlockView);
  },
});

function GalleryBlockView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as GalleryBlockAttrs;
  const items = attrs.items ?? [];
  const readOnly = !editor.isEditable;
  const { onUploadImage } = useUploadCallbacks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const setItems = useCallback(
    (next: GalleryImage[]) => updateAttributes({ items: next }),
    [updateAttributes]
  );

  const handleAddFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (!files.length) return;
      setUploading(true);
      try {
        const uploaded = await Promise.all(
          files.map(async (file) => {
            const result = await onUploadImage(file);
            const img: GalleryImage = { id: makeId(), src: result.url, alt: result.alt ?? "", caption: "" };
            return img;
          })
        );
        setItems([...items, ...uploaded]);
      } finally {
        setUploading(false);
      }
    },
    [items, onUploadImage, setItems]
  );

  const removeItem = useCallback(
    (id: string) => setItems(items.filter((i) => i.id !== id)),
    [items, setItems]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<GalleryImage>) =>
      setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [items, setItems]
  );

  const onDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === index) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    setItems(next);
  };

  return (
    <NodeViewWrapper className={`${styles.wrapper} ${selected ? styles.selected : ""}`} data-drag-handle={readOnly ? undefined : ""}>
      {!readOnly && (
        <div className={styles.header} contentEditable={false}>
          <span className={styles.label}>Gallery ({items.length})</span>
          <div className={styles.headerActions}>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Add images"}
            </button>
            <button type="button" className={styles.danger} onClick={() => deleteNode()}>
              Delete gallery
            </button>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.cell} ${overIndex === index ? styles.dropTarget : ""}`}
            draggable={!readOnly}
            onDragStart={onDragStart(index)}
            onDragOver={onDragOver(index)}
            onDrop={onDrop(index)}
            onDragEnd={() => setOverIndex(null)}
          >
            <img src={item.src} alt={item.alt} className={styles.cellImg} draggable={false} />
            {!readOnly && (
              <button type="button" className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                ×
              </button>
            )}
            {readOnly ? (
              item.caption && <p className={styles.cellCaptionText}>{item.caption}</p>
            ) : (
              <input
                type="text"
                className={styles.cellCaption}
                placeholder="Caption…"
                value={item.caption}
                onChange={(e) => updateItem(item.id, { caption: e.target.value })}
              />
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className={styles.empty}>{readOnly ? "Empty gallery" : "No images yet — click “Add images”."}</div>
        )}
      </div>

      {!readOnly && (
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleAddFiles} />
      )}
    </NodeViewWrapper>
  );
}
