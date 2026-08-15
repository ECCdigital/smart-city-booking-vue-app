import store from "@/store";

export default {
  testConnection(tenantID, credentials = {}, provider = "nuki") {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`/api/${t}/access-apps/${provider}/test`, credentials);
  },
  getProviders(tenantID) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`/api/${t}/access-apps/providers`);
  },
  getAccessPoints(tenantID, provider = "nuki") {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`/api/${t}/access-apps/${provider}/access-points`);
  },
  registerWebhook(tenantID, callbackUrl, provider = "nuki") {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(`/api/${t}/access-apps/${provider}/webhook/register`, {
      callbackUrl,
    });
  },
  unregisterWebhook(tenantID, notificationId, provider = "nuki") {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `/api/${t}/access-apps/${provider}/webhook/unregister`,
      {
        notificationId,
      }
    );
  },
};
