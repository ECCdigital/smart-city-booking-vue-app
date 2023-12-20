import user from "@/store/modules/user";

class RolePermissionService {
  static isOwner(role) {
    return (
      role.ownerUserId === user.state.data.id &&
      role.ownerTenant === user.state.data.tenant
    );
  }

  static allowCreate() {
    return user.state.data.permissions.manageRoles.create;
  }

  static allowUpdate(role) {
    return (
      user.state.data.permissions.manageRoles.updateAny ||
      (user.state.data.permissions.manageRoles.updateOwn &&
        RolePermissionService.isOwner(role))
    );
  }

  static allowDelete(role) {
    return (
      user.state.data.permissions.manageRoles.deleteAny ||
      (user.state.data.permissions.manageRoles.deleteOwn &&
        RolePermissionService.isOwner(role))
    );
  }
}

export default RolePermissionService;
