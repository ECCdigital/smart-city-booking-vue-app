import user from "@/store/modules/user";
import store from "@/store";

class BookingPermissionService {
  static isOwner(booking) {
    return booking.assignedUserId === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner
  }

  static allowCreate() {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return permissions.manageBookings.create;
  }

  static allowUpdate(booking) {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return (
      permissions.manageBookings.updateAny ||
      (permissions.manageBookings.updateOwn &&
        BookingPermissionService.isOwner(booking))
    );
  }

  static allowDelete(booking) {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return (
      permissions.manageBookings.deleteAny ||
      (permissions.manageBookings.deleteOwn &&
        BookingPermissionService.isOwner(booking))
    );
  }
}

export default BookingPermissionService;
