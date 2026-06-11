const MARKER_REGEX = /^<!--MAILBLOCKS:v=(\d+);b64=([A-Za-z0-9+/=]+)-->\s*/;

function base64Encode(str) {
  try {
    if (typeof window !== "undefined" && typeof window.btoa === "function") {
      return window.btoa(unescape(encodeURIComponent(str)));
    }
  } catch (e) {
    console.warn("Block metadata base64 encode failed", e);
  }
  return "";
}

function base64Decode(str) {
  try {
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return decodeURIComponent(escape(window.atob(str)));
    }
  } catch (e) {
    console.warn("Block metadata base64 decode failed", e);
  }
  return "";
}

export function extractBlockMetadata(html) {
  if (!html) return { blocks: null, body: "" };
  const match = String(html).match(MARKER_REGEX);
  if (!match) return { blocks: null, body: html };

  const json = base64Decode(match[2]);
  if (!json) return { blocks: null, body: html };
  try {
    const blocks = JSON.parse(json);
    const body = html.slice(match[0].length);
    return { blocks, body, version: Number(match[1]) };
  } catch (e) {
    console.warn("Could not parse block metadata", e);
    return { blocks: null, body: html };
  }
}

export function embedBlockMetadata(blocks, htmlBody) {
  const json = JSON.stringify(blocks ?? []);
  const b64 = base64Encode(json);
  if (!b64) return htmlBody;
  return `<!--MAILBLOCKS:v=1;b64=${b64}-->\n${htmlBody || ""}`;
}

export function hasBlockMetadata(html) {
  return MARKER_REGEX.test(String(html || ""));
}

/* Theme-Metadata */

const THEME_MARKER_REGEX = /^<!--MAILTHEME:v=(\d+);b64=([A-Za-z0-9+/=]+)-->\s*/;

export function extractThemeMetadata(html) {
  if (!html) return { theme: null, body: "" };
  const match = String(html).match(THEME_MARKER_REGEX);
  if (!match) return { theme: null, body: html };

  const json = base64Decode(match[2]);
  if (!json) return { theme: null, body: html };
  try {
    const theme = JSON.parse(json);
    const body = html.slice(match[0].length);
    return { theme, body, version: Number(match[1]) };
  } catch (e) {
    console.warn("Could not parse theme metadata", e);
    return { theme: null, body: html };
  }
}

export function embedThemeMetadata(theme, htmlBody) {
  const json = JSON.stringify(theme ?? {});
  const b64 = base64Encode(json);
  if (!b64) return htmlBody;
  return `<!--MAILTHEME:v=1;b64=${b64}-->\n${htmlBody || ""}`;
}

export function hasThemeMetadata(html) {
  return THEME_MARKER_REGEX.test(String(html || ""));
}
