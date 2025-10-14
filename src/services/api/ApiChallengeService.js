export default {
  getChallenges(tenantId) {
    return ApiClient.get(`api/${tenantId}/challenges`, {
      withCredentials: true,
    });
  },

  createChallenge(tenantId, challenge) {
    return ApiClient.post(`api/${tenantId}/challenges`, challenge, {
      withCredentials: true,
    });
  },
  updateChallenge(tenantId, challenge) {
    return ApiClient.put(`api/${tenantId}/challenges`, challenge, {
      withCredentials: true,
    });
  },
  deleteChallenge(tenantId, challengeId) {
    return ApiClient.delete(`api/${tenantId}/challenges/${challengeId}`, {
      withCredentials: true,
    });
  },
};
