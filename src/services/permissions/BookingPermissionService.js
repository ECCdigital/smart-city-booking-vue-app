import user from "@/store/modules/user";
import store from "@/store";
import { allowsAction, BOOKING_ACTION } from "@/utils/bookingStatus";

class BookingPermissionService {
  static isOwner(booking) {
    return booking.assignedUserId === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner;
  }

  static allowCreate() {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return permissions.manageBookings.create;
  }

  static allowUpdate(booking) {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

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

  /**
   * The Reichweite of CONTEXT.md: *any* for the instance owner, the tenant
   * owner and `manageBookings.readAny` at the current tenant, *own* for every
   * other member. The Buchungsseite words a 404 by it.
   */
  static allowReadAny() {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return !!permissions.manageBookings?.readAny;
  }

  static allowAuditExport() {
    return BookingPermissionService.allowReadAny();
  }

  static allowDelete(booking) {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return (
      permissions.manageBookings.deleteAny ||
      (permissions.manageBookings.deleteOwn &&
        BookingPermissionService.isOwner(booking))
    );
  }

  /**
   * The right to delete every booking of the tenant: the backend's
   * `booking.delete` (`manageBookings.deleteAny`), held by the instance
   * owner and the tenant owner as well.
   */
  static allowDeleteAny() {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return !!permissions.manageBookings?.deleteAny;
  }

  /**
   * Whether the hard delete is offered for `booking`: where its state allows
   * it (Angefragt, Abgelehnt) to whoever may delete it, and in every state to
   * whoever may delete every booking - so test bookings can be taken out
   * after they were confirmed or cancelled.
   */
  static allowHardDelete(booking) {
    if (BookingPermissionService.allowDeleteAny()) return true;
    return (
      !!BookingPermissionService.allowDelete(booking) &&
      allowsAction(booking, BOOKING_ACTION.DELETE)
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
