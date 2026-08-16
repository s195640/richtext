import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";
import { createRoot, type Root } from "react-dom/client";
import type { UploadCallbacks } from "../types";
import styles from "../styles/SlashMenu.module.css";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (args: { editor: Editor; range: Range }) => void;
}

function buildItems(upload: UploadCallbacks): SlashCommandItem[] {
  const pickFile = (accept: string) =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });

  return [
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: "H2",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: "H3",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet list",
      description: "Unordered list",
      icon: "•—",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Ordered list",
      description: "Numbered list",
      icon: "1.",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Blockquote",
      description: "Quoted text",
      icon: "❝",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: "Divider",
      description: "Horizontal rule",
      icon: "―",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "Image",
      description: "Upload and embed an image",
      icon: "🖼",
      command: async ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const file = await pickFile("image/*");
        if (!file) return;
        const result = await upload.onUploadImage(file);
        editor.chain().focus().insertImageBlock({ src: result.url, alt: result.alt ?? "" }).run();
      },
    },
    {
      title: "Gallery",
      description: "Group of images",
      icon: "🗂",
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertGalleryBlock({ items: [] }).run(),
    },
    {
      title: "Video",
      description: "Upload and embed a video",
      icon: "🎬",
      command: async ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const file = await pickFile("video/*");
        if (!file) return;
        const result = await upload.onUploadVideo(file);
        editor
          .chain()
          .focus()
          .insertVideoBlock({ src: result.url, poster: result.poster ?? "", duration: result.duration ?? null })
          .run();
      },
    },
  ];
}

class MenuView {
  private root: Root;
  private el: HTMLDivElement;
  private items: SlashCommandItem[] = [];
  private selected = 0;
  private command: (item: SlashCommandItem) => void = () => {};

  constructor() {
    this.el = document.createElement("div");
    this.el.className = styles.menu;
    document.body.appendChild(this.el);
    this.root = createRoot(this.el);
  }

  update(items: SlashCommandItem[], selected: number, command: (item: SlashCommandItem) => void) {
    this.items = items;
    this.selected = selected;
    this.command = command;
    this.render();
  }

  private render() {
    this.root.render(
      <div className={styles.list} role="listbox">
        {this.items.length === 0 && <div className={styles.empty}>No matches</div>}
        {this.items.map((item, i) => (
          <button
            type="button"
            key={item.title}
            className={`${styles.item} ${i === this.selected ? styles.itemActive : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              this.command(item);
            }}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.text}>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.desc}>{item.description}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  setPosition(rect: DOMRect) {
    this.el.style.position = "fixed";
    this.el.style.left = `${rect.left}px`;
    this.el.style.top = `${rect.bottom + 6}px`;
  }

  show() {
    this.el.style.display = "block";
  }

  hide() {
    this.el.style.display = "none";
  }

  destroy() {
    this.root.unmount();
    this.el.remove();
  }
}

function createSuggestion(upload: UploadCallbacks): Omit<SuggestionOptions<SlashCommandItem>, "editor"> {
  return {
    char: "/",
    startOfLine: false,
    items: ({ query }) => {
      const all = buildItems(upload);
      if (!query) return all;
      const q = query.toLowerCase();
      return all.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    },
    command: ({ editor, range, props }) => {
      (props as SlashCommandItem).command({ editor, range });
    },
    render: () => {
      let menu: MenuView;
      let selected = 0;
      let currentItems: SlashCommandItem[] = [];
      let currentProps: any;

      return {
        onStart: (props) => {
          menu = new MenuView();
          currentItems = props.items;
          currentProps = props;
          menu.update(currentItems, selected, (item) => props.command(item));
          if (props.clientRect) {
            const rect = props.clientRect();
            if (rect) menu.setPosition(rect as DOMRect);
          }
          menu.show();
        },
        onUpdate: (props) => {
          currentItems = props.items;
          currentProps = props;
          selected = Math.min(selected, Math.max(0, currentItems.length - 1));
          menu.update(currentItems, selected, (item) => props.command(item));
          if (props.clientRect) {
            const rect = props.clientRect();
            if (rect) menu.setPosition(rect as DOMRect);
          }
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            menu.hide();
            return true;
          }
          if (props.event.key === "ArrowDown") {
            selected = (selected + 1) % Math.max(1, currentItems.length);
            menu.update(currentItems, selected, (item) => currentProps.command(item));
            return true;
          }
          if (props.event.key === "ArrowUp") {
            selected = (selected - 1 + currentItems.length) % Math.max(1, currentItems.length);
            menu.update(currentItems, selected, (item) => currentProps.command(item));
            return true;
          }
          if (props.event.key === "Enter") {
            const item = currentItems[selected];
            if (item) currentProps.command(item);
            return true;
          }
          return false;
        },
        onExit: () => {
          menu.destroy();
        },
      };
    },
  };
}

export const SlashCommand = Extension.create<{ upload: UploadCallbacks | null }>({
  name: "slashCommand",

  addOptions() {
    return { upload: null };
  },

  addProseMirrorPlugins() {
    if (!this.options.upload) return [];
    return [
      Suggestion({
        editor: this.editor,
        ...createSuggestion(this.options.upload),
      }),
    ];
  },
});
