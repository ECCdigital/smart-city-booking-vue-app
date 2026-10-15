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

/**
 * The storefront's own colours while the instance sets none (its Theme-CSS
 * route), so an empty field previews what the portal shows.
 */
export const STOREFRONT_COLORS = Object.freeze({
  primary: "#FF8B00",
  secondary: "#1D9ECC",
});

/**
 * The neutral header bar is fixed per colour mode and computes nothing: white
 * with the storefront's near-black text (gray-900) in light, and in dark the
 * ground of its footer with white text.
 */
const NEUTRAL_HEADER = Object.freeze({
  light: { bar: CONTRAST_LIGHT, contrast: "#101828" },
  dark: { bar: "#101828", contrast: CONTRAST_LIGHT },
});

/**
 * The colours of the storefront's header bar in one colour mode, as its
 * Theme-CSS writes them for `branding.header`: the bar and its text, and the
 * active tab with its text and its stripe. The tab stands out from the bar:
 * in secondary with a primary stripe, unless the bar itself is secondary, then
 * the other way round.
 *
 * @param {string} header - `neutral`, `primary` or `secondary`.
 * @param {Object} colors - The colours of the branding; empty ones read as the
 *   storefront's own.
 * @param {string} mode - `light` or `dark`.
 * @returns {{bar: string, contrast: string, active: string,
 *   activeContrast: string, stripe: string}}
 */
export function headerColors(header, colors, mode) {
  const primary = (colors && colors.primary) || STOREFRONT_COLORS.primary;
  const secondary = (colors && colors.secondary) || STOREFRONT_COLORS.secondary;
  const [active, stripe] =
    header === "secondary" ? [primary, secondary] : [secondary, primary];

  let bar;
  if (header === "neutral") {
    bar = NEUTRAL_HEADER[mode] || NEUTRAL_HEADER.light;
  } else {
    const color = header === "secondary" ? secondary : primary;
    bar = { bar: color, contrast: contrastOf(color) };
  }

  return {
    ...bar,
    active,
    activeContrast: contrastOf(active),
    stripe,
  };
}
