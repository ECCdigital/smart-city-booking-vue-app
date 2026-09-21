/**
 * Reading helpers for a row of the supervision notification outbox
 * (glossary "Aufsichtsmitteilung"). The occasion's `payload` differs by
 * `type`; these helpers are the one place that knows its shapes.
 */

/** The delivery statuses of a row, as the backend names them. */
export const NOTIFICATION_STATUSES = ["failed", "pending", "sent"];

const NOTIFICATION_STATUS_COLORS = Object.freeze({
  failed: "error",
  pending: "grey",
  sent: "success",
});

/** The chip colour of a delivery status; an unknown one stays grey. */
export function notificationStatusColor(status) {
  return NOTIFICATION_STATUS_COLORS[status] || "grey";
}

/**
 * Whether the row can be sent again: everything that did not go out. A
 * `pending` row may be one whose send never completed; the backend refuses
 * the retry of a row it is dispatching right now (409).
 */
export function isRetryableNotification(row) {
  return row?.status === "failed" || row?.status === "pending";
}

/** The occasion types this UI has a German label for. */
export const NOTIFICATION_TYPES = [
  "tenant.selfCreated",
  "review.queueEntered",
  "tenant.levelChanged",
  "review.decided",
];

/**
 * The titles of the offers a notice is about: all of a joint review queue
 * notice, the one of a review decision, none for a notice about the tenant.
 *
 * @param {Object} row
 * @returns {string[]}
 */
export function notificationOfferTitles(row) {
  const payload = row?.payload || {};
  const single = payload.offerId ? [payload] : [];
  const offers = Array.isArray(payload.offers) ? payload.offers : single;
  return offers.map((offer) => offer.title || offer.offerId);
}

/** The tenant's name as recorded with the occasion, else its id. */
export function notificationTenantName(row) {
  return row?.payload?.tenantName || row?.tenantId || "";
}
