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
  /**
   * Suspends a user at once, with a reason;
   * `blacklist` puts the address on the blacklist too.
   */
  suspendUser(userId, reason, blacklist = false) {
    return ApiClient.post(`api/users/${userId}/suspension`, {
      reason,
      blacklist,
    });
  },
  /** Lifts the suspension of a user; `removeBlacklistEntry` removes an exact entry. */
  unsuspendUser(userId, removeBlacklistEntry = false) {
    return ApiClient.delete(`api/users/${userId}/suspension`, {
      params: { removeBlacklistEntry },
    });
  },
  /**
   * The counts the suspension dialog names, bookings and memberships, and
   * the blacklist entry that hits the address.
   */
  getSuspensionPreview(userId) {
    return ApiClient.get(`api/users/${userId}/suspension-preview`);
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
