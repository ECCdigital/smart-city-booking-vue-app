import i18n from "@/language/index";
import { accessPointFields } from "@/utilities/access-point-fields";
import {
  DOOR_TYPE,
  isLockerAccessPoint,
  requiresQrScan,
} from "@/utilities/access-points";
import { carriesOwnCompartments } from "@/utilities/locker-system-compartments";

/**
 * What the row of an access point on the Zugangspunkte page shows and offers
 * (ECCdigital/tickets#1108), one function per question and each asked of one
 * access point: its kind and the small line under its label, the markers
 * where it differs from its provider's standard, the entries of its menu
 * „…“, whether it matches a search and whether something is still to do.
 * The row and the page both ask here, so the page counts what the rows show.
 *
 * `bookables` is what the page knows of the bookables the access point is
 * assigned to: a list, or `null` where the bookables were not readable.
 * `listing` is what its provider lists (`listAccessPoints`), read behind the
 * page (ECCdigital/tickets#1107): a list, or `null` while it is not read or
 * could not be, so nothing is said of it.
 */

const t = (key, params) => i18n.t(`accessPoint.management.row.${key}`, params);
const tc = (key, count) =>
  i18n.tc(`accessPoint.management.row.${key}`, count, { count });

/** An Open Locker door is a single Fach, without an Anlage around it. */
export function isFixedCompartment(accessPoint) {
  return (
    accessPoint?.provider === "open-locker" && accessPoint?.type === DOOR_TYPE
  );
}

/**
 * The kind of the access point as the small line names it: „Schließfachanlage
 * · 12 Fächer“, „Schließfachanlage“ or „festes Fach“; empty for a door, whose
 * kind the section already says.
 *
 * @param {Object} accessPoint The access point
 * @returns {string}
 */
export function kindLabel(accessPoint) {
  if (isFixedCompartment(accessPoint)) return t("kind.fixedCompartment");
  if (!isLockerAccessPoint(accessPoint)) return "";
  if (!carriesOwnCompartments(accessPoint)) return t("kind.lockerSystem");
  return [
    t("kind.lockerSystem"),
    tc("kind.compartments", accessPoint.config.compartments.length),
  ].join(" · ");
}

/**
 * The Standort as text: the address it was stored with, or the text of an
 * old Standort without one.
 *
 * @param {Object} accessPoint The access point
 * @returns {string}
 */
export function locationLabel(accessPoint) {
  const location = accessPoint?.location;
  if (!location) return "";
  if (typeof location === "string") return location.trim();
  return (location.display_address || "").trim();
}

/**
 * The small line under the label: kind, id at the provider and Standort,
 * those it has, apart by „·“.
 *
 * @param {Object} accessPoint The access point
 * @returns {string}
 */
export function metaLine(accessPoint) {
  return [
    kindLabel(accessPoint),
    accessPoint?.externalId,
    locationLabel(accessPoint),
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Whether the row shows the QR code: at every door, also one without QR scan,
 * and at a fixed Fach and an Open Locker Schließfachanlage. A Schließfachanlage
 * of iFBS or Pareva has none.
 *
 * @param {Object} accessPoint The access point
 * @returns {boolean}
 */
export function hasQr(accessPoint) {
  return (
    !isLockerAccessPoint(accessPoint) || carriesOwnCompartments(accessPoint)
  );
}

/**
 * What the QR code of the row does, as its tooltip says it: the PDF of a door
 * or a fixed Fach, the QR codes of the Fächer of a Schließfachanlage.
 *
 * @param {Object} accessPoint The access point, one with `hasQr`
 * @returns {string} A translated tooltip
 */
export function qrTitle(accessPoint) {
  if (carriesOwnCompartments(accessPoint)) return t("qr.compartments");
  if (isFixedCompartment(accessPoint)) return t("qr.compartment");
  return t("qr.door");
}

/**
 * The entries of the menu „…“, once QR-Code and Bearbeiten are in sight. Each
 * names the event the row hands up (`event`, with `arg` where it has one);
 * a `danger` entry stands apart at the end.
 *
 * @param {Object} accessPoint The access point
 * @returns {Array<{key: string, icon: string, label: string, event: string, arg?: string, danger?: boolean}>}
 */
export function moreActions(accessPoint) {
  const actions = [];
  if (!isLockerAccessPoint(accessPoint)) {
    actions.push(
      {
        key: "svg",
        icon: "mdi-qrcode",
        label: t("actions.svg"),
        event: "download",
        arg: "svg",
      },
      {
        key: "png",
        icon: "mdi-qrcode",
        label: t("actions.png"),
        event: "download",
        arg: "png",
      },
      {
        key: "rotate",
        icon: "mdi-autorenew",
        label: t("actions.rotate"),
        event: "rotate",
      }
    );
  } else if (carriesOwnCompartments(accessPoint)) {
    actions.push({
      key: "rotate-all",
      icon: "mdi-autorenew",
      label: t("actions.rotateAll"),
      event: "rotate-all",
    });
  }
  actions.push({
    key: "delete",
    icon: "mdi-delete-outline",
    label: t("actions.delete"),
    event: "delete",
    danger: true,
  });
  return actions;
}

/**
 * Whether the provider lists the lock as one that can do nothing until its
 * IQ is activated: a Salto KS lock lists no modes then.
 *
 * @param {Object} lock An entry of the listing
 * @returns {boolean}
 */
export function iqNotActivated(lock) {
  return (
    Array.isArray(lock?.supportedModes) && lock.supportedModes.length === 0
  );
}

/**
 * What the provider's listing says of the access point: whether it was
 * entered by hand - not in the listing of a provider that takes one by hand
 * - and whether the IQ of its Salto KS lock is not activated. Without a
 * listing, neither.
 *
 * @param {Object} accessPoint The access point
 * @param {Object[]|null} listing What its provider lists
 * @returns {{byHand: boolean, iqOff: boolean}}
 */
function listingFacts(accessPoint, listing) {
  if (!Array.isArray(listing)) return { byHand: false, iqOff: false };
  const fields = accessPointFields(accessPoint.provider, accessPoint.type);
  const entry = listing.find(
    (lock) =>
      String(lock.externalId || lock.id) === String(accessPoint.externalId)
  );
  return {
    byHand: fields.listing && fields.manual && !entry,
    iqOff: fields.iq && !!entry && iqNotActivated(entry),
  };
}

/**
 * The markers of the row: only where the access point differs from the
 * standard, each with the sentence of its tooltip. `tone` names its look,
 * "neutral", or "warning" where it does not open.
 *
 * The QR scan is measured against what a new access point of the provider
 * and type starts with (`qrScanDefault` of `accessPointFields`), wherever
 * there is a QR code to scan (`hasQr`). „von Hand“ and „IQ nicht aktiviert“
 * come from the listing of the provider.
 *
 * @param {Object} accessPoint The access point
 * @param {Object[]|null} [listing] What its provider lists
 * @returns {Array<{key: string, label: string, tooltip: string, tone: string}>}
 */
export function deviations(accessPoint, listing = null) {
  const markers = [];
  const marker = (key, tone) => ({
    key,
    label: t(`markers.${key}.label`),
    tooltip: t(`markers.${key}.tooltip`),
    tone,
  });
  const { byHand, iqOff } = listingFacts(accessPoint, listing);
  if (byHand) markers.push(marker("byHand", "neutral"));
  if (hasQr(accessPoint)) {
    const scan = requiresQrScan(accessPoint);
    const { qrScanDefault } = accessPointFields(
      accessPoint.provider,
      accessPoint.type
    );
    if (scan !== qrScanDefault) {
      markers.push(marker(scan ? "withQrScan" : "withoutQrScan", "neutral"));
    }
  }
  if (iqOff) markers.push(marker("iqOff", "warning"));
  return markers;
}

/**
 * Whether the access point matches the search: every word of the query in
 * its label, id at the provider, Standort, kind or the titles of its
 * bookables, regardless of case. An empty query matches everything.
 *
 * @param {Object} accessPoint The access point
 * @param {string} query What was typed
 * @param {Object[]|null} bookables The bookables it is assigned to
 * @returns {boolean}
 */
export function matches(accessPoint, query, bookables) {
  const words = (query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = [
    accessPoint?.label,
    accessPoint?.externalId,
    locationLabel(accessPoint),
    kindLabel(accessPoint),
    ...(bookables || []).map((bookable) => bookable.title),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((word) => text.includes(word));
}

/**
 * Whether something is still to do at the access point, for „Offen“: it has
 * no bookable, or the IQ of its Salto KS lock is not activated. Where the
 * bookables or the listing were not readable nothing is said of them.
 *
 * @param {Object} accessPoint The access point
 * @param {Object[]|null} bookables The bookables it is assigned to
 * @param {Object[]|null} [listing] What its provider lists
 * @returns {boolean}
 */
export function needsAction(accessPoint, bookables, listing = null) {
  return (
    (Array.isArray(bookables) && bookables.length === 0) ||
    listingFacts(accessPoint, listing).iqOff
  );
}

/**
 * The next step of an access point just created, as its row names it
 * (ECCdigital/tickets#1110): print the QR code where it is scanned to open,
 * and assign it.
 *
 * @param {Object} accessPoint The access point
 * @returns {string} A translated sentence
 */
export function nextStep(accessPoint) {
  return t(
    hasQr(accessPoint) && requiresQrScan(accessPoint) ? "nextWithQr" : "next"
  );
}
