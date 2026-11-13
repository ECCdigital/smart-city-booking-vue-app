import store from "@/store";

export default {
  testConnection(tenantID, credentials = {}, provider = "nuki") {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `/api/${t}/access-apps/${provider}/test`,
      credentials
    );
  },
  // Saves the access application of one provider and nothing else; a
  // secret left out keeps the stored one. Answers the application without
  // its secrets, with the state of its connection.
  saveApp(tenantID, provider, settings) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.put(`/api/${t}/access-apps/${provider}`, settings);
  },
  // Removes the access application of one provider with its credentials;
  // `409 access_app_has_access_points` while it has access points.
  removeApp(tenantID, provider) {
    const t = tenantID || store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`/api/${t}/access-apps/${provider}`);
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
    return ApiClient.post(
      `/api/${t}/access-apps/${provider}/webhook/register`,
      {
        callbackUrl,
      }
    );
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
  // Salto KS IQ activation wizard - provider-specific by nature (only Salto KS
  // needs an activation per IQ), hence no provider parameter.
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
