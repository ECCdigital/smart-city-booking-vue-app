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
