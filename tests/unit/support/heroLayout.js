/**
 * The Hero Layout fixtures the Portal tab and the Hero Editor specs share, so
 * that both mean the same thing by "the layout an instance that never stored
 * one is shown".
 */

export const HERO_BACKGROUND = Object.freeze({
  version: 1,
  type: "variant",
  variant: "poly",
});

/** A layout in the shape the backend normalises to. */
export function heroLayout(overrides = {}) {
  return {
    version: 1,
    height: "lg",
    mobileHeight: "lg",
    compactHeight: "sm",
    blocks: [],
    ...overrides,
  };
}

/**
 * What `GET /api/catalog/hero-layout` answers — by default the derived
 * default of an instance that stored no layout.
 */
export function heroLayoutResponse(overrides = {}) {
  return {
    data: {
      heroLayout: heroLayout(),
      background: HERO_BACKGROUND,
      name: "Marktplatz",
      isDefault: true,
      ...overrides,
    },
  };
}
