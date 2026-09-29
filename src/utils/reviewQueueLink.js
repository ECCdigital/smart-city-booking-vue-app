/**
 * The admin link of a review queue row (glossary "Aktive Prüfliste").
 *
 * The backend sends `adminPath` after one pattern per offer type
 * (`review-queue-service.js`), which names this app's editor routes:
 *
 *   bookable  /<rooms|resources|tickets|event-locations>/edit?id=<offerId>
 *   event     /events/edit?id=<offerId>
 *
 * A row carries no bookable type, so the path is the only thing that names
 * the editor of a bookable. It is a string from the server all the same:
 * only the editors of the row's offer type are followed, and the offer is
 * named by `offerId`, never by what the path carries.
 *
 * The path holds no tenant - the editors work in `tenants/currentTenantId`,
 * so the caller selects the row's `tenantId` before routing.
 */
const BOOKABLE_EDITOR_PATH =
  /^\/(rooms|resources|tickets|event-locations)\/edit(\?|$)/;
const EVENT_EDITOR = "/events/edit";

/**
 * @param {Object} row A review queue row
 * @returns {{path: string, query: {id: string}}|null} The router location of
 *   the offer's editor, or `null` when the row has none
 */
export function reviewQueueLocation(row) {
  const offerId = row?.offerId;
  if (typeof offerId !== "string" || offerId === "") {
    return null;
  }
  if (row.offerType === "event") {
    return { path: EVENT_EDITOR, query: { id: offerId } };
  }
  if (row.offerType !== "bookable" || typeof row.adminPath !== "string") {
    return null;
  }
  const editor = row.adminPath.match(BOOKABLE_EDITOR_PATH);
  return editor ? { path: `/${editor[1]}/edit`, query: { id: offerId } } : null;
}
