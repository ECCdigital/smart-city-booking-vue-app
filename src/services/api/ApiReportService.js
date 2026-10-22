import ApiClient from "@/services/api/ApiClientService";

/**
 * The reports to the instance (glossary „Meldung (eines Users oder einer
 * Adresse)“, ECCdigital/tickets#630): a tenant reports a member or the
 * booker of a booking; the instance owner reads them and settles every open
 * one about a user at once. The tenant reads its own, adds to and
 * withdraws an open one (ECCdigital/tickets#631).
 */
class ApiReportService {
  /**
   * Reports a member (`userId`) or the booker of a booking (`bookingId`).
   * Answers 201 with a new report, 200 with the open one the reason was
   * added to. `endMembership` ends the member's membership with it.
   *
   * @param {string} tenantId
   * @param {{userId?: string, bookingId?: string, reason: string, endMembership?: boolean}} report
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
   * @param {{status?: string, userId?: string}} [params]
   * @returns {Promise<Object[]>}
   */
  static async getReports(params = {}) {
    const response = await ApiClient.get("api/instances/reports", { params });
    return response.data;
  }

  /**
   * Rejects every open report about a user, with a reason the tenant owners
   * read. A suspension settles them over `ApiUsersService.suspendUser`.
   *
   * @param {string} userId
   * @param {string} reason
   */
  static reject(userId, reason) {
    return ApiClient.post("api/instances/reports/resolve", {
      userId,
      decision: "reject",
      reason,
    });
  }
}

export default ApiReportService;
