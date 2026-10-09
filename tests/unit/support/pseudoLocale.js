import i18n from "@/language/index";
import de from "@/language/de/translations.json";
import vuetifyEn from "vuetify/lib/locale/en";

/*
 * A pseudo locale: the German catalogue with every text marked, ‹so›. Under
 * it, every text a component takes from the catalogue reads marked, and a
 * text built into the component does not - `unmarkedTexts` finds those.
 */

export const PSEUDO_LOCALE = "pseudo";

/** Each branch of a plural („a | b“) is marked on its own. */
function mark(message) {
  return message
    .split("|")
    .map((branch) => {
      const trimmed = branch.trim();
      return branch.replace(trimmed, trimmed ? `‹${trimmed}›` : "");
    })
    .join("|");
}

function pseudo(messages) {
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [
      key,
      typeof value === "string" ? mark(value) : pseudo(value),
    ])
  );
}

/** Renders from the pseudo locale until `usePseudoLocale.restore()`. */
export function usePseudoLocale() {
  if (!i18n.availableLocales.includes(PSEUDO_LOCALE)) {
    i18n.setLocaleMessage(PSEUDO_LOCALE, pseudo(de));
  }
  i18n.locale = PSEUDO_LOCALE;
}

export function restoreLocale() {
  i18n.locale = "de";
}

const ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"];

const flatValues = (messages) =>
  Object.values(messages).flatMap((value) =>
    typeof value === "string" ? [value] : flatValues(value)
  );

/** Vuetify's own labels (its locale, its icons): the framework's, not ours. */
const VUETIFY_LABELS = new Set(flatValues(vuetifyEn));
const vuetifyLabel = (value) =>
  VUETIFY_LABELS.has(value) || /^[a-z-]+ icon$/.test(value);

/** The text without its marks; a mark may hold marks (a word as param). */
function withoutMarks(text) {
  let rest = text;
  let previous;
  do {
    previous = rest;
    rest = rest.replace(/‹[^‹›]*›/g, "");
  } while (rest !== previous);
  return rest;
}

const hasLetter = (text) => /\p{L}/u.test(text);

/**
 * The texts under `element` - its text and the attributes people read - that
 * carry a letter outside the marks of the pseudo locale. The text nodes are
 * read in a row, so a catalogue text with markup (`v-html`) stays one mark.
 */
export function unmarkedTexts(element) {
  const nodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node.textContent.trim());
  }
  const found = withoutMarks(nodes.filter(Boolean).join("\n"))
    .split("\n")
    .map((text) => text.trim())
    .filter(hasLetter);
  element.querySelectorAll("*").forEach((el) => {
    ATTRIBUTES.forEach((name) => {
      const value = el.getAttribute(name);
      if (value && hasLetter(withoutMarks(value)) && !vuetifyLabel(value)) {
        found.push(`[${name}] ${value}`);
      }
    });
  });
  return [...new Set(found)];
}
