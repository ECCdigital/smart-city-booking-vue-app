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
