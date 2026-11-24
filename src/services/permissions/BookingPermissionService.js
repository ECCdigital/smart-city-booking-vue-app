import user from "@/store/modules/user";
import store from "@/store";

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
   * The transitions - Freigeben, Als bezahlt markieren, Ablehnen /
   * Stornieren, Widerruf akzeptieren, Wiederherstellen, of a booking and of
   * a series: the backend's `booking.commit`, `pay`, `reject`,
   * `acceptWithdrawal` and `update` (reinstate), and the same on
   * `groupBooking`, all `manageBookings.updateAny` with no variant for the
   * own booking. `updateOwn` does not open them.
   */
  static allowTransition() {
    if (BookingPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return !!permissions.manageBookings?.updateAny;
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

  /**
   * Whether `booking` may be deleted - in every state: `deleteAny` reaches
   * every booking of the tenant, `deleteOwn` the user's own (the backend's
   * `booking.delete`). The confirmation warns about a confirmed or paid
   * booking.
   */
  static allowDelete(booking) {
    if (BookingPermissionService.allowDeleteAny()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    return (
      !!permissions?.manageBookings?.deleteOwn &&
      BookingPermissionService.isOwner(booking)
    );
  }

  /**
   * The right to delete every booking of the tenant
   * (`manageBookings.deleteAny`), held by the instance owner and the tenant
   * owner as well. A whole series takes it: the backend's
   * `groupBooking.delete` has no `own`.
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
   * Whether correcting the first mail of a booking of the Buchungsweg Admin
   * to `primaryMail` hands the booking over, as the backend decides
   * (`ownerAfterEdit`): never to the editor themself, unless they may delete
   * every booking anyway - with `deleteOwn` alone they could delete it.
   */
  static mayTakeOverByMail(primaryMail) {
    const ownId = String(user.state.data?.user?.id || "").toLowerCase();
    if (!ownId || primaryMail !== ownId) return true;
    return BookingPermissionService.allowDeleteAny();
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
