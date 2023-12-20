import user from "@/store/modules/user";

class BookingPermissionService {
  static isOwner(booking) {
    return (
      booking.assignedUserId === user.state.data.id &&
      booking.tenant === user.state.data.tenant
    );
  }

  static allowCreate() {
    return user.state.data.permissions.manageBookings.create;
  }

  static allowUpdate(booking) {
    return (
      user.state.data.permissions.manageBookings.updateAny ||
      (user.state.data.permissions.manageBookings.updateOwn &&
        BookingPermissionService.isOwner(booking))
    );
  }

  static allowDelete(booking) {
    return (
      user.state.data.permissions.manageBookings.deleteAny ||
      (user.state.data.permissions.manageBookings.deleteOwn &&
        BookingPermissionService.isOwner(booking))
    );
  }
}

export default BookingPermissionService;
