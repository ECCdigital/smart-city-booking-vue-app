import { cryptoRandomId } from "./render/renderBlocksToHtml.js";

export const BLOCK_PALETTE = [
  { type: "text", label: "Text", icon: "mdi-format-text" },
  { type: "heading", label: "Überschrift", icon: "mdi-format-header-1" },
  { type: "image", label: "Bild", icon: "mdi-image" },
  { type: "button", label: "Button", icon: "mdi-button-cursor" },
  { type: "divider", label: "Trennlinie", icon: "mdi-minus" },
  { type: "spacer", label: "Abstand", icon: "mdi-arrow-expand-vertical" },
  { type: "callout", label: "Hinweis", icon: "mdi-information-outline" },
  { type: "quote", label: "Zitat", icon: "mdi-format-quote-close" },
  { type: "list", label: "Liste", icon: "mdi-format-list-bulleted" },
  { type: "rawHtml", label: "Roh-HTML", icon: "mdi-code-tags" },
];

export const ROW_PALETTE = [
  { type: "row", label: "1 Spalte", icon: "mdi-square-outline", layout: [12] },
  { type: "row", label: "2 Spalten 50/50", icon: "mdi-view-column-outline", layout: [6, 6] },
  { type: "row", label: "2 Spalten 33/66", icon: "mdi-view-split-vertical", layout: [4, 8] },
  { type: "row", label: "2 Spalten 66/33", icon: "mdi-view-split-vertical", layout: [8, 4] },
  { type: "row", label: "3 Spalten", icon: "mdi-view-grid-outline", layout: [4, 4, 4] },
];

export function createBlock(type) {
  const id = cryptoRandomId();
  switch (type) {
  case "text":
    return { id, type, html: "<p>Neuer Text…</p>", align: "left" };
  case "heading":
    return { id, type, text: "Überschrift", level: 2, align: "left" };
  case "image":
    return { id, type, src: "", alt: "", width: 600, align: "center" };
  case "button":
    return {
      id,
      type,
      label: "Klicken",
      href: "https://",
      bg: "#1976d2",
      color: "#ffffff",
      align: "center",
      paddingX: 20,
      paddingY: 12,
      radius: 4,
      fullWidth: false,
    };
  case "divider":
    return { id, type, color: "#dddddd", thickness: 1, style: "solid", paddingY: 12 };
  case "spacer":
    return { id, type, height: 16 };
  case "callout":
    return {
      id,
      type,
      variant: "info",
      title: "",
      html: "<p>Wichtiger Hinweis…</p>",
    };
  case "quote":
    return { id, type, text: "Ein Zitat oder Hinweis.", cite: "", align: "left" };
  case "list":
    return { id, type, ordered: false, items: ["Erster Punkt"] };
  case "rawHtml":
    return { id, type, html: "<p>HTML hier…</p>" };
  default:
    return null;
  }
}

export function createRow(layout = [12]) {
  return {
    id: cryptoRandomId(),
    type: "row",
    columns: layout.map((width) => ({ width, blocks: [] })),
  };
}
