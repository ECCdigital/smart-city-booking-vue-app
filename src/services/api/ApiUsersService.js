import store from "@/store";
export default {
  getUsers() {
    return ApiClient.get(`api/${store.getters["tenants/tenant"].id}/users`, {
      withCredentials: true,
    });
  },
  getUserIds(filterRoles) {
    let queryParams = "";
    if (!!filterRoles && filterRoles.length === 0) {
      queryParams = `?filterRoles=${filterRoles.join(",")}`;
    }

    return ApiClient.get(
      `api/${store.getters["tenants/tenant"].id}/users/ids${queryParams}`,
      { withCredentials: true }
    );
  },
  getUser() {
    return ApiClient.get(
      `auth/${store.getters["tenants/tenant"].id}/me?populatePermissions=1`,
      { withCredentials: true }
    );
  },
  submitUser(user) {
    return ApiClient.put(
      `api/${store.getters["tenants/tenant"].id}/users`,
      user,
      { withCredentials: true }
    );
  },
  deleteUser(user) {
    return ApiClient.delete(
      `api/${store.getters["tenants/tenant"].id}/users/${user.id}`,
      { withCredentials: true }
    );
  },
  updateMe(user) {
    return ApiClient.put(
      `api/${store.getters["tenants/tenant"].id}/user`,
      user,
      { withCredentials: true }
    );
  },
};
