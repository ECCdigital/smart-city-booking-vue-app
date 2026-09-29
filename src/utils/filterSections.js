/**
 * The sections of a filter card (`FilterCard`, behind the funnel of the
 * `SearchBar`). A section is one filter of a list:
 *
 *   {
 *     key: "status",
 *     label: "Status",
 *     options: [{ value, label, icon?, color? }],
 *     selected: [],        // the values picked; a single value if !multiple
 *     multiple: true,      // false: one option at most
 *     empty: null,         // !multiple: the value that restricts nothing
 *     segmented: false,    // !multiple: a segment switch instead of rows
 *   }
 *
 * The page owns `selected`; the card only shows it and raises the next one.
 */

/** Whether a section is a multiple choice; the default. */
export function isMultiple(section) {
  return section.multiple !== false;
}

/** The selection that restricts nothing: no value, or the section's `empty`. */
export function emptySelection(section) {
  if (isMultiple(section)) return [];
  return section.empty === undefined ? null : section.empty;
}

/** How many restrictions a section adds: one per value, or one for a pick. */
export function restrictionCount(section) {
  if (isMultiple(section)) return section.selected.length;
  return section.selected === emptySelection(section) ? 0 : 1;
}

/** How many restrictions the sections add up to - the number on the funnel. */
export function totalRestrictionCount(sections) {
  return sections.reduce((sum, section) => sum + restrictionCount(section), 0);
}
