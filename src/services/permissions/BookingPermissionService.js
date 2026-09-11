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

  /**
   * Reissuing a receipt or cancellation receipt (spec E8): the backend's
   * `booking.reprint` - the booking's own user, or `manageBookings.updateAny`.
   */
  static allowReprint(booking) {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return (
      !!permissions.manageBookings?.updateAny ||
      BookingPermissionService.isOwner(booking)
    );
  }

  static allowAuditExport() {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return !!permissions.manageBookings?.readAny;
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

  static allowRead(booking) {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return (
      !!permissions.manageBookings?.readAny ||
      BookingPermissionService.isOwner(booking)
    );
  }
}

export default BookingPermissionService;
