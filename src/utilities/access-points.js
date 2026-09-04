import i18n from "@/language/index";

export const QR_SCAN_RULE = "qrScan";

const LOCKER_TYPE = "locker";
export const DOOR_TYPE = "door";

/**
 * What each access provider hands out, mirroring what its `listAccessPoints`
 * answers in the backend: Nuki and Salto KS list doors, iFBS and Pareva list
 * locker systems. The mode of a locker system follows from the provider as
 * well - iFBS opens a compartment remotely, Pareva hands out a code - which is
 * the table the fold migration used (`MODE_BY_PROVIDER`).
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
 * shared buffer from quietly going missing when access is switched on.
 *
 * @returns {Object} A fresh, empty access configuration
 */
export function defaultAccessPointDetails() {
  return {
    active: false,
    accessBuffer: { before: 0, after: 0 },
    accessPointIds: [],
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
