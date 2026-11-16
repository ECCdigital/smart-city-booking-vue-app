import i18n from "@/language/index";

export const QR_SCAN_RULE = "qrScan";

export const LOCKER_TYPE = "locker";
export const DOOR_TYPE = "door";

/**
 * What each access provider hands out: Nuki and Salto KS doors, iFBS and
 * Pareva locker systems. The mode of a locker system follows from the
 * provider as well - iFBS opens a compartment remotely, Pareva hands out a
 * code - which is the table the fold migration used (`MODE_BY_PROVIDER`).
 * Open Locker hands out both, each opened remotely and in no other way: a
 * Schließfachanlage that carries its own Fächer, which the platform assigns -
 * the type a new one starts with - and a fixed Fach, a door
 * (ECCdigital/tickets#1037). Whether the provider also lists them is a
 * capability of its own, see `canListAccessPoints`.
 *
 * A provider outside this table says nothing about the type; the access point
 * keeps the one it has.
 */
const PROVIDER_ACCESS_POINTS = {
  nuki: { type: DOOR_TYPE },
  "salto-ks": { type: DOOR_TYPE },
  "open-locker": { type: LOCKER_TYPE, mode: "remote" },
  ifbs: { type: LOCKER_TYPE, mode: "remote" },
  pareva: { type: LOCKER_TYPE, mode: "authorization" },
};

/**
 * What a provider's access points are, as far as the provider decides it.
 *
 * @param {string} provider A provider id, e.g. "nuki" or "ifbs"
 * @returns {{type: string, mode?: string}|null} The type the provider hands
 *   out and the mode it works in where the provider settles it - or `null`
 *   for a provider this UI knows nothing about
 */
export function providerAccessPointDefaults(provider) {
  return PROVIDER_ACCESS_POINTS[provider] || null;
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
 * `listAccessPoints` capability. Nuki, Salto KS, Open Locker and iFBS do -
 * Open Locker the compartments the tenant's technical account holds a
 * permission on, named by locker bank and number; Pareva does
 * not, because what it could list are size codes, not the products a Pareva
 * Anlage stands for. The dialog Zugangspunkt offers the listing only for
 * providers that do; the others are entered by hand.
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
 * Whether the access point is a fixed Fach: an Open Locker compartment that
 * is an access point of its own, a door by type, without an Anlage around
 * it (`accessPointTypeName` "compartment").
 *
 * @param {Object} accessPoint The access point to inspect
 * @returns {boolean}
 */
export function isFixedCompartment(accessPoint) {
  return accessPointTypeName(accessPoint) === "compartment";
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
 * What a type is called where the provider calls it something of its own
 * (ECCdigital/tickets#1036): an Open Locker door is a compartment on site, so
 * it is a „Fach“, never a „Tür“, and its locker is the „Schließfachanlage“
 * whose Fächer the platform assigns (ECCdigital/tickets#1037). The doors of
 * Nuki and Salto KS and the Anlagen of iFBS and Pareva keep the name of their
 * type. The values name keys under `accessPoint.management.types` and
 * `accessPoint.bookable.grants`.
 *
 * A provider that calls a type differently is one entry here, plus its copy.
 */
const PROVIDER_TYPE_NAMES = {
  "open-locker": Object.freeze({
    [DOOR_TYPE]: "compartment",
    [LOCKER_TYPE]: "lockerSystem",
  }),
};

/**
 * What the type of an access point is called, as the key the copy is filed
 * under: the provider's own name for the type where it has one, else the type.
 *
 * @param {Object} accessPoint The access point to inspect, with `provider`
 *   and `type`
 * @returns {string} The key of the type's name, e.g. "door", "locker" or
 *   "compartment" - "" without a type
 */
export function accessPointTypeName(accessPoint) {
  const type = accessPoint?.type;
  if (!type) return "";
  return PROVIDER_TYPE_NAMES[accessPoint.provider]?.[type] || type;
}

/**
 * What to call the kind of an access point on screen - by provider and type,
 * see `accessPointTypeName`. An unknown type yields an empty string rather
 * than a raw key, because the kind is decoration next to the label, not
 * information worth garbling.
 *
 * @param {Object} accessPoint The access point to inspect
 * @returns {string} A translated type name, or "" when the type is unknown
 */
export function accessPointTypeLabel(accessPoint) {
  const key = `accessPoint.management.types.${accessPointTypeName(
    accessPoint
  )}`;
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
