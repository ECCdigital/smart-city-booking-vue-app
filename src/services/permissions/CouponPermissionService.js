import user from "@/store/modules/user";

class CouponPermissionService {
  static isOwner(coupon) {
    return (
      coupon.ownerUserId === user.state.data.id &&
      coupon.tenant === user.state.data.tenant
    );
  }

  static allowCreate() {
    return user.state.data.permissions.manageBookings.create;
  }

  static allowUpdate(coupon) {
    return (
      user.state.data.permissions.manageBookings.updateAny ||
      (user.state.data.permissions.manageBookings.updateOwn &&
        CouponPermissionService.isOwner(coupon))
    );
  }

  static allowDelete(coupon) {
    return (
      user.state.data.permissions.manageBookings.deleteAny ||
      (user.state.data.permissions.manageBookings.deleteOwn &&
        CouponPermissionService.isOwner(coupon))
    );
  }
}

export default CouponPermissionService;
