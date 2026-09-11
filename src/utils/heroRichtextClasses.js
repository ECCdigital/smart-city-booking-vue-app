/**
 * The class vocabulary a run of words and a paragraph may carry inside a
 * rich-text Block (hero layout spec, „Rich-text allowlist“).
 *
 * This is the **third copy** of the lists: the backend's sanitiser holds one
 * and the storefront's the other, and those two are the security boundary.
 * What lives here decides only what an author still sees after loading — the
 * editor's `parseHTML` rules read these tokens and its `renderHTML` rules
 * write them. Its own test pins the lists against the contract's values so a
 * token cannot be added on one side only.
 */

import { HERO_COLOR_TOKENS, isHeroHexColor } from "@/utils/heroBlockValidation";

/** The six steps of the scale, from „Sehr klein“ to „Riesig“. */
export const HERO_SIZE_TOKENS = Object.freeze([
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
]);

/**
 * The three alignments a paragraph can be given. There is no `auto` — that is
 * the absence of the class, which the admin calls „Übernehmen“.
 */
export const HERO_ALIGN_TOKENS = Object.freeze(["left", "center", "right"]);

/**
 * The first token of a kind a class attribute carries, in document order.
 *
 * Two competing classes are the hand-forged case the contract's class pass
 * decides the same way: the first wins, the rest are dropped. Anything off the
 * list — `hero-`-prefixed or not — is not a token at all.
 *
 * @param {Element} element - The element whose `class` is read.
 * @param {string} prefix - `hero-size-` or `hero-align-`.
 * @param {ReadonlyArray<string>} tokens - The vocabulary of that kind.
 * @returns {?string} The token, or `null` for „Übernehmen“.
 */
function firstClassToken(element, prefix, tokens) {
  const names = String(element.getAttribute("class") || "").split(/\s+/);

  for (const name of names) {
    const token = name.startsWith(prefix) ? name.slice(prefix.length) : null;
    if (token !== null && tokens.includes(token)) return token;
  }
  return null;
}

/**
 * @param {string} token - One of `HERO_SIZE_TOKENS`.
 * @returns {string} The class a run of words of that size carries.
 */
export function heroSizeClass(token) {
  return `hero-size-${token}`;
}

/**
 * @param {Element} element - A `span` the editor is loading.
 * @returns {?string} Its size token, or `null` for „Übernehmen“.
 */
export function heroSizeOf(element) {
  return firstClassToken(element, "hero-size-", HERO_SIZE_TOKENS);
}

/**
 * @param {string} token - One of `HERO_COLOR_TOKENS`.
 * @returns {string} The class a run of words of that colour carries.
 */
export function heroColorClass(token) {
  return `hero-color-${token}`;
}

/**
 * The colour of a run of words: a token, or the `#rrggbb` of a custom one.
 * Both live in one attribute, because a word cannot be both.
 *
 * A token beats a `data-color` — no editor writes the two together, so the
 * input is hand-forged, and the ambiguous case leads away from the attribute
 * that later becomes paint. A `data-color` that is not `#rrggbb` is dropped.
 *
 * @param {Element} element - A `span` the editor is loading.
 * @returns {?string} The token or the hex, or `null` for „Übernehmen“.
 */
export function heroColorOf(element) {
  const token = firstClassToken(element, "hero-color-", HERO_COLOR_TOKENS);
  if (token) return token;

  const custom = String(element.getAttribute("data-color") || "");
  return isHeroHexColor(custom) ? custom.toLowerCase() : null;
}

/**
 * What a custom colour renders as. The `style` is the admin's alone, so that
 * the colour is visible while typing; the backend drops it on save and the
 * storefront rebuilds it from `data-color` at render.
 *
 * @param {string} color - A token or a `#rrggbb` value.
 * @returns {Object} The attributes the span carries.
 */
export function heroColorAttributes(color) {
  if (HERO_COLOR_TOKENS.includes(color))
    return { class: heroColorClass(color) };

  return { "data-color": color, style: `color:${color}` };
}

/**
 * @param {string} token - One of `HERO_ALIGN_TOKENS`.
 * @returns {string} The class a paragraph of that alignment carries.
 */
export function heroAlignClass(token) {
  return `hero-align-${token}`;
}

/**
 * @param {Element} element - A `p` the editor is loading.
 * @returns {?string} Its alignment, or `null` for „Übernehmen“.
 */
export function heroAlignOf(element) {
  return firstClassToken(element, "hero-align-", HERO_ALIGN_TOKENS);
}
