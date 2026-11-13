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
 * The providers that offer more than the one type they start with, in the
 * order the choice shows them, the starting type first.
 */
const PROVIDER_TYPES = {
  "open-locker": Object.freeze([LOCKER_TYPE, DOOR_TYPE]),
};

/**
 * The modes a door of the provider can be set to, where the provider rules
 * out the rest: Salto KS (the backend refuses the PIN modes, tickets#499) and
 * Open Locker open remotely or not at all.
 */
const PROVIDER_MODES = {
  "salto-ks": Object.freeze(["remote"]),
  "open-locker": Object.freeze(["remote"]),
};

/**
 * The providers whose new access points start without a QR scan - the
 * backend's `requiresScanByDefault`. An Open Locker Fach is opened from the
 * list, not in front of a sticker; the scan is switched on where it is
 * wanted - at a fixed Fach for that Fach, at a Schließfachanlage for all its
 * Fächer at once (ECCdigital/tickets#1060).
 */
const PROVIDERS_WITHOUT_SCAN_BY_DEFAULT = ["open-locker"];

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

/**
 * The types an admin chooses between for an access point of the provider:
 * several where the provider offers several (Open Locker), else the one it
 * hands out - none for a provider this UI knows nothing about.
 *
 * @param {string} provider A provider id, e.g. "open-locker"
 * @returns {string[]} The types, the one a new access point starts with first
 */
export function providerTypes(provider) {
  if (PROVIDER_TYPES[provider]) return [...PROVIDER_TYPES[provider]];
  const defaults = providerAccessPointDefaults(provider);
  return defaults ? [defaults.type] : [];
}

/**
 * The modes a door of the provider can be set to.
 *
 * @param {string} provider A provider id, e.g. "salto-ks"
 * @returns {string[]|null} The modes, or `null` where the provider rules
 *   none out
 */
export function providerModes(provider) {
  return PROVIDER_MODES[provider] || null;
}

/**
 * Whether a new access point of the provider demands a QR scan when it is
 * created without `validationRules` - what the server then sets. A provider
 * this UI does not know gets the server's schema default, the scan.
 *
 * @param {string} provider A provider id, e.g. "nuki" or "open-locker"
 * @returns {boolean}
 */
export function providerRequiresScanByDefault(provider) {
  return !PROVIDERS_WITHOUT_SCAN_BY_DEFAULT.includes(provider);
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
 * An Open Locker compartment is a door, but Open Locker knows it by its UUID
 * alone, so it shows that one field, „UUID des Fachs“, and no location. An
 * Open Locker Schließfachanlage carries its Fächer instead of an id of its
 * own, so it shows no id field at all (`idField: false`).
 *
 * `label`, `hint` and `placeholder` name keys under
 * `accessPoint.management.fields`; a `null` hint leaves the dialog's own hint
 * - the one by type - in place, a `null` placeholder leaves the field bare.
 * Only the Pareva product id has one, because a 24-hex id is nothing an admin
 * would guess the shape of.
 */
const DEFAULT_ID_FIELDS = Object.freeze({
  idField: true,
  label: "externalId",
  hint: null,
  placeholder: null,
  locationField: true,
});
const PROVIDER_ID_FIELDS = {
  ifbs: Object.freeze({
    idField: true,
    label: "locationId",
    hint: "locationIdHint",
    placeholder: null,
    locationField: false,
  }),
  pareva: Object.freeze({
    idField: true,
    label: "productId",
    hint: "productIdHint",
    placeholder: "productIdPlaceholder",
    locationField: false,
  }),
  "open-locker": Object.freeze({
    idField: true,
    label: "compartmentUuid",
    hint: "compartmentUuidHint",
    placeholder: null,
    locationField: false,
  }),
};

// Where the type changes the fields: by provider, then type.
const PROVIDER_TYPE_ID_FIELDS = {
  "open-locker": {
    [LOCKER_TYPE]: Object.freeze({
      idField: false,
      label: null,
      hint: null,
      placeholder: null,
      locationField: false,
    }),
  },
};

/**
 * Which id fields an access point of the provider and type shows.
 *
 * @param {string} provider A provider id, e.g. "nuki" or "ifbs"
 * @param {string} [type] The access point's type, where it matters
 * @returns {{idField: boolean, label: string|null, hint: string|null, placeholder: string|null, locationField: boolean}}
 *   Whether the `externalId` field is shown, the translation key of its
 *   label, that of its hint (or `null` for the hint by type), that of its
 *   placeholder (or `null` for none), and whether the `providerLocationId`
 *   field is shown
 */
export function providerIdFields(provider, type) {
  return (
    PROVIDER_TYPE_ID_FIELDS[provider]?.[type] ||
    PROVIDER_ID_FIELDS[provider] ||
    DEFAULT_ID_FIELDS
  );
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
