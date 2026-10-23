import ApiClient from "@/services/api/ApiClientService";

/**
 * The reports to the instance (glossary „Meldung (eines Users oder einer
 * Adresse)“): a tenant reports a member or the
 * booker of a booking, or addresses of a booking's `mail`;
 * the instance owner reads them and settles every
 * open one about a user or an address at once. The tenant reads its own,
 * adds to and withdraws an open one.
 */
class ApiReportService {
  /**
   * Reports a member (`userId`) or the booker of a booking (`bookingId`).
   * Answers 201 with a new report, 200 with the open one the reason was
   * added to. `endMembership` ends the member's membership with it. With
   * `addresses` it reports those of the booking's `mail` instead and
   * answers `{ reports, blacklisted }`, the latter the addresses already
   * on the blacklist.
   *
   * @param {string} tenantId
   * @param {{userId?: string, bookingId?: string, addresses?: string[], reason: string, endMembership?: boolean}} report
   */
  static report(tenantId, report) {
    return ApiClient.post(`api/tenants/${tenantId}/reports`, report);
  }

  /**
   * The tenant's own reports, of every status.
   *
   * @param {string} tenantId
   * @returns {Promise<Object[]>}
   */
  static async getTenantReports(tenantId) {
    const response = await ApiClient.get(`api/tenants/${tenantId}/reports`);
    return response.data;
  }

  /**
   * Adds a reason to an open report of the tenant.
   *
   * @param {string} tenantId
   * @param {string} reportId
   * @param {string} reason
   */
  static addReason(tenantId, reportId, reason) {
    return ApiClient.post(
      `api/tenants/${tenantId}/reports/${reportId}/additions`,
      { reason }
    );
  }

  /**
   * Withdraws an open report of the tenant: its status becomes `withdrawn`.
   *
   * @param {string} tenantId
   * @param {string} reportId
   */
  static withdraw(tenantId, reportId) {
    return ApiClient.post(
      `api/tenants/${tenantId}/reports/${reportId}/withdraw`
    );
  }

  /**
   * The reports of every tenant, oldest first, for the instance owner.
   *
   * @param {{status?: string, userId?: string, address?: string}} [params]
   * @returns {Promise<Object[]>}
   */
  static async getReports(params = {}) {
    const response = await ApiClient.get("api/instances/reports", { params });
    return response.data;
  }

  /**
   * Rejects every open report about a user or an address, with a reason
   * the tenant owners read. A suspension settles those about a user over
   * `ApiUsersService.suspendUser`.
   *
   * @param {{userId?: string, address?: string}} target
   * @param {string} reason
   */
  static reject(target, reason) {
    return ApiClient.post("api/instances/reports/resolve", {
      ...target,
      decision: "reject",
      reason,
    });
  }

  /**
   * Settles every open report about an address with a blacklist entry of
   * origin `reports`: the exact address, or with
   * `domain` its domain. The entry suspends the accounts it hits, as every
   * entry does.
   *
   * @param {string} address
   * @param {string} reason
   * @param {boolean} domain
   */
  static blacklist(address, reason, domain) {
    return ApiClient.post("api/instances/reports/resolve", {
      address,
      decision: "blacklist",
      reason,
      domain,
    });
  }
}

export default ApiReportService;
