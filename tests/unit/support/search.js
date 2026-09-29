import { vi } from "vitest";
import Vue from "vue";

/** The pause after the last keystroke before a `SearchBar` searches. */
export const SEARCH_PAUSE_MS = 300;

/**
 * Types `text` into the input of a `SearchBar` and lets its pause pass, so
 * the page searches as it does after the user stops typing. The timers are
 * fake only for the keystroke, so `flushPromises` keeps working around it.
 */
export async function typeSearch(input, text) {
  vi.useFakeTimers();
  try {
    await input.setValue(text);
    vi.advanceTimersByTime(SEARCH_PAUSE_MS);
  } finally {
    vi.useRealTimers();
  }
  await Vue.nextTick();
}

/** The filter card behind the funnel, once open (it detaches into `data-app`). */
export function filterCard() {
  return document.querySelector(".v-menu__content .scb-filter-card");
}

/** Opens the filter card behind the funnel of the page's `SearchBar`. */
export async function openFilterCard(wrapper) {
  await wrapper.find("[data-test='search-filter']").trigger("click");
  await Vue.nextTick();
  return filterCard();
}

/** The labels of the open filter card's option rows, top to bottom. */
export function filterOptionLabels() {
  return Array.from(
    filterCard().querySelectorAll("[data-test='filter-row']")
  ).map((row) => row.textContent.trim());
}

/** Clicks the option row or segment labelled `label` in the open card. */
export async function pickFilterOption(label) {
  const option = Array.from(
    filterCard().querySelectorAll(
      "[data-test='filter-row'], [data-test='filter-segment']"
    )
  ).find((candidate) => candidate.textContent.trim() === label);
  if (!option) throw new Error(`No filter option „${label}“ in the card`);
  option.click();
  await Vue.nextTick();
}
