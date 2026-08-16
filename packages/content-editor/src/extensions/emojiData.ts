import type { EmojiItem } from "@tiptap/extension-emoji";

export type { EmojiItem };

// The searchable emoji list (~1,950 entries, tags/fallback-image URLs and
// all) is a few hundred KB — real weight for something most documents never
// touch. Loaded lazily on first use (not from `extensions/index.ts`)
// and cached, so a reader who never opens the editor — and the editor
// itself, until someone actually opens the ":" popup or the toolbar's emoji
// picker — never pays for it. Both `EmojiSuggestion` and the toolbar picker
// share this one cached promise/module, and both insert the result as a
// plain unicode character rather than a custom node, so this data is only
// ever needed here.
let emojiDataPromise: Promise<EmojiItem[]> | null = null;
export function loadEmojiData(): Promise<EmojiItem[]> {
  if (!emojiDataPromise) {
    emojiDataPromise = import("@tiptap/extension-emoji").then((mod) => mod.emojis);
  }
  return emojiDataPromise;
}

export function searchEmojis(all: EmojiItem[], query: string, max: number): EmojiItem[] {
  if (!query) return all.slice(0, max);
  const q = query.toLowerCase();
  return all
    .filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.shortcodes.some((code) => code.toLowerCase().includes(q)) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
    )
    .slice(0, max);
}
