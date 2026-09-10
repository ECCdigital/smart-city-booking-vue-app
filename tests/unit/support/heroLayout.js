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

/** A Block in the shape the backend normalises to. */
export function heroBlock(overrides = {}) {
  return {
    id: "block-1",
    type: "text",
    zone: "middle-center",
    outerSpacing: "none",
    innerSpacing: "none",
    width: "auto",
    panel: "none",
    homeOnly: false,
    hideOnMobile: false,
    text: { de: "Willkommen" },
    size: "md",
    color: "default",
    weight: "normal",
    shadow: false,
    ...overrides,
  };
}

/**
 * A rich-text Block: `html` instead of `text`, and none of the fields only a
 * text Block has.
 */
export function heroRichtextBlock(overrides = {}) {
  return withoutTextFields(
    heroBlock({
      type: "richtext",
      html: { de: "<p>Willkommen</p>" },
      ...overrides,
    })
  );
}

/** An image Block, pointing at a medium of the instance's library. */
export function heroImageBlock(overrides = {}) {
  const block = withoutTextFields(
    heroBlock({
      type: "image",
      image: { source: "media", mediaId: "m1" },
      alt: { de: "Das Logo" },
      maxHeight: "md",
      invertInDarkMode: false,
      ...overrides,
    })
  );
  delete block.color;

  return block;
}

/** `heroBlock` builds a text Block; the other two types carry none of this. */
function withoutTextFields(block) {
  delete block.text;
  delete block.size;
  delete block.weight;

  return block;
}
