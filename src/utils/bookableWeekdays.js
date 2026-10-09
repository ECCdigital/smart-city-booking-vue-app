/** Weekday ids as the backend stores them, Monday first; Sunday is 0. */
const WEEKDAY_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 0]);

/**
 * The weekdays as the editing components offer them: `{ id, name, short }`,
 * named by the catalogue (`bookable.edit.weekdays.<id>`, the short name
 * `bookable.edit.weekdays-short.<id>`). `translate(key)` is the component's
 * `$t`.
 */
export function weekdayItems(translate) {
  return WEEKDAY_IDS.map((id) => ({
    id,
    name: translate(`bookable.edit.weekdays.${id}`),
    short: translate(`bookable.edit.weekdays-short.${id}`),
  }));
}
