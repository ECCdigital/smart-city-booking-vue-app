/**
 * Reading helpers for a row of the supervision notification outbox
 * (glossary "Aufsichtsmitteilung"). The occasion's `payload` differs by
 * `type`; these helpers are the one place that knows its shapes.
 */

/** The delivery statuses of a row, as the backend names them. */
export const NOTIFICATION_STATUSES = ["failed", "pending", "sent"];

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
