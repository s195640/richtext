import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { createRoot, type Root } from "react-dom/client";
import { loadEmojiData, searchEmojis, type EmojiItem } from "./emojiData";
import styles from "../styles/EmojiMenu.module.css";

// Suggestion() defaults to a shared plugin key ("suggestion$") when none is
// given, which collides with SlashCommand's own Suggestion-based plugin —
// each needs its own.
const EMOJI_SUGGESTION_PLUGIN_KEY = new PluginKey("emojiSuggestion");

const MAX_RESULTS = 30;

class EmojiMenuView {
  private root: Root;
  private el: HTMLDivElement;
  private items: EmojiItem[] = [];
  private selected = 0;
  private loading = false;
  private command: (item: EmojiItem) => void = () => {};

  constructor() {
    this.el = document.createElement("div");
    this.el.className = styles.menu;
    document.body.appendChild(this.el);
    this.root = createRoot(this.el);
  }

  update(items: EmojiItem[], selected: number, loading: boolean, command: (item: EmojiItem) => void) {
    this.items = items;
    this.selected = selected;
    this.loading = loading;
    this.command = command;
    this.render();
  }

  private render() {
    this.root.render(
      <div className={styles.list} role="listbox">
        {this.loading && this.items.length === 0 && <div className={styles.empty}>Loading…</div>}
        {!this.loading && this.items.length === 0 && <div className={styles.empty}>No matches</div>}
        {this.items.map((item, i) => (
          <button
            type="button"
            key={item.name}
            className={`${styles.item} ${i === this.selected ? styles.itemActive : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              this.command(item);
            }}
          >
            <span className={styles.glyph}>{item.emoji}</span>
            <span className={styles.name}>:{item.shortcodes[0]}:</span>
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

function createEmojiSuggestion(): Omit<SuggestionOptions<EmojiItem>, "editor"> {
  return {
    char: ":",
    pluginKey: EMOJI_SUGGESTION_PLUGIN_KEY,
    items: async ({ query }) => searchEmojis(await loadEmojiData(), query, MAX_RESULTS),
    command: ({ editor, range, props }) => {
      // Plain unicode text, not a custom node — see the note on
      // `loadEmojiData` above for why.
      editor.chain().focus().insertContentAt(range, props.emoji ?? `:${props.name}:`).run();
    },
    render: () => {
      let menu: EmojiMenuView;
      let selected = 0;
      let currentItems: EmojiItem[] = [];
      let currentProps: any;

      return {
        onStart: (props) => {
          menu = new EmojiMenuView();
          currentItems = props.items;
          currentProps = props;
          menu.update(currentItems, selected, props.loading ?? false, (item) => props.command(item));
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
          menu.update(currentItems, selected, props.loading ?? false, (item) => props.command(item));
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
            menu.update(currentItems, selected, false, (item) => currentProps.command(item));
            return true;
          }
          if (props.event.key === "ArrowUp") {
            selected = (selected - 1 + currentItems.length) % Math.max(1, currentItems.length);
            menu.update(currentItems, selected, false, (item) => currentProps.command(item));
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

/**
 * ":" typeahead that inserts the picked emoji as a plain unicode character
 * (via ordinary text content) rather than registering a custom `emoji` node
 * — this needs no schema/sanitizer changes, round-trips through any
 * plain-text rendering, and keeps the searchable emoji dataset (see
 * `loadEmojiData` above) out of the read-only viewer entirely, since that
 * only ever renders already-inserted characters, never the picker.
 */
export const EmojiPicker = Extension.create({
  name: "emojiPicker",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...createEmojiSuggestion(),
      }),
    ];
  },
});
