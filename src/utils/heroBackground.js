/**
 * The Background as the „Hintergrund“ section of the Hero Editor holds it.
 *
 * The Background is a discriminated union on `type` (Shared contract,
 * „Background“): a generated `variant`, a flat `color` or an `image` with a
 * focal point and an overlay. This module owns the three families — what each
 * one starts from, how an incomplete one reads, and why the backend would
 * refuse it.
 *
 * Two jobs that look alike are deliberately apart. `normalizedHeroBackground`
 * fills what the backend fills on save, so a stored object that predates a
 * default still shows something; it never invents what the author has to
 * choose, because a missing pattern, colour or image is exactly what the
 * section has to complain about. `heroBackgroundOfFamily` is the other one:
 * the values a family starts from when a card switches to it.
 *
 * The Background is instance-wide and the auth pages use the same object, so
 * it has nothing to do with the „Standard-Layout“ chip — that is about the
 * Catalog's layout (hero layout spec §10).
 */

import { isHeroHexColor } from "@/utils/heroBlockValidation";
import { isMediaReference } from "@/utils/mediaReference";

/** The three families, in the order the cards show them (spec §8). */
export const HERO_BACKGROUND_FAMILIES = Object.freeze([
  { value: "variant", label: "Muster", icon: "mdi-texture-box" },
  { value: "color", label: "Farbe", icon: "mdi-format-color-fill" },
  { value: "image", label: "Bild", icon: "mdi-image-outline" },
]);

/** The five generated backgrounds, in the wording of the spec (§12). */
export const HERO_BACKGROUND_VARIANTS = Object.freeze([
  { value: "mesh", text: "Farbverlauf" },
  { value: "aurora", text: "Nordlicht" },
  { value: "poly", text: "Polygone" },
  { value: "grid", text: "Raster" },
  { value: "minimal", text: "Schlicht" },
]);

/** How strongly a pattern is painted (§12). */
export const HERO_BACKGROUND_INTENSITIES = Object.freeze([
  { value: "subtle", text: "Dezent" },
  { value: "normal", text: "Normal" },
  { value: "strong", text: "Kräftig" },
]);

// The overlay the contract fills in when an image Background carries none.
const DEFAULT_OVERLAY = Object.freeze({ color: "#000000", opacity: 40 });

// Where „Farbe“ starts. The contract has no default for it — `light` is
// required — so this is the editor's starting point, not a fallback: the grey
// of the spec's own example. „Bild“ cannot start the same way, because a
// medium is not something an editor can invent; that is the whole difference
// between the two families' starting points.
const INITIAL_COLOR = "#f3f4f6";

// The enum refusals mirror the backend's `invalid_enum` (Shared contract,
// „Error contract“). No select of the section can produce one — only a
// hand-written Background can — but the save is blocked until it is fixed, so
// the section has to say what is wrong, the way a Block's colour control does.
const UNKNOWN_FAMILY_ISSUE = "Die Art des Hintergrunds ist unbekannt.";
const NO_VARIANT_ISSUE = "Bitte ein Muster wählen.";
const UNKNOWN_VARIANT_ISSUE = "Das Muster ist unbekannt.";
const UNKNOWN_INTENSITY_ISSUE = "Die Intensität ist unbekannt.";
const NO_IMAGE_ISSUE = "Es ist kein Bild aus der Mediathek ausgewählt.";
const FOCAL_POINT_ISSUE =
  "Der Bildausschnitt muss in ganzen Prozent zwischen 0 und 100 liegen.";

/**
 * The Background an instance that stored none is painted with — today's
 * `poly` pattern, which „Standardhintergrund“ writes back.
 *
 * @returns {Object} The default Background.
 */
export function defaultHeroBackground() {
  return {
    version: 1,
    type: "variant",
    variant: "poly",
    orbs: true,
    noise: true,
    intensity: "normal",
  };
}

// What each family starts from, how an incomplete one of it reads and what it
// can be wrong about — one row per family instead of the same three-way
// cascade in three places.
const OF_FAMILY = Object.freeze({
  variant: {
    initial: defaultHeroBackground,
    normalize: normalizedVariant,
    issues: variantIssues,
  },
  color: {
    initial: initialColor,
    normalize: normalizedColor,
    issues: colorIssues,
  },
  image: {
    initial: initialImage,
    normalize: normalizedImage,
    issues: imageIssues,
  },
});

/**
 * What a family starts from when its card is chosen and this dialog session
 * has no earlier values of it. „Bild“ starts without an image on purpose:
 * picking one is the single thing the author has to do next, and the section
 * says so until they have.
 *
 * @param {string} family - `variant`, `color` or `image`.
 * @returns {Object} The Background to start editing.
 */
export function heroBackgroundOfFamily(family) {
  return (OF_FAMILY[family] || OF_FAMILY.variant).initial();
}

/**
 * Which family a Background belongs to. A missing one is the default
 * Background, so it reads as a pattern; anything the schema has no room for
 * reads as one too, so that the cards have something to show while the
 * section says what is wrong.
 *
 * @param {Object|null} background - The Background as the Draft holds it.
 * @returns {string} The family.
 */
export function heroBackgroundFamily(background) {
  const type = (background || {}).type;

  return isKnownFamily(type) ? type : "variant";
}

/**
 * The Background with every default the backend would fill on save, ready for
 * the form to read. `null` is the default Background — that is what the
 * contract's reset means.
 *
 * @param {Object|null} background - The Background as the Draft holds it.
 * @returns {Object} A complete Background, freshly built.
 */
export function normalizedHeroBackground(background) {
  if (!background) {
    return defaultHeroBackground();
  }

  return OF_FAMILY[heroBackgroundFamily(background)].normalize(background);
}

/**
 * The focal point as the contract stores it, filling in the centre where
 * there is none — its default, and what the crosshair sits on.
 *
 * @param {Object|null} focalPoint - The focal point as the Background holds it.
 * @returns {{x: number, y: number}} A whole pair.
 */
export function heroFocalPointOf(focalPoint) {
  const point = focalPoint || {};

  return {
    x: point.x == null ? 50 : point.x,
    y: point.y == null ? 50 : point.y,
  };
}

/**
 * The focal point a click on the thumbnail sets: where the click landed, as
 * whole percentages of the surface. A surface without a size — a thumbnail
 * that has not been laid out — has no point to speak of and reads as its
 * centre.
 *
 * @param {{x: number, y: number}} offset - The click inside the surface.
 * @param {{width: number, height: number}} size - The surface.
 * @returns {{x: number, y: number}} The focal point.
 */
export function heroFocalPoint(offset, size) {
  return {
    x: percentOf(offset.x, size.width),
    y: percentOf(offset.y, size.height),
  };
}

/**
 * Why the backend would refuse this Background, in the author's words. The
 * section shows them and „Speichern“ stays disabled while there is one
 * (hero layout spec §9).
 *
 * @param {Object|null} background - The Background as the Draft holds it.
 * @returns {string[]} The reasons, empty while the Background is fine.
 */
export function heroBackgroundIssues(background) {
  const type = (background || {}).type;
  if (type != null && !isKnownFamily(type)) {
    return [UNKNOWN_FAMILY_ISSUE];
  }

  const normalized = normalizedHeroBackground(background);

  return OF_FAMILY[normalized.type].issues(normalized);
}

function isKnownFamily(type) {
  return HERO_BACKGROUND_FAMILIES.some((family) => family.value === type);
}

function initialColor() {
  return { version: 1, type: "color", light: INITIAL_COLOR };
}

function initialImage() {
  return {
    version: 1,
    type: "image",
    image: null,
    focalPoint: { x: 50, y: 50 },
    overlay: { light: { ...DEFAULT_OVERLAY } },
  };
}

function normalizedVariant(background) {
  return {
    version: 1,
    type: "variant",
    variant: background.variant == null ? null : background.variant,
    orbs: background.orbs !== false,
    noise: background.noise !== false,
    intensity: background.intensity || "normal",
  };
}

function normalizedColor(background) {
  const normalized = {
    version: 1,
    type: "color",
    light: background.light == null ? null : background.light,
  };
  // An absent dark value is not the same as one equal to the light colour: it
  // means „follow the light one“, and the key stays away.
  if (background.dark != null) {
    normalized.dark = background.dark;
  }

  return normalized;
}

function normalizedImage(background) {
  const overlay = background.overlay || {};
  const light = { ...DEFAULT_OVERLAY, ...(overlay.light || {}) };
  const normalized = {
    version: 1,
    type: "image",
    image: background.image || null,
    focalPoint: heroFocalPointOf(background.focalPoint),
    overlay: { light },
  };
  // The dark overlay falls back to the light one where it is there but partial
  // — and stays away entirely where it is not.
  if (overlay.dark) {
    normalized.overlay.dark = { ...light, ...overlay.dark };
  }

  return normalized;
}

function variantIssues(background) {
  const issues = [];
  if (background.variant == null) {
    issues.push(NO_VARIANT_ISSUE);
  } else if (!hasOption(HERO_BACKGROUND_VARIANTS, background.variant)) {
    issues.push(UNKNOWN_VARIANT_ISSUE);
  }
  if (!hasOption(HERO_BACKGROUND_INTENSITIES, background.intensity)) {
    issues.push(UNKNOWN_INTENSITY_ISSUE);
  }

  return issues;
}

function colorIssues(background) {
  return [
    ...hexIssues(background.light, "Die Farbe"),
    ...(background.dark == null
      ? []
      : hexIssues(background.dark, "Die Farbe im Dunkelmodus")),
  ];
}

function imageIssues(background) {
  return [
    ...(isMediaReference(background.image) ? [] : [NO_IMAGE_ISSUE]),
    ...focalPointIssues(background.focalPoint),
    ...overlayIssues(background.overlay.light, "Abdunklung"),
    ...(background.overlay.dark
      ? overlayIssues(background.overlay.dark, "Abdunklung im Dunkelmodus")
      : []),
  ];
}

function focalPointIssues(focalPoint) {
  return isPercent(focalPoint.x) && isPercent(focalPoint.y)
    ? []
    : [FOCAL_POINT_ISSUE];
}

function overlayIssues(overlay, subject) {
  const opacityIssue = `Die ${subject} muss ein ganzer Prozentwert zwischen 0 und 100 sein.`;

  return [
    ...hexIssues(overlay.color, `Die Farbe der ${subject}`),
    ...(isPercent(overlay.opacity) ? [] : [opacityIssue]),
  ];
}

/**
 * A Background colour is hex and nothing else — the named tokens of a text
 * Block have no meaning behind the Hero (Shared contract, „Conventions“).
 */
function hexIssues(value, subject) {
  if (value == null || String(value).trim() === "") {
    return [`${subject} fehlt.`];
  }

  return isHeroHexColor(value)
    ? []
    : [`${subject} ist kein gültiger Hex-Wert.`];
}

function hasOption(options, value) {
  return options.some((option) => option.value === value);
}

function isPercent(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

function percentOf(offset, size) {
  if (!size) {
    return 50;
  }

  return Math.min(100, Math.max(0, Math.round((offset / size) * 100)));
}

/**
 * One line that says what the Background is while its controls are folded
 * away: the family, and the one value that tells it apart from its siblings.
 *
 * Inline German, like the rest of `Instance/Edit/` (hero layout spec §12).
 *
 * @param {?Object} background - The Background as the Draft holds it.
 * @returns {string} The summary.
 */
export function heroBackgroundSummary(background) {
  const family = heroBackgroundFamily(background);
  const complete = normalizedHeroBackground(background);

  if (family === "color") {
    return `Farbe ${complete.light}`;
  }
  if (family === "image") {
    return complete.image
      ? `Bild, Abdunklung ${complete.overlay.light.opacity} %`
      : "Bild, noch keines gewählt";
  }
  const variant = HERO_BACKGROUND_VARIANTS.find(
    (entry) => entry.value === complete.variant
  );

  return `Muster „${variant ? variant.text : complete.variant}“`;
}
