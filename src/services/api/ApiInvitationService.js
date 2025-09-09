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
  }) {
    return ApiClient.post(
      `api/${tenantId}/invitations`,
      { type: "multi", roles, expiresAt, maxUses },
      { withCredentials: true }
    );
  },
  deleteInvitation(tenantId, token) {
    return ApiClient.delete(`api/${tenantId}/invitations/${token}`, {
      withCredentials: true,
    });
  }
};
