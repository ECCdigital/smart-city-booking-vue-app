import user from "@/store/modules/user";
import store from "@/store";

class TenantPermissionService {
  static isOwner(tenant) {
    return tenant.ownerUserId === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner
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

  static allowUpdate(tenant) {
    if (TenantPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    return (
      permissions.manageTenants?.updateAny ||
      (permissions.manageTenants?.updateOwn &&
        TenantPermissionService.isOwner(tenant))
    );
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
