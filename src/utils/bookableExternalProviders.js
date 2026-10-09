/**
 * What an external provider takes over for a bookable.
 *
 * A bookable's `externalProviders` entry names a provider and the parts of the
 * bookable it owns in `handles` - `pricing`, `availability`, `maxAmount`. An
 * inactive entry owns nothing, so both are asked together and in one place:
 * the pricing tab and the access tab lock the same fields for the same reason,
 * and a screen that disagreed would let an admin overwrite a value the
 * provider reports.
 */

/** The only external provider the UI configures by name today. */
export const IFBS_PROVIDER = "ifbs";

/**
 * Whether an active provider entry takes over the given capability.
 *
 * @param {Object} provider One entry of `bookable.externalProviders`
 * @param {string} capability The handled part, e.g. `"maxAmount"`
 * @returns {boolean} True when the entry is active and handles it
 */
export function providerHandles(provider, capability) {
  return !!(
    provider?.active === true &&
    Array.isArray(provider.handles) &&
    provider.handles.includes(capability)
  );
}

/**
 * Whether any active provider of the bookable takes over the capability.
 *
 * @param {Object} bookable The bookable to inspect
 * @param {string} capability The handled part, e.g. `"maxAmount"`
 * @returns {boolean} True when at least one active entry handles it
 */
export function handlesCapability(bookable, capability) {
  return (bookable?.externalProviders || []).some((provider) =>
    providerHandles(provider, capability)
  );
}

/**
 * The assigned locker system of the provider: an access point of the tenant
 * (`accessPoints`) with `provider` ifbs among the ones Schließsysteme
 * assigns while switched on. Its `externalId` is the location the provider
 * prices and books against.
 *
 * @param {Object} bookable The bookable to inspect
 * @param {Array<Object>} [accessPoints] The tenant's access points
 * @returns {?Object} The access point, or `null`
 */
export function ifbsLockerOf(bookable, accessPoints = []) {
  const details = bookable?.accessPointDetails;
  if (details?.active !== true) return null;
  const ids = details.accessPointIds || [];
  return (
    accessPoints.find(
      (point) => point.provider === IFBS_PROVIDER && ids.includes(point.id)
    ) || null
  );
}

/**
 * Whether ParkraumService takes the capability away from the bookable: its
 * entry is on and handles it, and its locker system is assigned. Exactly
 * then its setting shows in Schließsysteme, where the note of the field
 * leads. A declaration without the locker system is stale and leaves the
 * field to the bookable, so no bookable is left without its own editor.
 *
 * @param {Object} bookable The bookable to inspect
 * @param {string} capability The handled part, e.g. `"pricing"`
 * @param {Array<Object>} [accessPoints] The tenant's access points; until
 *   they are known nothing is taken over
 * @returns {boolean}
 */
export function providerTakesOver(bookable, capability, accessPoints = []) {
  const entry = (bookable?.externalProviders || []).find(
    (provider) => provider?.provider === IFBS_PROVIDER
  );
  return (
    providerHandles(entry, capability) &&
    ifbsLockerOf(bookable, accessPoints) !== null
  );
}
