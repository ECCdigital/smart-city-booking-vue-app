import store from "@/store";

export default {
  getRoles() {
    return ApiClient.get("api/roles", { withCredentials: true });
  },
  getTenantRoles() {
    const t = store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/roles`, { withCredentials: true });
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
