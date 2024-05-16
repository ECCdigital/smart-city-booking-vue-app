import user from "@/store/modules/user";

class TenantPermissionService {
  static isOwner(tenant) {
    return (
      tenant.ownerUserId === user.state.data.id &&
      tenant.name === user.state.data.tenant
    );
  }
  static allowCreate() {
    return user.state.data.permissions.manageTenants.create;
  }

  static allowUpdate(tenant) {
    return (
      user.state.data.permissions.manageTenants.updateAny ||
      (user.state.data.permissions.manageTenants.updateOwn &&
        TenantPermissionService.isOwner(tenant))
    );
  }

  static allowDelete(tenant) {
    return (
      user.state.data.permissions.manageTenants.deleteAny ||
      (user.state.data.permissions.manageTenants.deleteOwn &&
        TenantPermissionService.isOwner(tenant))
    );
  }
}

export default TenantPermissionService;
