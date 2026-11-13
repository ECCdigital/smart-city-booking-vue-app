import i18n from "@/language/index";
import {
  DOOR_TYPE,
  LOCKER_TYPE,
  providerAccessPointDefaults,
} from "@/utilities/access-points";

/**
 * Which fields the dialog Zugangspunkt shows, by provider and type - the one
 * place for it (ECCdigital/tickets#1109). The section settles the provider,
 * and with it the type; only Open Locker asks for one, its
 * Schließfachanlage or a fixed Fach. The table follows the spec of
 * ECCdigital/tickets#1082:
 *
 * |                         | Listing         | By hand | Choice | Öffnungsart | QR scan        | Standort-ID |
 * | ----------------------- | --------------- | ------- | ------ | ----------- | -------------- | ----------- |
 * | Nuki (door)             | yes             | yes     | -      | yes         | yes            | yes         |
 * | Salto KS (door)         | yes             | yes     | -      | -           | yes            | yes         |
 * | Pareva (Anlage)         | -               | only    | -      | -           | -              | -           |
 * | iFBS (Anlage)           | yes             | yes     | -      | -           | -              | -           |
 * | Open Locker             | Fächer to tick  | -       | yes    | -           | Anlage only    | -           |
 *
 * A provider the table does not know is treated as a door with every field.
 */

// What the dialog calls what it creates; keys under
// `accessPoint.management.dialog.kinds`.
export const DOOR_KIND = "door";
export const LOCKER_SYSTEM_KIND = "lockerSystem";
export const FIXED_COMPARTMENT_KIND = "fixedCompartment";

const DOOR_FIELDS = Object.freeze({
  kind: DOOR_KIND,
  // The provider lists what can be taken over (`listAccessPoints`).
  listing: true,
  // The last line of the listing enters one by hand; without a listing the
  // id field is all there is.
  manual: true,
  // Open Locker's Schließfachanlage: its Fächer ticked in the listing.
  compartments: false,
  // The Modus line: everything but Pareva opens per App.
  mode: true,
  openAction: false,
  qrScan: true,
  // What the server sets for a new access point left untouched.
  qrScanDefault: true,
  // The access point has a QR code to print.
  qrCode: true,
  providerLocationId: true,
  // Salto KS: a lock whose IQ is not activated opens only once it is.
  iq: false,
  // The id field, as keys under `accessPoint.management.fields`.
  idLabel: "externalId",
  idHint: "externalIdHint",
  idPlaceholder: null,
});

const LOCKER_FIELDS = Object.freeze({
  ...DOOR_FIELDS,
  kind: LOCKER_SYSTEM_KIND,
  qrScan: false,
  qrCode: false,
  providerLocationId: false,
  idHint: "externalIdHintLocker",
});

const FIELDS = {
  nuki: { [DOOR_TYPE]: { ...DOOR_FIELDS, openAction: true } },
  "salto-ks": { [DOOR_TYPE]: { ...DOOR_FIELDS, iq: true } },
  pareva: {
    [LOCKER_TYPE]: {
      ...LOCKER_FIELDS,
      listing: false,
      mode: false,
      idLabel: "productId",
      idHint: "productIdHint",
      idPlaceholder: "productIdPlaceholder",
    },
  },
  ifbs: {
    [LOCKER_TYPE]: {
      ...LOCKER_FIELDS,
      idLabel: "locationId",
      idHint: "locationIdHint",
    },
  },
  "open-locker": {
    [LOCKER_TYPE]: {
      ...LOCKER_FIELDS,
      manual: false,
      compartments: true,
      qrScan: true,
      qrScanDefault: false,
      qrCode: true,
      idLabel: null,
      idHint: null,
    },
    [DOOR_TYPE]: {
      ...DOOR_FIELDS,
      kind: FIXED_COMPARTMENT_KIND,
      manual: false,
      qrScan: false,
      qrScanDefault: false,
      providerLocationId: false,
      idLabel: "compartmentUuid",
      idHint: "compartmentUuidHint",
    },
  },
};

/**
 * The types an admin chooses between for a new access point of the
 * provider, the one it starts as first: Open Locker its Schließfachanlage
 * and a fixed Fach, every other provider the one type it hands out.
 *
 * @param {string} provider A provider id, e.g. "open-locker"
 * @returns {string[]}
 */
export function accessPointTypes(provider) {
  if (FIELDS[provider]) return Object.keys(FIELDS[provider]);
  return [providerAccessPointDefaults(provider)?.type || DOOR_TYPE];
}

/**
 * The fields an access point of the provider and type shows.
 *
 * @param {string} provider A provider id, e.g. "nuki"
 * @param {string} [type] The access point's type; the provider's first by
 *   default
 * @returns {Object} The fields, see `DOOR_FIELDS`
 */
export function accessPointFields(provider, type) {
  const settled = type || accessPointTypes(provider)[0];
  const known = FIELDS[provider]?.[settled];
  if (known) return known;
  return settled === LOCKER_TYPE ? LOCKER_FIELDS : DOOR_FIELDS;
}

/**
 * The kind of an access point, by its provider and type: `door`,
 * `lockerSystem` or `fixedCompartment` (`DOOR_KIND`, …).
 *
 * @param {Object} accessPoint The access point, with `provider` and `type`
 * @returns {string}
 */
export function accessPointKind(accessPoint) {
  return accessPointFields(accessPoint?.provider, accessPoint?.type).kind;
}

/**
 * What the kind of an access point is called: „Tür“, „Schließfachanlage“ or
 * „Fach“.
 *
 * @param {Object} accessPoint The access point
 * @returns {string} A translated noun
 */
export function kindNoun(accessPoint) {
  return i18n.t(
    `accessPoint.management.dialog.kinds.${accessPointKind(accessPoint)}.noun`
  );
}

/**
 * What a location says in one line: its address, else that a point is set,
 * else that there is none.
 *
 * @param {*} location The location in the stored form
 * @returns {string}
 */
function locationText(location) {
  if (typeof location === "string" && location.trim()) return location.trim();
  if (location && typeof location === "object") {
    if (location.display_address) return location.display_address;
    if (location.coordinates) {
      return i18n.t("accessPoint.management.dialog.summary.point");
    }
  }
  return i18n.t("accessPoint.management.dialog.summary.noLocation");
}

/**
 * „Weitere Einstellungen“ folded, as one line: „Öffnen per App ·
 * Öffnungsart Automatisch · QR-Scan erforderlich · kein Standort“ - each part
 * only where the access point has the field.
 *
 * @param {Object} fields The access point's fields (`accessPointFields`)
 * @param {Object} settings
 * @param {string} settings.mode The Modus, e.g. "remote"
 * @param {string} settings.openAction The Öffnungsart, e.g. "auto"
 * @param {boolean} settings.qrScan Whether a QR scan is required
 * @param {*} settings.location The location in the stored form
 * @returns {string}
 */
export function settingsSummary(
  fields,
  { mode, openAction, qrScan, location }
) {
  const t = (key, params) =>
    i18n.t(`accessPoint.management.dialog.summary.${key}`, params);
  const parts = [];
  if (fields.mode) parts.push(i18n.t(`accessPoint.management.modes.${mode}`));
  if (fields.openAction) {
    const key = `accessPoint.management.openActions.${openAction}`;
    parts.push(t("openAction", { name: i18n.te(key) ? i18n.t(key) : "" }));
  }
  if (fields.qrScan) parts.push(t(qrScan ? "qrScan" : "noQrScan"));
  parts.push(locationText(location));
  return parts.join(" · ");
}
