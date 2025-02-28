import user from "@/store/modules/user";
import store from "@/store";

class RolePermissionService {
  static isOwner(role) {
    return role.ownerUserId === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner
  }

  static allowCreate() {
    if (RolePermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;
    return permissions.manageRoles.create;
  }

  static allowUpdate(role) {
    if (RolePermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;
    return (
      permissions.manageRoles.updateAny ||
      (permissions.manageRoles.updateOwn && RolePermissionService.isOwner(role))
    );
  }

  static allowDelete(role) {
    if (RolePermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;
    return (
      permissions.manageRoles.deleteAny ||
      (permissions.manageRoles.deleteOwn && RolePermissionService.isOwner(role))
    );
  }
}

export default RolePermissionService;
