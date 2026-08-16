import type { JournalEntryContent } from "journal-entry";
import { placeholderImage } from "./placeholderImage";

export const sampleDocument: JournalEntryContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "A morning at the lake" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "We got there before sunrise. " },
        { type: "text", marks: [{ type: "bold" }], text: "Everyone" },
        { type: "text", text: " came, even though the forecast said rain. It didn't rain." },
      ],
    },
    {
      type: "imageBlock",
      attrs: {
        src: placeholderImage("lake at dawn", "#4f7cff"),
        alt: "Lake at dawn",
        caption: "The water was completely still.",
        width: null,
        frameHeight: 360,
        zoom: 1,
        focalX: 0.5,
        focalY: 0.5,
      },
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "A few more from that afternoon:" }],
    },
    {
      type: "galleryBlock",
      attrs: {
        items: [
          { id: "g1", src: placeholderImage("dock", "#2f9e64"), alt: "The dock", caption: "" },
          { id: "g2", src: placeholderImage("firepit", "#d9822b"), alt: "Firepit", caption: "Later that night." },
          { id: "g3", src: placeholderImage("trail", "#a355d1"), alt: "Trail", caption: "" },
        ],
      },
    },
    {
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ type: "text", text: "“Best trip we've had in years.”" }] }],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Swam at noon" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Grilled way too much food" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Fell asleep before the fireworks" }] }] },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Try the slash menu below to add a video, or drop one in with the toolbar.",
        },
      ],
    },
    { type: "paragraph" },
  ],
};
