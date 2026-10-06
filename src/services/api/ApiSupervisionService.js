import ApiClient from "./ApiClientService";

/**
 * The tenant supervision (glossary "Mandanten-Aufsicht"): the level change
 * and the immutable history. The level never travels with a tenant write -
 * the backend ignores it there.
 */
export default {
  /**
   * Sets the level of a tenant (instance owner only); `declined` is the
   * decline. Answers the effective level: `{ supervisionLevel,
   * supervisionChangedAt, supervisionReason }`. Setting the level that is
   * already effective is a no-op on the backend.
   */
  async setTenantLevel(tenantId, { level, reason }) {
    return (
      await ApiClient.put(`api/tenants/${tenantId}/supervision`, {
        level,
        reason,
      })
    ).data;
  },
  /**
   * One page of a tenant's history, newest first:
   * `{ items, total, page, pageSize }`. Params: `page`, `pageSize`,
   * `offerType`, `offerId`.
   */
  async getTenantHistory(tenantId, params = {}) {
    return (
      await ApiClient.get(`api/tenants/${tenantId}/supervision/history`, {
        params,
      })
    ).data;
  },
  /** The instance-wide history; additionally narrowed by `tenantId`. */
  async getInstanceHistory(params = {}) {
    return (
      await ApiClient.get("api/instances/supervision/history", { params })
    ).data;
  },
};
