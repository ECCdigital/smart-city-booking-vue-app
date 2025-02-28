import user from "@/store/modules/user";
import store from "@/store";

class BookablePermissionService {
  static isOwner(bookable) {
    return (
      bookable.ownerUserId === user.state.data.user.id
    );
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner
  }

  static allowCreate() {
    if (BookablePermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return permissions.manageBookables.create;
  }

  static allowUpdate(bookable) {
    if (BookablePermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return (
      permissions.manageBookables.updateAny ||
      (permissions.manageBookables.updateOwn &&
        BookablePermissionService.isOwner(bookable))
    );
  }

  static allowDelete(bookable) {
    if (BookablePermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return (
      permissions.manageBookables.deleteAny ||
      (permissions.manageBookables.deleteOwn &&
        BookablePermissionService.isOwner(bookable))
    );
  }
}

export default BookablePermissionService;
