import store from "@/store";

/**
 * Whether the signed-in user is a Mitglied of the tenant (see CONTEXT.md):
 * the id is in the user's permissions, or the user is an instance owner and
 * the loaded tenant list carries the id. The one fact about access the
 * client knows without asking the server; the middleware and the booking
 * pages share it so they cannot disagree.
 */
export function isTenantMember(tenantId) {
  if (typeof tenantId !== "string" || tenantId === "") {
    return false;
  }
  const permissions = store.state.user.data?.permissions;
  if (!permissions) {
    return false;
  }
  if (permissions.tenants?.some((t) => t.tenantId === tenantId)) {
    return true;
  }
  return (
    !!permissions.instanceOwner &&
    store.getters["tenants/tenants"].some((t) => t.id === tenantId)
  );
}

/**
 * The tenant to hold after the permissions arrived (sign-in, `/me`): the
 * current one while the user is a Mitglied of it, otherwise the first
 * tenant of the memberships, or `null` when there is none. A stored
 * `currentTenantId` outlives a membership - the tenant declined it, the
 * user was removed - and the tenant-scoped reads (`GET /api/:tenant/roles`)
 * answer 403 for a non-member, so the pickers would stay empty. An instance
 * owner reaches every tenant; the tenant list decides for them
 * (`layouts/Admin.vue`). Without permissions nothing is known, the current
 * id stays.
 */
export function tenantToHold(currentTenantId, permissions) {
  if (!permissions || !currentTenantId || permissions.instanceOwner) {
    return currentTenantId;
  }
  const memberships = permissions.tenants || [];
  if (memberships.some((t) => t.tenantId === currentTenantId)) {
    return currentTenantId;
  }
  return memberships[0]?.tenantId ?? null;
}
