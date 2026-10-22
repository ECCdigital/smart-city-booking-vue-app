import store from "@/store";
import user from "@/store/modules/user";

class UserPermissionService {
  static isSelf(userObject) {
    return userObject.id === user.state.data.user.id;
  }

  static allowCreate() {
    return true;
  }

  static allowUpdate() {
    return true;
  }

  static allowDelete() {
    return true;
  }

  /**
   * Reporting a member or a booker to the instance (glossary „Meldung“,
   * ECCdigital/tickets#630): the backend's `tenantUser.report`,
   * `manageUsers.updateAny` of the tenant, which its owner holds.
   */
  static allowReport(tenantId = store.getters["tenants/currentTenantId"]) {
    if (user.state.data.permissions.instanceOwner) return true;
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;
    return !!permissions.manageUsers?.updateAny;
  }

  /**
   * Changing a report about a tenant owner (ECCdigital/tickets#631): the
   * backend's `tenantUser.owner`, the tenant owners' and the instance
   * owner's alone, as reporting one is.
   */
  static allowReportOwner(tenantId = store.getters["tenants/currentTenantId"]) {
    if (user.state.data.permissions.instanceOwner) return true;
    return !!user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    )?.isOwner;
  }
}

export default UserPermissionService;
