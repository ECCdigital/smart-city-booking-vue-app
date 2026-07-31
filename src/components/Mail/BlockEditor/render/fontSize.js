const DEFAULT_FONT_SIZE_PX = 16;

const LEGACY_FONT_SIZE = {
  S: 14,
  M: 16,
  L: 18,
};

const FONT_SIZE_PX_VALUES = [7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24];

export const FONT_SIZE_OPTIONS = FONT_SIZE_PX_VALUES.map((px) => ({
  text: `${px} px`,
  value: px,
}));

/**
 * Resolve a text-block fontSize to a pixel number.
 * Accepts legacy S/M/L, numbers, and numeric strings. Falls back to 16.
 */
export function resolveFontSizePx(value) {
  if (value == null || value === "") {
    return DEFAULT_FONT_SIZE_PX;
  }
  if (typeof value === "string" && Object.prototype.hasOwnProperty.call(LEGACY_FONT_SIZE, value)) {
    return LEGACY_FONT_SIZE[value];
  }
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n) && n > 0) {
    return Math.round(n);
  }
  return DEFAULT_FONT_SIZE_PX;
}
