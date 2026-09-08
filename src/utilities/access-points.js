import i18n from "@/language/index";

export const QR_SCAN_RULE = "qrScan";

export const LOCKER_TYPE = "locker";
export const DOOR_TYPE = "door";

/**
 * What each access provider hands out: Nuki and Salto KS doors, iFBS and
 * Pareva locker systems. The mode of a locker system follows from the
 * provider as well - iFBS opens a compartment remotely, Pareva hands out a
 * code - which is the table the fold migration used (`MODE_BY_PROVIDER`).
 * Whether the provider also lists them is a capability of its own, see
 * `canListAccessPoints`.
 *
 * A provider outside this table says nothing about the type; the access point
 * keeps the one it has.
 */
const PROVIDER_ACCESS_POINTS = {
  nuki: { type: DOOR_TYPE },
  "salto-ks": { type: DOOR_TYPE },
  ifbs: { type: LOCKER_TYPE, mode: "remote" },
  pareva: { type: LOCKER_TYPE, mode: "authorization" },
};

/**
 * What a provider's access points are, as far as the provider decides it.
 *
 * @param {string} provider A provider id, e.g. "nuki" or "ifbs"
 * @returns {{type: string, mode?: string}|null} The type the provider hands
 *   out and, for a locker system, the mode it works in - or `null` for a
 *   provider this UI knows nothing about
 */
export function providerAccessPointDefaults(provider) {
  return PROVIDER_ACCESS_POINTS[provider] || null;
}

/**
 * The id fields the dialog shows for an access point, by provider. A door
 * carries two - the id at the provider and, informative, the account or site
 * it lives in (`providerLocationId`) - and so does an access point of a
 * provider this table does not know. A locker system of iFBS or Pareva carries
 * one, because its provider knows only one: iFBS the `LocationID` of the
 * location, Pareva the product id - a Pareva Anlage is a Pareva product, and
 * the id is the product's 24-hex id from Pareva's administration - both stored
 * in `externalId`. `providerLocationId` is read by no provider and stays out
 * of sight for them.
 *
 * `label`, `hint` and `placeholder` name keys under
 * `accessPoint.management.fields`; a `null` hint leaves the dialog's own hint
 * - the one by type - in place, a `null` placeholder leaves the field bare.
 * Only the Pareva product id has one, because a 24-hex id is nothing an admin
 * would guess the shape of.
 */
const DEFAULT_ID_FIELDS = Object.freeze({
  label: "externalId",
  hint: null,
  placeholder: null,
  locationField: true,
});
const PROVIDER_ID_FIELDS = {
  ifbs: Object.freeze({
    label: "locationId",
    hint: "locationIdHint",
    placeholder: null,
    locationField: false,
  }),
  pareva: Object.freeze({
    label: "productId",
    hint: "productIdHint",
    placeholder: "productIdPlaceholder",
    locationField: false,
  }),
};

/**
 * Which id fields an access point of the provider shows.
 *
 * @param {string} provider A provider id, e.g. "nuki" or "ifbs"
 * @returns {{label: string, hint: string|null, placeholder: string|null, locationField: boolean}}
 *   The translation key of the `externalId` label, that of its hint (or
 *   `null` for the hint by type), that of its placeholder (or `null` for
 *   none), and whether the `providerLocationId` field is shown
 */
export function providerIdFields(provider) {
  return PROVIDER_ID_FIELDS[provider] || DEFAULT_ID_FIELDS;
}

const LIST_ACCESS_POINTS_CAPABILITY = "listAccessPoints";

/**
 * Whether the provider reports a capability - one of the provider actions
 * the backend lists per active provider in `providerCapabilities`.
 *
 * @param {Object} provider A provider as `getProviders` reports it
 * @param {string} capability A capability name, e.g. "listAccessPoints"
 * @returns {boolean} True when the provider reports it
 */
export function hasProviderCapability(provider, capability) {
  return !!provider?.providerCapabilities?.includes(capability);
}

/**
 * Whether the provider lists access points to take over - the backend's
 * `listAccessPoints` capability. Nuki, Salto KS and iFBS do; Pareva does
 * not, because what it could list are size codes, not the products a Pareva
 * Anlage stands for. The picker offers only providers that do; the others
 * are entered by hand.
 *
 * @param {Object} provider A provider as `getProviders` reports it
 * @returns {boolean} True when the provider lists access points
 */
export function canListAccessPoints(provider) {
  return hasProviderCapability(provider, LIST_ACCESS_POINTS_CAPABILITY);
}

/**
 * Whether the access point is a locker system rather than a door.
 *
 * @param {Object} accessPoint The access point to inspect
 * @returns {boolean} True for `type: "locker"`
 */
export function isLockerAccessPoint(accessPoint) {
  return accessPoint?.type === LOCKER_TYPE;
}

/**
 * The `accessPointDetails` a bookable starts out with. Everything that reads
 * the block tolerates missing keys, but writing it from one place keeps the
 * shared buffer - and the compartments distributed over the locker systems -
 * from quietly going missing when access is switched on.
 *
 * @returns {Object} A fresh, empty access configuration
 */
export function defaultAccessPointDetails() {
  return {
    active: false,
    accessBuffer: { before: 0, after: 0 },
    accessPointIds: [],
    accessPointAmounts: {},
  };
}

/**
 * What to call the kind of an access point on screen - a door or a locker.
 * An unknown type yields an empty string rather than a raw key, because the
 * kind is decoration next to the label, not information worth garbling.
 *
 * @param {Object} accessPoint The access point to inspect
 * @returns {string} A translated type name, or "" when the type is unknown
 */
export function accessPointTypeLabel(accessPoint) {
  const key = `accessPoint.management.types.${accessPoint?.type}`;
  return i18n.te(key) ? i18n.t(key) : "";
}

/**
 * What to call an access point - or a provider lock - on screen: its label,
 * and where it has none the ids that do identify it.
 *
 * @param {Object} accessPoint An access point or a lock listed by a provider
 * @returns {string} A name to display, never `undefined`
 */
export function accessPointLabel(accessPoint) {
  if (!accessPoint) return "";
  return accessPoint.label || accessPoint.externalId || accessPoint.id || "";
}

/**
 * Whether the access point may only be opened after its QR code was scanned.
 *
 * @param {Object} accessPoint The access point to inspect
 * @returns {boolean} True when a `qrScan` rule is configured
 */
export function requiresQrScan(accessPoint) {
  return (accessPoint?.validationRules || []).some(
    (rule) => rule.type === QR_SCAN_RULE
  );
}
