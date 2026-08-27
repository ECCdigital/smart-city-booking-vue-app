import user from "@/store/modules/user";
import store from "@/store";

class TenantPermissionService {
  static isOwner(tenant) {
    return tenant.ownerUserId === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner;
  }

  static allowCreate() {
    if (TenantPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    return permissions.manageTenants?.create;
  }

  /**
   * Editing a tenant belongs to its owner and to the instance owner - the
   * backend authorises `updateTenant` exactly that way.
   *
   * The membership's `isOwner` flag is what the permissions payload actually
   * carries. There is no `manageTenants` dimension in it, so asking for one
   * locked every tenant owner out of the tenant and access pages.
   */
  static allowUpdate() {
    if (TenantPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    return permissions?.isOwner === true;
  }

  static allowDelete(tenant) {
    if (TenantPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    return (
      permissions.manageTenants?.deleteAny ||
      (permissions.manageTenants?.deleteOwn &&
        TenantPermissionService.isOwner(tenant))
    );
  }
}

export default TenantPermissionService;
