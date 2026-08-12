export const QR_SCAN_RULE = "qrScan";

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
