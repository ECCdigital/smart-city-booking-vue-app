import user from "@/store/modules/user";

class BookablePermissionService {
  static isOwner(bookable) {
    return (
      bookable.ownerUserId === user.state.data.id &&
      bookable.tenant === user.state.data.tenant
    );
  }

  static allowCreate() {
    return user.state.data.permissions.manageBookables.create;
  }

  static allowUpdate(bookable) {
    return (
      user.state.data.permissions.manageBookables.updateAny ||
      (user.state.data.permissions.manageBookables.updateOwn &&
        BookablePermissionService.isOwner(bookable))
    );
  }

  static allowDelete(bookable) {
    return (
      user.state.data.permissions.manageBookables.deleteAny ||
      (user.state.data.permissions.manageBookables.deleteOwn &&
        BookablePermissionService.isOwner(bookable))
    );
  }
}

export default BookablePermissionService;
