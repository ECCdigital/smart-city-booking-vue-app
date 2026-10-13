/**
 * The text colour the storefront puts on a colour of the branding: black when
 * the luma is above 180, otherwise white. A copy of the rule of the
 * storefront's Theme-CSS (map #510), so the previews of the Portal tab show
 * what the portal will show. Only `#rgb` and `#rrggbb` are read; any other
 * value gives white, as it does there.
 */

const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;

const CONTRAST_DARK = "#000000";
const CONTRAST_LIGHT = "#ffffff";

function channels(color) {
  const value = typeof color === "string" ? color : "";
  const long = HEX_LONG.exec(value);
  if (long) {
    return long.slice(1).map((hex) => parseInt(hex, 16));
  }
  const short = HEX_SHORT.exec(value);
  if (short) {
    return short.slice(1).map((hex) => parseInt(hex + hex, 16));
  }
  return null;
}

/**
 * @param {*} color - A colour of the branding.
 * @returns {string} `#000000` or `#ffffff`.
 */
export function contrastOf(color) {
  const rgb = channels(color);
  if (!rgb) {
    return CONTRAST_LIGHT;
  }
  const [r, g, b] = rgb;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 180 ? CONTRAST_DARK : CONTRAST_LIGHT;
}
