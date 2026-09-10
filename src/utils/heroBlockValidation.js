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
 * Rich text and image Blocks pass everything for now — their form, and with it
 * their rules, arrives with ticket 07.
 */

import { heroLocalizedText } from "@/utils/heroBlocks";

/** The cap the contract puts on `text.text` and `image.alt`, per locale. */
export const HERO_TEXT_MAX_LENGTH = 200;

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
const MAX_LENGTH_MESSAGE = `Höchstens ${HERO_TEXT_MAX_LENGTH} Zeichen.`;
const HEX_MESSAGE = "Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c.";

const MISSING_TEXT_ISSUE = "Der Text auf Deutsch fehlt.";
const LONG_TEXT_ISSUE = `Der Text ist länger als ${HERO_TEXT_MAX_LENGTH} Zeichen.`;
const BAD_COLOR_ISSUE = "Die Farbe ist kein gültiger Hex-Wert.";

/**
 * @param {*} value - The candidate.
 * @returns {boolean} Whether it is a `#rrggbb` value.
 */
export function isHeroHexColor(value) {
  return HEX_COLOR.test(String(value == null ? "" : value));
}

/**
 * @param {*} value - The candidate.
 * @returns {boolean} Whether a text or rich-text Block may carry it as colour.
 */
export function isHeroColor(value) {
  return NAMED_COLORS.includes(value) || isHeroHexColor(value);
}

/**
 * Why the backend would refuse this Block, in the author's words. The row
 * shows the first of them on its badge and „Speichern“ stays disabled while
 * any Block has one.
 *
 * @param {Object} block - The Block as the Draft holds it.
 * @returns {string[]} The reasons, empty while the Block is fine.
 */
export function heroBlockIssues(block) {
  if (!block || block.type !== "text") {
    return [];
  }

  const issues = [];
  if (!heroLocalizedText(block.text, "de").trim()) {
    issues.push(MISSING_TEXT_ISSUE);
  }
  if (localeValues(block.text).some((text) => tooLong(text))) {
    issues.push(LONG_TEXT_ISSUE);
  }
  // An absent `color` is legal — the contract's default is `default` and the
  // backend fills it on save. Only a value that is there and wrong is an issue.
  if (block.color != null && !isHeroColor(block.color)) {
    issues.push(BAD_COLOR_ISSUE);
  }

  return issues;
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
 * The rules of a localised text field. Required marking is German only — an
 * empty English text means „use the German one“ (hero layout spec §4).
 *
 * @param {string} locale - The locale the field edits.
 * @returns {Array<function(*): (true|string)>} The rules.
 */
export function heroTextRules(locale) {
  return [
    (value) =>
      locale !== "de" || !!String(value || "").trim() || REQUIRED_MESSAGE,
    (value) => !tooLong(value) || MAX_LENGTH_MESSAGE,
  ];
}

/** The rules of a custom colour. */
export const heroHexRules = Object.freeze([
  (value) => isHeroHexColor(value) || HEX_MESSAGE,
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

function tooLong(value) {
  return String(value || "").length > HERO_TEXT_MAX_LENGTH;
}

function localeValues(localized) {
  return Object.values(localized || {}).filter(
    (value) => typeof value === "string"
  );
}
