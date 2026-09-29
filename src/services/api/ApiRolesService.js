import store from "@/store";

export default {
  getRoles() {
    return ApiClient.get("api/roles");
  },
  getTenantRoles(publicRoles = false) {
    const t = store.getters["tenants/currentTenantId"];
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
