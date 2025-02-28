import user from "@/store/modules/user";
import store from "@/store";

class CouponPermissionService {
  static isOwner(coupon) {
    return coupon.ownerUserId === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner
  }

  static allowCreate() {
    if (CouponPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return permissions.manageBookings.create;
  }

  static allowUpdate(coupon) {
    if (CouponPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return (
      permissions.manageBookings.updateAny ||
      (permissions.manageBookings.updateOwn &&
        CouponPermissionService.isOwner(coupon))
    );
  }

  static allowDelete(coupon) {
    if (CouponPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if(permissions.isOwner) return true;

    return (
      permissions.manageBookings.deleteAny ||
      (permissions.manageBookings.deleteOwn &&
        CouponPermissionService.isOwner(coupon))
    );
  }
}

export default CouponPermissionService;
