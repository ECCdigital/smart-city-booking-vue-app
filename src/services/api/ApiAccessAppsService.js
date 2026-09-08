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
  // Salto KS IQ activation wizard - provider-specific by nature (backend spec
  // docs/specs/salto-ks-remote-open.md §3), hence no provider parameter.
  getSaltoIqs(tenantID) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`/api/${t}/access-apps/salto-ks/iqs`);
  },
  startSaltoIqActivation(tenantID, iqId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `/api/${t}/access-apps/salto-ks/iqs/${iqId}/activation/start`
    );
  },
  completeSaltoIqActivation(tenantID, iqId, pin) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `/api/${t}/access-apps/salto-ks/iqs/${iqId}/activation/complete`,
      { pin }
    );
  },
  discardSaltoIqActivation(tenantID, iqId) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(
      `/api/${t}/access-apps/salto-ks/iqs/${iqId}/activation`
    );
  },
};
