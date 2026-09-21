import ApiClient from "./ApiClientService";
import { legalDocumentsForSave } from "@/utils/tenantLegalDocuments";

/**
 * A tenant as it is written: without the fields the supervision owns. The
 * level changes through `ApiSupervisionService.setTenantLevel` alone; a loaded
 * tenant carries it, and a write must not hand it back.
 */
function tenantForSave(tenant) {
  if (!tenant || typeof tenant !== "object") return tenant;
  // eslint-disable-next-line no-unused-vars
  const { supervisionLevel, supervisionChangedAt, ...written } = tenant;
  return legalDocumentsForSave(written);
}

export default {
  /**
   * `supervisionLevel` narrows the list to the tenants at that level (a
   * tenant without a stored level counts as `free`).
   */
  getTenants(publicTenants = false, { supervisionLevel } = {}) {
    const levelFilter = supervisionLevel
      ? `&supervisionLevel=${encodeURIComponent(supervisionLevel)}`
      : "";
    return ApiClient.get(
      `api/tenants?publicTenants=${publicTenants}${levelFilter}`
    );
  },
  /**
   * Writes a tenant. The legal documents are normalised here rather than at
   * the editors, because three screens save a tenant and every one of them
   * would otherwise write back the addresses the backend derives from the
   * media references on the way out — a shape the platform rejects (§4.8 of
   * the media spec).
   */
  submitTenant(tenant) {
    return ApiClient.put("api/tenants", tenantForSave(tenant));
  },
  createTenant(tenant) {
    return ApiClient.post("api/tenants", tenantForSave(tenant));
  },
  deleteTenant(tenant) {
    return ApiClient.delete(`api/tenants/${tenant.id}`);
  },
  getTenantActivePaymentApps(tenantId) {
    return ApiClient.get(`api/tenants/${tenantId}/payment-apps`);
  },
  getTenant(tenantId, withCredentials = true) {
    return ApiClient.get(`api/tenants/${tenantId}`, {
      withCredentials: withCredentials,
    });
  },
  async getDashboardData(query = {}) {
    const _query = { granularity: "week", ...query };
    const response = await ApiClient.get("api/v2/dashboard/summary", {
      params: _query,
    });
    return response.data;
  },
  async getDashboardDataByTenant(tenantId, query = {}) {
    const _query = { granularity: "week", ...query };
    const response = await ApiClient.get(
      `api/v2/${tenantId}/dashboard/summary`,
      { params: _query }
    );
    console.log(response);
    return response.data;
  },
  async addTenantUser(tenantId, userId, roles, challenges, type) {
    const response = await ApiClient.post(`/api/tenants/${tenantId}/add-user`, {
      userId,
      roles,
      challenges,
      type,
    });
    return response.data;
  },
  async removeTenantUser(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-user`,
      { userId }
    );
    return response.data;
  },
  async getTenantUsers(tenantId) {
    const response = await ApiClient.get(`api/${tenantId}/users`);
    return response.data;
  },
  async removeTenantUserRole(tenantId, userId, roleId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-user-role`,
      { userId, roleId }
    );
    return response.data;
  },
  async addTenantOwner(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/add-owner`,
      { userId }
    );
    return response.data;
  },
  async removeTenantOwner(tenantId, userId) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/remove-owner`,
      { userId }
    );
    return response.data;
  },
  async editTenantUserRoles(tenantId, userId, roles) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/edit-user-roles`,
      { userId, roles }
    );
    return response.data;
  },
  /**
   * The readiness check (glossary "Bereitschafts-Check"): computed by the
   * backend on every call, information only - never a gate.
   */
  async getReadiness(tenantId) {
    return (await ApiClient.get(`api/tenants/${tenantId}/readiness`)).data;
  },
  async tenantCountCheck() {
    return (await ApiClient.get("api/tenants/count/check")).data;
  },
  async updateUserStatus(tenantId, userId, status) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/update-user-status`,
      { userId, status }
    );
    return response.data;
  },
  getPdfPreview(
    tenantId,
    templateType,
    template,
    pdfBookingLayout,
    pdfBookingTableMeta
  ) {
    const body = { templateType, template };
    if (pdfBookingLayout) {
      body.pdfBookingLayout = pdfBookingLayout;
    }
    if (pdfBookingTableMeta) {
      body.pdfBookingTableMeta = pdfBookingTableMeta;
    }
    return ApiClient.post(`api/tenants/${tenantId}/pdf-preview`, body, {
      responseType: "blob",
      timeout: 90000,
    });
  },
  async updateUserBookingNotificationRecipients(
    tenantId,
    userId,
    bookingNotificationRecipients
  ) {
    const response = await ApiClient.post(
      `/api/tenants/${tenantId}/update-user-booking-notification-recipients`,
      { userId, bookingNotificationRecipients }
    );
    return response.data;
  },
  async getDefaultMailTempaltes(tenantId) {
    return (
      await ApiClient.get(`api/tenants/${tenantId}/mail/templates/default`)
    ).data;
  },
};
