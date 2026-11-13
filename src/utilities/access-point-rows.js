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
 */

const t = (key, params) => i18n.t(`accessPoint.management.row.${key}`, params);
const tc = (key, count) =>
  i18n.tc(`accessPoint.management.row.${key}`, count, { count });

/** An Open Locker door is a single Fach, without an Anlage around it. */
function isFixedCompartment(accessPoint) {
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
 * The markers of the row: only where the access point differs from the
 * standard, each with the sentence of its tooltip. `tone` names its look,
 * "neutral" so far.
 *
 * The QR scan is measured against what a new access point of the provider
 * and type starts with (`qrScanDefault` of `accessPointFields`), wherever
 * there is a QR code to scan (`hasQr`). „von Hand“ and „IQ nicht aktiviert“
 * need the listing of the provider, which the page does not load.
 *
 * @param {Object} accessPoint The access point
 * @returns {Array<{key: string, label: string, tooltip: string, tone: string}>}
 */
export function deviations(accessPoint) {
  const markers = [];
  if (hasQr(accessPoint)) {
    const scan = requiresQrScan(accessPoint);
    const { qrScanDefault } = accessPointFields(
      accessPoint.provider,
      accessPoint.type
    );
    if (scan !== qrScanDefault) {
      const key = scan ? "withQrScan" : "withoutQrScan";
      markers.push({
        key,
        label: t(`markers.${key}.label`),
        tooltip: t(`markers.${key}.tooltip`),
        tone: "neutral",
      });
    }
  }
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
 * no bookable. Where the bookables were not readable nothing can be said.
 *
 * „IQ nicht aktiviert“ counts here too once the page knows the IQ of a Salto
 * KS door; the IQs it can load today name no door.
 *
 * @param {Object} accessPoint The access point
 * @param {Object[]|null} bookables The bookables it is assigned to
 * @returns {boolean}
 */
export function needsAction(accessPoint, bookables) {
  return Array.isArray(bookables) && bookables.length === 0;
}
