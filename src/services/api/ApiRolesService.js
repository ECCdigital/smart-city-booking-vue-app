export default {
  getRoles() {
    return ApiClient.get("api/roles", { withCredentials : true });
  },
  submitRole(role) {
    return ApiClient.put("api/roles", role ,{ withCredentials : true })
  },
  deleteRole(role) {
    return ApiClient.delete(`api/roles/${role.id}` ,{ withCredentials : true })
  }
};
