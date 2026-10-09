import i18n from "@/language/index";

/*
 * Specs run on the real German catalogue. A key it lacks would render as the
 * key itself; instead it is recorded here, and the global `afterEach` of
 * tests/unit/setup.js fails the spec that asked for it.
 */

let missing = [];

i18n.missing = (locale, key) => {
  missing.push(key);
};

/** The keys asked for and missing since the last call, in order. */
export function takeMissingKeys() {
  const keys = missing;
  missing = [];
  return keys;
}
