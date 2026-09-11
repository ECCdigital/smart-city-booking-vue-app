/**
 * The instance catalog as the Portal tab saves it.
 *
 * The Hero Editor owns `catalog.heroLayout` and saves it through its own
 * route; the tab's global save must never carry it back, or a tab save after
 * an editor save would overwrite the stored layout with the stale copy the tab
 * loaded earlier (hero layout spec, "Stale-overwrite guard").
 */

/**
 * The catalog as it goes to the API, without the Hero Layout.
 *
 * @param {Object|null} catalog - The catalog held by the editor.
 * @returns {Object|null} The catalog as it goes out.
 */
export function catalogForSave(catalog) {
  if (!catalog) {
    return catalog;
  }

  const payload = { ...catalog };
  delete payload.heroLayout;

  return payload;
}
