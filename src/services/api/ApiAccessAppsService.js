import store from "@/store";

export default {
  testConnection(tenantID, { apiToken, apiBaseUrl }) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`/api/${t}/access-apps/nuki/test`, {
      apiToken,
      apiBaseUrl,
    });
  },
  getAccessPoints(tenantID) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`/api/${t}/access-apps/nuki/access-points`);
  },
  registerWebhook(tenantID, callbackUrl) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`/api/${t}/access-apps/nuki/webhook/register`, {
      callbackUrl,
    });
  },
  unregisterWebhook(tenantID, notificationId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`/api/${t}/access-apps/nuki/webhook/unregister`, {
      notificationId,
    });
  },
};
