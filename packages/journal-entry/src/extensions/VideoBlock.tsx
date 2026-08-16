import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { useUploadCallbacks } from "../uploadContext";
import styles from "../styles/VideoBlock.module.css";

export interface VideoBlockAttrs {
  src: string;
  poster: string;
  duration: number | null;
  caption: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoBlock: {
      insertVideoBlock: (attrs: Partial<VideoBlockAttrs> & { src: string }) => ReturnType;
    };
  }
}

const DEFAULTS: Omit<VideoBlockAttrs, "src"> = {
  poster: "",
  duration: null,
  caption: "",
};

export const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      poster: { default: DEFAULTS.poster },
      duration: { default: DEFAULTS.duration },
      caption: { default: DEFAULTS.caption },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video-block" })];
  },

  addCommands() {
    return {
      insertVideoBlock:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { ...DEFAULTS, ...attrs } })
            .run(),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockView);
  },
});

function formatDuration(seconds: number | null) {
  if (!seconds && seconds !== 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoBlockView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as VideoBlockAttrs;
  const readOnly = !editor.isEditable;
  const { onUploadVideo } = useUploadCallbacks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleReplace = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setUploading(true);
      try {
        const result = await onUploadVideo(file);
        updateAttributes({
          src: result.url,
          poster: result.poster ?? "",
          duration: result.duration ?? null,
        });
      } finally {
        setUploading(false);
      }
    },
    [onUploadVideo, updateAttributes]
  );

  const durationLabel = formatDuration(attrs.duration);

  return (
    <NodeViewWrapper className={`${styles.wrapper} ${selected ? styles.selected : ""}`} data-drag-handle={readOnly ? undefined : ""}>
      <div className={styles.frame}>
        {attrs.src ? (
          <video src={attrs.src} poster={attrs.poster || undefined} controls className={styles.video} />
        ) : (
          <div className={styles.placeholder}>{uploading ? "Uploading…" : "No video"}</div>
        )}

        {durationLabel && <span className={styles.duration}>{durationLabel}</span>}

        {!readOnly && (
          <div className={styles.toolbar} contentEditable={false}>
            <button type="button" onClick={handleReplace} disabled={uploading}>
              Replace
            </button>
            <button type="button" onClick={() => deleteNode()} className={styles.danger}>
              Delete
            </button>
          </div>
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

      {!readOnly && <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={handleFileChange} />}
    </NodeViewWrapper>
  );
}
