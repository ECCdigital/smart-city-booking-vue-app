import store from "@/store";

export default {
  getRoles() {
    return ApiClient.get("api/roles", { withCredentials: true });
  },
  getTenantRoles(publicRoles = false) {
    const t = store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/roles?public=${publicRoles}`, {
      withCredentials: true,
    });
  },
  getUserRolesByTenant(tenantId, publicRoles = false) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/roles/tenant?public=${publicRoles}`, {
      withCredentials: true,
    });
  },
  submitRole(role) {
    const t = store.getters["tenants/currentTenantId"];

    return ApiClient.put(`api/${t}/roles`, role, { withCredentials: true });
  },
  deleteRole(role) {
    const t = store.getters["tenants/currentTenantId"];
    return ApiClient.delete(`api/${t}/roles/${role.id}`, {
      withCredentials: true,
    });
  },
};
