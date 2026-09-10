/**
 * The Hero Layout fixtures the Portal tab and the Hero Editor specs share, so
 * that both mean the same thing by "the layout an instance that never stored
 * one is shown" — and the few ways of driving the „Hintergrund“ section,
 * which the section's own spec and the editor's both reach for.
 */

import Vue from "vue";

/**
 * The default Background, as the backend answers it: normalised on save, so
 * every default is filled („Stored = complete“ of the Shared contract).
 */
export const HERO_BACKGROUND = Object.freeze({
  version: 1,
  type: "variant",
  variant: "poly",
  orbs: true,
  noise: true,
  intensity: "normal",
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

/**
 * One of the three family cards of the „Hintergrund“ section.
 *
 * @param {Object} root - The wrapper to search under.
 * @param {string} family - `variant`, `color` or `image`.
 * @returns {Object} The card's wrapper.
 */
export function backgroundFamilyCard(root, family) {
  const entry = root
    .findAll(".hero-background-form__family")
    .wrappers.find((card) => card.attributes("data-family") === family);
  if (!entry) {
    throw new Error(`Die Hintergrund-Karte „${family}“ fehlt.`);
  }
  return entry;
}

/**
 * @param {Object} root - The wrapper to search under.
 * @param {string} family - `variant`, `color` or `image`.
 */
export async function chooseBackgroundFamily(root, family) {
  await backgroundFamilyCard(root, family).trigger("click");
  await Vue.nextTick();
}

/**
 * What the „Hintergrund“ section says the backend would refuse.
 *
 * @param {Object} root - The wrapper to search under.
 * @returns {string[]} The messages shown at the section.
 */
export function backgroundIssues(root) {
  return root
    .findAll(".hero-background-form__issues .error--text")
    .wrappers.map((entry) => entry.text());
}
