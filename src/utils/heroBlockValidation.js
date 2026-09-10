/**
 * The local pre-validation of a Block, mirroring the backend and nothing more.
 *
 * The editor refuses a save the backend would refuse anyway, so the author
 * sees the problem on the row instead of in a toast after the round-trip
 * (hero layout spec §9). Every rule here has a counterpart in the Shared
 * contract; a rule the backend does not have does not belong here.
 *
 * Two shapes come out of the same predicates: `heroBlockIssues` for the badge
 * on the row and the gate on „Speichern“, and the rule arrays a Vuetify input
 * takes for the message under the field.
 *
 * The colour helpers — `isHeroHexColor`, `heroHexWithoutAlpha` and the two
 * hex rule arrays — are the contract's, not a Block's: `heroBackground.js`
 * and the Background's colour fields read the same `#rrggbb` from here.
 */

import { heroHtmlFirstLine, heroLocalizedText } from "@/utils/heroBlocks";
import { isMediaReference } from "@/utils/mediaReference";

/** The cap the contract puts on `text.text` and `image.alt`, per locale. */
export const HERO_TEXT_MAX_LENGTH = 200;

/** The cap the contract puts on `richtext.html`, per locale. */
export const HERO_RICHTEXT_MAX_LENGTH = 10000;

// A colour is either one of the four tokens or `#rrggbb` — no alpha, no
// shorthand (Shared contract, „Conventions“).
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const NAMED_COLORS = Object.freeze([
  "default",
  "primary",
  "secondary",
  "white",
]);

const REQUIRED_MESSAGE = "Pflichtfeld";
const HEX_MESSAGE = "Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c.";
const NO_IMAGE_MESSAGE = "Bitte ein Bild aus der Mediathek wählen.";

const MISSING_TEXT_ISSUE = "Der Text auf Deutsch fehlt.";
const MISSING_ALT_ISSUE = "Der Alternativtext auf Deutsch fehlt.";
const NO_IMAGE_ISSUE = "Es ist kein Bild aus der Mediathek ausgewählt.";
const BAD_COLOR_ISSUE = "Die Farbe ist kein gültiger Hex-Wert.";

/**
 * @param {*} value - The candidate.
 * @returns {boolean} Whether it is a `#rrggbb` value.
 */
export function isHeroHexColor(value) {
  return HEX_COLOR.test(String(value == null ? "" : value));
}

/**
 * The picker answers in the format it was given and appends alpha once it has
 * been touched; the contract knows `#rrggbb` only, everywhere it takes a
 * colour.
 *
 * @param {*} color - What the colour picker answered.
 * @returns {string} The same colour without its alpha channel.
 */
export function heroHexWithoutAlpha(color) {
  const value = typeof color === "string" ? color : "";

  return value.length > 7 && value.startsWith("#") ? value.slice(0, 7) : value;
}

/**
 * @param {*} value - The candidate.
 * @returns {boolean} Whether a text or rich-text Block may carry it as colour.
 */
export function isHeroColor(value) {
  return NAMED_COLORS.includes(value) || isHeroHexColor(value);
}

// What each type can be wrong about. A type this editor has no form for — only
// a hand-written layout produces one — is left alone rather than condemned.
const ISSUES_OF_TYPE = Object.freeze({
  text: textIssues,
  richtext: richtextIssues,
  image: imageIssues,
});

/**
 * Why the backend would refuse this Block, in the author's words. The row
 * shows the first of them on its badge and „Speichern“ stays disabled while
 * any Block has one.
 *
 * @param {Object} block - The Block as the Draft holds it.
 * @returns {string[]} The reasons, empty while the Block is fine.
 */
export function heroBlockIssues(block) {
  const issuesOf = block ? ISSUES_OF_TYPE[block.type] : null;

  return issuesOf ? issuesOf(block) : [];
}

/**
 * @param {Object} block - The Block as the Draft holds it.
 * @returns {boolean} Whether it would pass the backend.
 */
export function isHeroBlockValid(block) {
  return heroBlockIssues(block).length === 0;
}

/**
 * @param {Array} blocks - The Blocks as they stand.
 * @returns {string[]} The ids of the Blocks that carry an issue.
 */
export function invalidHeroBlockIds(blocks) {
  return (blocks || [])
    .filter((block) => !isHeroBlockValid(block))
    .map((block) => block.id);
}

/**
 * The rules of a localised text field — the text of a text Block and the alt
 * text of an image alike, which share the cap and the message. Required
 * marking is German only: an empty English text means „use the German one“
 * (hero layout spec §4).
 *
 * @param {string} locale - The locale the field edits.
 * @returns {Array<function(*): (true|string)>} The rules.
 */
export function heroTextRules(locale) {
  return [
    (value) => requiredInGerman(locale, String(value || "").trim()),
    (value) => withinLimit(value, HERO_TEXT_MAX_LENGTH),
  ];
}

/**
 * The rules of the rich-text editor. „Required“ asks for a line of text, not
 * for markup: an emptied editor answers `<p></p>`, which is a non-empty string
 * and nothing the author would call a text.
 *
 * @param {string} locale - The locale the editor edits.
 * @returns {Array<function(*): (true|string)>} The rules.
 */
export function heroRichtextRules(locale) {
  return [
    (value) => requiredInGerman(locale, heroHtmlFirstLine(value)),
    (value) => withinLimit(value, HERO_RICHTEXT_MAX_LENGTH),
  ];
}

/** The rules of a custom colour. */
export const heroHexRules = Object.freeze([
  (value) => isHeroHexColor(value) || HEX_MESSAGE,
]);

/**
 * The rules of a colour the author may also leave empty — the Background's
 * „Farbe im Dunkelmodus“, whose absence means „follow the light one“.
 */
export const heroOptionalHexRules = Object.freeze([
  (value) => !value || isHeroHexColor(value) || HEX_MESSAGE,
]);

/**
 * The rules of the image field. The contract knows one kind of image on a
 * Block: a medium of the library. An external address is refused here rather
 * than by the backend, which rejects `source: "external"` outright.
 */
export const heroImageRules = Object.freeze([
  (value) => isMediaReference(value) || NO_IMAGE_MESSAGE,
]);

/**
 * The first message a set of rules refuses a value with — what an input shows
 * under itself, for a field Vuetify does not run the rules for on its own.
 *
 * @param {Array<function(*): (true|string)>} rules - The rules to run.
 * @param {*} value - The value to run them against.
 * @returns {?string} The message, or null while every rule is happy.
 */
export function firstHeroRuleError(rules, value) {
  const refusal = rules
    .map((rule) => rule(value))
    .find((answer) => answer !== true);

  return refusal === undefined ? null : refusal;
}

function textIssues(block) {
  return [
    ...localizedIssues(block.text, {
      max: HERO_TEXT_MAX_LENGTH,
      missing: MISSING_TEXT_ISSUE,
      long: `Der Text ist länger als ${HERO_TEXT_MAX_LENGTH} Zeichen.`,
    }),
    ...colorIssues(block),
  ];
}

function richtextIssues(block) {
  return [
    ...localizedIssues(block.html, {
      max: HERO_RICHTEXT_MAX_LENGTH,
      textOf: heroHtmlFirstLine,
      missing: MISSING_TEXT_ISSUE,
      long: `Der Text ist länger als ${HERO_RICHTEXT_MAX_LENGTH} Zeichen.`,
    }),
    ...colorIssues(block),
  ];
}

function imageIssues(block) {
  const issues = isMediaReference(block.image) ? [] : [NO_IMAGE_ISSUE];

  return [
    ...issues,
    ...localizedIssues(block.alt, {
      max: HERO_TEXT_MAX_LENGTH,
      missing: MISSING_ALT_ISSUE,
      long: `Der Alternativtext ist länger als ${HERO_TEXT_MAX_LENGTH} Zeichen.`,
    }),
  ];
}

/**
 * The two things a localised string can be wrong about, in any locale. What
 * counts as „there“ differs by field: a plain text is its own text, a rich
 * text is the first line its markup carries.
 */
function localizedIssues(localized, { max, missing, long, textOf = plain }) {
  const issues = [];
  if (!textOf(heroLocalizedText(localized, "de")).trim()) {
    issues.push(missing);
  }
  if (localeValues(localized).some((value) => tooLong(value, max))) {
    issues.push(long);
  }

  return issues;
}

function plain(value) {
  return value;
}

/**
 * An absent `color` is legal — the contract's default is `default` and the
 * backend fills it on save. Only a value that is there and wrong is an issue.
 * An image Block has no colour at all and never reaches this.
 */
function colorIssues(block) {
  return block.color != null && !isHeroColor(block.color)
    ? [BAD_COLOR_ISSUE]
    : [];
}

/** German is the required locale; every other one may stay empty (§4). */
function requiredInGerman(locale, text) {
  return locale !== "de" || !!text || REQUIRED_MESSAGE;
}

function withinLimit(value, max) {
  return !tooLong(value, max) || `Höchstens ${max} Zeichen.`;
}

function tooLong(value, max) {
  return String(value || "").length > max;
}

function localeValues(localized) {
  return Object.values(localized || {}).filter(
    (value) => typeof value === "string"
  );
}
