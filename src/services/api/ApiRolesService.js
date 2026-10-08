import store from "@/store";

export default {
  getRoles() {
    return ApiClient.get("api/roles");
  },
  // The roles of `tenantId`, by default of the current tenant. A bookable's
  // roles are its own tenant's, which need not be the current one.
  getTenantRoles(publicRoles = false, tenantId = null) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/roles?public=${publicRoles}`);
  },
  getUserRolesByTenant(tenantId, publicRoles = false) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/roles/tenant?public=${publicRoles}`, {
      withCredentials: true,
    });
  },
  // A role without an id is created (`POST`), one with an id updated.
  submitRole(role) {
    const t = store.getters["tenants/currentTenantId"];

    if (!role.id) {
      return ApiClient.post(`api/${t}/roles`, role);
    }
    return ApiClient.put(`api/${t}/roles`, role);
  },
  deleteRole(role) {
    const t = store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/roles/${role.id}`);
  },
};
