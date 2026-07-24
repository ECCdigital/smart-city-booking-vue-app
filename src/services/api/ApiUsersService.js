export default {
  async getUsers() {
    const response = await ApiClient.get("api/users");
    return response.data;
  },
  getUserIds(filterRoles) {
    let queryParams = "";
    if (!!filterRoles && filterRoles.length === 0) {
      queryParams = `?filterRoles=${filterRoles.join(",")}`;
    }

    return ApiClient.get(`api/users/ids${queryParams}`);
  },
  getUser(userId) {
    return ApiClient.get(`api/users/${userId}`);
  },
  submitUser(user) {
    return ApiClient.put("api/users", {
      ...user,
      syncSelfBookingNames: false,
    });
  },
  deleteUser(user) {
    return ApiClient.delete(`api/users/${user.id}`);
  },
  updateMe(user) {
    return ApiClient.put("api/user", {
      ...user,
      syncSelfBookingNames: false,
    });
  },
};
