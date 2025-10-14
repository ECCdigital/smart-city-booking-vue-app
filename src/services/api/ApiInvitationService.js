export default {
  getTenantInvitations(tenantId) {
    return ApiClient.get(`api/${tenantId}/invitations`, {
      withCredentials: true,
    });
  },
  createMultiUseInvitation({
    tenantId,
    roles = [],
    expiresAt = null,
    maxUses = null,
    challenges = [],
  }) {
    return ApiClient.post(
      `api/${tenantId}/invitations`,
      { type: "multi", roles, expiresAt, maxUses, challenges },
      { withCredentials: true }
    );
  },
  deleteInvitation(tenantId, token) {
    return ApiClient.delete(`api/${tenantId}/invitations/${token}`, {
      withCredentials: true,
    });
  },
  getMyInvitations() {
    return ApiClient.get("api/invitations/my", {
      withCredentials: true,
    });
  },
  rejectInvitation(tenantId, token) {
    return ApiClient.post(
      `api/${tenantId}/invitations/${token}/reject`,
      {},
      { withCredentials: true }
    );
  },
  resendInvitation(tenantId, userId) {
    return ApiClient.post(
      `api/${tenantId}/invitations/resend`,
      { userId },
      { withCredentials: true }
    );
  },
  acceptInvitation(tenantId, token) {
    return ApiClient.post(
      `/api/${tenantId}/invitations/${token}/accept`,
      {},
      {
        withCredentials: true,
      }
    );
  },
  verifyInvitation(tenantId, token) {
    return ApiClient.get(`/api/${tenantId}/invitations/${token}/verify`, {
      withCredentials: true,
    });
  },
  approveChallenge(tenantId, challengeID, token, userID) {
    return ApiClient.post(
      `/api/${tenantId}/invitations/approve`,
      {
        challengeId: challengeID,
        token: token,
        userId: userID,
      },
      {
        withCredentials: true,
      }
    );
  },
};
