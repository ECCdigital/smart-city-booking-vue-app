import ApiClient from "./ApiClientService";

const BASE = "api/instances/supervision/notifications";

/**
 * The outbox of the supervision notices (glossary "Aufsichtsmitteilung").
 * Instance owner only.
 */
export default {
  /**
   * One page of the outbox, newest first.
   *
   * @param {Object} query
   * @param {"pending"|"sent"|"failed"|null} [query.status] Every row when empty
   * @param {number} query.page 1-based
   * @param {number} query.pageSize At most 200
   * @returns {Promise<{items: Object[], total: number, page: number, pageSize: number}>}
   */
  async getNotifications({ status, page, pageSize }) {
    const params = { page, pageSize };
    if (status) params.status = status;
    const response = await ApiClient.get(BASE, { params });
    return response.data;
  },

  /**
   * Sends the mails of a row that are still missing. The decision behind the
   * row is never repeated and no history is written. `409` for a row already
   * sent or being dispatched, `404` for an unknown one.
   *
   * @param {string} id
   * @returns {Promise<Object>} The row as it is after: `sent`, or `failed` again
   */
  async retry(id) {
    const response = await ApiClient.post(
      `${BASE}/${encodeURIComponent(id)}/retry`
    );
    return response.data;
  },
};
