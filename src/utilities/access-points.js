import i18n from "@/language/index";

export const QR_SCAN_RULE = "qrScan";

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
