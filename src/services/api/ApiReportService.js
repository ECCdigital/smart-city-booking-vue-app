import ApiClient from "@/services/api/ApiClientService";

/**
 * The reports to the instance (glossary „Meldung (eines Users oder einer
 * Adresse)“, ECCdigital/tickets#630): a tenant reports a member or the
 * booker of a booking; the instance owner reads them and settles every open
 * one about a user at once.
 */
class ApiReportService {
  /**
   * Reports a member (`userId`) or the booker of a booking (`bookingId`).
   * Answers 201 with a new report, 200 with the open one the reason was
   * added to.
   *
   * @param {string} tenantId
   * @param {{userId?: string, bookingId?: string, reason: string}} report
   */
  static report(tenantId, report) {
    return ApiClient.post(`api/tenants/${tenantId}/reports`, report);
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
