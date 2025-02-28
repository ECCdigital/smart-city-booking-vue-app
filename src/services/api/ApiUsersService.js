export default {
  async getUsers() {
    const response = await ApiClient.get("api/users", {
      withCredentials: true,
    });
    return response.data;
  },
  getUserIds(filterRoles) {
    let queryParams = "";
    if (!!filterRoles && filterRoles.length === 0) {
      queryParams = `?filterRoles=${filterRoles.join(",")}`;
    }

    return ApiClient.get(`api/users/ids${queryParams}`, {
      withCredentials: true,
    });
  },
  getUser(userId) {
    return ApiClient.get(`api/users/${userId}`, {
      withCredentials: true,
    });
  },
  submitUser(user) {
    return ApiClient.put("api/users", user, { withCredentials: true });
  },
  deleteUser(user) {
    return ApiClient.delete(`api/users/${user.id}`, { withCredentials: true });
  },
  updateMe(user) {
    return ApiClient.put("api/user", user, { withCredentials: true });
  },
};
