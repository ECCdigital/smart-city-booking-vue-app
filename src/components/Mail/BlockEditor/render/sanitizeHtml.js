const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "span",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "div",
  "img",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "footer",
]);

const ALLOWED_ATTRS = {
  "*": ["style", "class", "id", "align"],
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "width", "height"],
  span: ["data-variable"],
  td: ["colspan", "rowspan", "width"],
  th: ["colspan", "rowspan", "width"],
  table: ["border", "cellpadding", "cellspacing", "role", "width"],
};

function isSafeUrl(value) {
  if (!value) return false;
  const trimmed = String(value).trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:text/html")) {
    return false;
  }
  return true;
}

function sanitizeNode(node, doc) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(true);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  const tag = node.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) {
    const frag = doc.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      const cleaned = sanitizeNode(child, doc);
      if (cleaned) frag.appendChild(cleaned);
    });
    return frag;
  }

  const el = doc.createElement(tag);
  const allowedAttrs = new Set([
    ...(ALLOWED_ATTRS["*"] || []),
    ...(ALLOWED_ATTRS[tag] || []),
  ]);

  Array.from(node.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) return;
    if (!allowedAttrs.has(name)) return;
    if ((name === "href" || name === "src") && !isSafeUrl(attr.value)) return;
    el.setAttribute(name, attr.value);
  });

  Array.from(node.childNodes).forEach((child) => {
    const cleaned = sanitizeNode(child, doc);
    if (cleaned) el.appendChild(cleaned);
  });

  return el;
}

export function sanitizeHtml(input) {
  if (!input) return "";
  if (typeof window === "undefined") return String(input);

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstChild;
  if (!root) return "";

  const out = doc.createElement("div");
  Array.from(root.childNodes).forEach((node) => {
    const cleaned = sanitizeNode(node, doc);
    if (cleaned) out.appendChild(cleaned);
  });
  return out.innerHTML;
}

export function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
