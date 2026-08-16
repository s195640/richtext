import type { ContentDocument } from "@s195640/content-editor";
import { placeholderImage } from "./placeholderImage";

export const sampleDocument: ContentDocument = {
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
      type: "image",
      attrs: {
        src: placeholderImage("lake at dawn", "#4f7cff"),
        originalSrc: placeholderImage("lake at dawn", "#4f7cff"),
        alt: "Lake at dawn",
        width: 320,
        height: 210,
        align: "left",
      },
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text:
            "This one's floated left with the text wrapping around it — select it to see the alignment, resize, crop, and drag-to-reposition controls. Drag the grip in the corner to move it to a different spot in the document, drag the bottom-right handle to resize it, or hit the scissors icon to crop and zoom in place.",
        },
      ],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "A few more from that afternoon:" }],
    },
    {
      type: "image",
      attrs: {
        src: placeholderImage("dock", "#2f9e64"),
        alt: "The dock",
      },
    },
    {
      type: "image",
      attrs: {
        src: placeholderImage("firepit", "#d9822b"),
        alt: "Firepit",
      },
    },
    {
      type: "blockquote",
      content: [{ type: "paragraph", content: [{ type: "text", text: "“Best trip we've had in years.” 🥰" }] }],
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
          text: "Try the slash menu below to add another image, or drop one in with the toolbar. Select some text to try ",
        },
        {
          type: "text",
          marks: [{ type: "textStyle", attrs: { fontFamily: "Georgia, serif", fontSize: "20px", color: "#2f7bd9" } }],
          text: "font, size, and color",
        },
        { type: "text", text: ", or " },
        {
          type: "text",
          marks: [{ type: "textStyle", attrs: { backgroundColor: "#c9a227" } }],
          text: "background color",
        },
        { type: "text", text: "." },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [{ type: "text", text: "— centered, via the alignment dropdown —" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Links work whether they're typed as " },
        {
          type: "text",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          text: "https://example.com",
        },
        { type: "text", text: ", " },
        {
          type: "text",
          marks: [{ type: "link", attrs: { href: "www.example.com" } }],
          text: "www.example.com",
        },
        { type: "text", text: ", or just " },
        {
          type: "text",
          marks: [{ type: "link", attrs: { href: "example.com" } }],
          text: "example.com",
        },
        { type: "text", text: " — a bare host with no scheme is treated as https:// automatically." },
      ],
    },
    { type: "paragraph" },
  ],
};
