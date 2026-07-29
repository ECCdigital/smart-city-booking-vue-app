import { sanitizeHtml, escapeAttr, escapeText } from "./sanitizeHtml";

const DEFAULTS = {
  textColor: "#222222",
  linkColor: "#1976d2",
  buttonBg: "#1976d2",
  buttonColor: "#ffffff",
  dividerColor: "#dddddd",
  // Inherit from the tenant mail theme shell so layout and body share one font.
  fontFamily: "inherit",
};

function joinStyle(parts) {
  return parts.filter(Boolean).join(" ");
}

function renderText(block) {
  const align = block.align || "left";
  const color = block.color || DEFAULTS.textColor;
  const bg = block.background ? `background:${escapeAttr(block.background)};` : "";
  const padding = block.background ? "padding:12px 16px;" : "";
  const fontSizePx =
    block.fontSize === "S" ? 14 : block.fontSize === "L" ? 18 : 16;
  const style = joinStyle([
    `text-align:${escapeAttr(align)};`,
    `color:${escapeAttr(color)};`,
    `font-size:${fontSizePx}px;`,
    "line-height:1.5;",
    bg,
    padding,
  ]);
  return `<div style="${style}">${sanitizeHtml(block.html || "")}</div>`;
}

function renderHeading(block) {
  const level = Math.min(Math.max(block.level || 1, 1), 3);
  const align = block.align || "left";
  const color = block.color || DEFAULTS.textColor;
  const sizePx = level === 1 ? 26 : level === 2 ? 22 : 18;
  const style = joinStyle([
    "margin:0 0 12px;",
    `color:${escapeAttr(color)};`,
    `text-align:${escapeAttr(align)};`,
    `font-size:${sizePx}px;`,
    "line-height:1.3;",
  ]);
  return `<h${level} style="${style}">${escapeText(block.text || "")}</h${level}>`;
}

function renderImage(block) {
  const src = block.src ? escapeAttr(block.src) : "";
  if (!src) return "";
  const alt = escapeAttr(block.alt || "");
  const width = block.width
    ? `width="${Number(block.width)}"`
    : "";
  const align = block.align || "left";
  const wrapperStyle = `text-align:${escapeAttr(align)};`;
  const imgStyle =
    "display:block; max-width:100%; height:auto; border:0; outline:none; text-decoration:none;" +
    (align === "center" ? "margin:0 auto;" : "");

  let img = `<img src="${src}" alt="${alt}" ${width} style="${imgStyle}">`;
  if (block.link) {
    const href = escapeAttr(block.link);
    img = `<a href="${href}" target="_blank" rel="noopener">${img}</a>`;
  }
  return `<div style="${wrapperStyle}">${img}</div>`;
}

function renderButton(block) {
  const label = escapeText(block.label || "Button");
  const href = escapeAttr(block.href || "#");
  const bg = block.bg || DEFAULTS.buttonBg;
  const color = block.color || DEFAULTS.buttonColor;
  const align = block.align || "left";
  const radius = Number.isFinite(block.radius) ? block.radius : 4;
  const px = Number.isFinite(block.paddingX) ? block.paddingX : 20;
  const py = Number.isFinite(block.paddingY) ? block.paddingY : 12;
  const fullWidth = !!block.fullWidth;

  const aStyle = joinStyle([
    "display:inline-block;",
    `padding:${py}px ${px}px;`,
    `color:${escapeAttr(color)};`,
    "text-decoration:none;",
    "font-weight:600;",
    `border-radius:${radius}px;`,
    fullWidth ? "width:100%; text-align:center;" : "",
  ]);
  const tdStyle = joinStyle([
    `background:${escapeAttr(bg)};`,
    `border-radius:${radius}px;`,
  ]);
  const tableStyle = fullWidth ? "width:100%;" : "";
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${escapeAttr(
      align
    )}" style="${tableStyle}">` +
    `<tr><td style="${tdStyle}">` +
    `<a href="${href}" target="_blank" rel="noopener" style="${aStyle}">${label}</a>` +
    "</td></tr></table>"
  );
}

function renderDivider(block) {
  const color = escapeAttr(block.color || DEFAULTS.dividerColor);
  const thickness = Number.isFinite(block.thickness) ? block.thickness : 1;
  const style = block.style === "dashed" ? "dashed" : "solid";
  const paddingY = Number.isFinite(block.paddingY) ? block.paddingY : 12;
  return `<div style="padding:${paddingY}px 0;"><hr style="border:none; border-top:${thickness}px ${style} ${color}; margin:0;"></div>`;
}

function renderSpacer(block) {
  const h = Number.isFinite(block.height) ? block.height : 16;
  return `<div style="height:${h}px; line-height:${h}px; font-size:0;">&nbsp;</div>`;
}

function renderCallout(block) {
  const variant = block.variant || "info";
  const palette = {
    info: { border: "#1976d2", bg: "#e3f2fd", color: "#0d3c61" },
    success: { border: "#2e7d32", bg: "#e8f5e9", color: "#1b5e20" },
    warning: { border: "#ed6c02", bg: "#fff4e5", color: "#7a3c00" },
  }[variant] || { border: "#666", bg: "#f5f5f5", color: "#222" };

  const titleHtml = block.title
    ? `<div style="font-weight:600; margin-bottom:4px;">${escapeText(block.title)}</div>`
    : "";
  const bodyHtml = sanitizeHtml(block.html || "");
  const style = joinStyle([
    `border-left:4px solid ${palette.border};`,
    `background:${palette.bg};`,
    `color:${palette.color};`,
    "padding:12px 16px;",
    "border-radius:2px;",
  ]);
  return `<div style="${style}">${titleHtml}${bodyHtml}</div>`;
}

function renderQuote(block) {
  const align = block.align || "left";
  const color = block.color || "#555";
  const text = escapeText(block.text || "");
  const cite = block.cite ? `<footer style="margin-top:6px; font-size:12px; opacity:0.7;">— ${escapeText(block.cite)}</footer>` : "";
  const style = joinStyle([
    "margin:0;",
    "padding:8px 16px;",
    "border-left:4px solid #cccccc;",
    `color:${escapeAttr(color)};`,
    "font-style:italic;",
    `text-align:${escapeAttr(align)};`,
  ]);
  return `<blockquote style="${style}">${text}${cite}</blockquote>`;
}

function renderList(block) {
  const tag = block.ordered ? "ol" : "ul";
  const items = (block.items || [])
    .map(
      (item) =>
        `<li style="margin:4px 0;">${sanitizeHtml(item || "")}</li>`
    )
    .join("");
  return `<${tag} style="padding-left:20px; margin:0 0 12px;">${items}</${tag}>`;
}

function renderRawHtml(block) {
  return sanitizeHtml(block.html || "");
}

function renderContentBlock(block) {
  switch (block.type) {
  case "text":
    return renderText(block);
  case "heading":
    return renderHeading(block);
  case "image":
    return renderImage(block);
  case "button":
    return renderButton(block);
  case "divider":
    return renderDivider(block);
  case "spacer":
    return renderSpacer(block);
  case "callout":
    return renderCallout(block);
  case "quote":
    return renderQuote(block);
  case "list":
    return renderList(block);
  case "rawHtml":
    return renderRawHtml(block);
  default:
    return "";
  }
}

function renderColumn(column, opts = {}) {
  const width = Number(column.width) || 12;
  const widthPct = (width / 12) * 100;
  const blocksHtml = (column.blocks || []).map(renderContentBlock).join("\n");
  const horizontalPadding = opts.singleColumn ? "" : "padding:0 8px;";
  const style = joinStyle([
    "vertical-align:top;",
    horizontalPadding,
    `width:${widthPct}%;`,
  ]);
  return `<td style="${style}" width="${widthPct}%">${blocksHtml}</td>`;
}

function renderRow(block) {
  const columns = block.columns && block.columns.length ? block.columns : [
    { width: 12, blocks: [] },
  ];
  const bg = block.background
    ? `background:${escapeAttr(block.background)};`
    : "";
  const paddingY = Number.isFinite(block.paddingY) ? block.paddingY : 0;
  const wrapperStyle = joinStyle([
    bg,
    paddingY ? `padding:${paddingY}px 0;` : "",
  ]);
  const tableStyle = joinStyle([
    "width:100%;",
    "border-collapse:collapse;",
  ]);
  const singleColumn = columns.length === 1;
  const cells = columns
    .map((col) => renderColumn(col, { singleColumn }))
    .join("");
  return (
    `<div style="${wrapperStyle}">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${tableStyle}">` +
    `<tr>${cells}</tr></table>` +
    "</div>"
  );
}

/**
 * Wraps content blocks in a default 12-wide Row if blocks contain content-blocks at top level.
 */
function normalizeTopLevel(blocks) {
  const result = [];
  let currentColumnBlocks = null;
  for (const b of blocks || []) {
    if (b && b.type === "row") {
      if (currentColumnBlocks) {
        result.push({
          type: "row",
          columns: [{ width: 12, blocks: currentColumnBlocks }],
        });
        currentColumnBlocks = null;
      }
      result.push(b);
    } else if (b) {
      if (!currentColumnBlocks) currentColumnBlocks = [];
      currentColumnBlocks.push(b);
    }
  }
  if (currentColumnBlocks) {
    result.push({
      type: "row",
      columns: [{ width: 12, blocks: currentColumnBlocks }],
    });
  }
  return result;
}

export function renderBlocksToHtml(blocks) {
  const normalized = normalizeTopLevel(blocks);
  const body = normalized.map(renderRow).join("\n");
  const wrapperStyle = joinStyle([
    `font-family:${DEFAULTS.fontFamily};`,
    `color:${DEFAULTS.textColor};`,
    "line-height:1.5;",
    "font-size:16px;",
  ]);
  return `<div style="${wrapperStyle}">\n${body}\n</div>`;
}

export function createDefaultBlocks() {
  return [
    {
      id: cryptoRandomId(),
      type: "row",
      columns: [
        {
          width: 12,
          blocks: [
            {
              id: cryptoRandomId(),
              type: "text",
              html:
                "<p>Hallo,</p><p>vielen Dank für Ihre Buchung im <strong>{{tenantName}}</strong>.</p>",
              align: "left",
            },
          ],
        },
      ],
    },
  ];
}

export function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "b-" + Math.random().toString(36).slice(2, 10);
}
