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

/**
 * Whether a tenant is played out in the catalog. The catalog names only the
 * excluded ones; a tenant it does not name is in it, and so is every tenant
 * while no catalog is stored.
 *
 * @param {Object|null} catalog
 * @param {string} tenantId
 * @returns {boolean}
 */
export function isTenantInCatalog(catalog, tenantId) {
  const excluded = Array.isArray(catalog?.excludedTenantIds)
    ? catalog.excludedTenantIds
    : [];
  return !excluded.includes(tenantId);
}

/**
 * The catalog with one tenant put into or taken out of it - a new object,
 * the one handed in untouched. Putting a tenant in that already is, or taking
 * one out that already is out, changes nothing.
 *
 * @param {Object|null} catalog
 * @param {string} tenantId
 * @param {boolean} inCatalog
 * @returns {Object}
 */
export function withTenantInCatalog(catalog, tenantId, inCatalog) {
  const excluded = Array.isArray(catalog?.excludedTenantIds)
    ? catalog.excludedTenantIds.filter((id) => id !== tenantId)
    : [];
  return {
    ...(catalog || {}),
    excludedTenantIds: inCatalog ? excluded : [...excluded, tenantId],
  };
}
