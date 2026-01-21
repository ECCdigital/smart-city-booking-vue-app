export default {
  getMemberships() {
    return ApiClient.get("api/memberships", {
      withCredentials: true,
    });
  },

  getMyMemberships() {
    return ApiClient.get("api/memberships/my", {
      withCredentials: true,
    });
  },
  getMyPendingMemberships() {
    return ApiClient.get("api/memberships/my/pending", {
      withCredentials: true,
    });
  },
};
