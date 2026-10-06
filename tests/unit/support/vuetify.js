/**
 * Shared ways of driving Vuetify inputs from a spec, so that "picks a step"
 * and "flips a switch" mean the same thing everywhere.
 *
 * Every helper takes a **root** to search under: a mounted wrapper, or any
 * wrapper inside it — a form with two „Höhe“ selects and two „Muster“ selects
 * scopes the search to the section it means.
 */

import Vue from "vue";
import { flushPromises } from "@tests/unit/support/api";

/**
 * The button whose label reads exactly this, or `undefined` — an action that
 * is not offered is a thing a spec asserts about.
 *
 * @param {Object} root - The wrapper to search under.
 * @param {string} label - The label as the user reads it.
 * @returns {?Object} The button's wrapper.
 */
export function button(root, label) {
  return root
    .findAll("button")
    .wrappers.find((entry) => entry.text().trim() === label);
}

/**
 * @param {Object} root - The wrapper to search under.
 * @param {string} label - The field label as the user reads it.
 * @returns {Object} The select's wrapper.
 */
export function selectByLabel(root, label) {
  const select = root
    .findAllComponents({ name: "v-select" })
    .wrappers.find((entry) => entry.props("label") === label);
  if (!select) {
    throw new Error(`Das Feld „${label}“ fehlt.`);
  }
  return select;
}

/**
 * Picks an option the way a user does: open the select, click the step. The
 * menu detaches into the `data-app` container, so the item is read off the
 * document.
 *
 * @param {Object} root - The wrapper to search under.
 * @param {string} label - The field label as the user reads it.
 * @param {string} option - The option as the user reads it.
 */
export async function chooseOption(root, label, option) {
  await selectByLabel(root, label).find(".v-input__slot").trigger("click");
  await Vue.nextTick();
  await flushPromises();

  const item = Array.from(
    document.querySelectorAll(".menuable__content__active .v-list-item")
  ).find((el) => el.textContent.trim() === option);
  if (!item) {
    throw new Error(`Der Schritt „${option}“ steht nicht zur Wahl.`);
  }
  item.click();
  await Vue.nextTick();
  await flushPromises();
}

/**
 * @param {Object} root - The wrapper to search under.
 * @param {string} label - The switch label as the user reads it.
 * @returns {Object} The switch's wrapper.
 */
export function switchByLabel(root, label) {
  const entry = root
    .findAllComponents({ name: "v-switch" })
    .wrappers.find((candidate) => candidate.props("label") === label);
  if (!entry) {
    throw new Error(`Der Schalter „${label}“ fehlt.`);
  }
  return entry;
}

/**
 * @param {Object} root - The wrapper to search under.
 * @param {string} label - The switch label as the user reads it.
 */
export async function toggleSwitch(root, label) {
  await switchByLabel(root, label).find("input").trigger("click");
  await Vue.nextTick();
}
