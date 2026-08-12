import user from "@/store/modules/user";
import store from "@/store";

/**
 * Who may see and change access points.
 *
 * Writing doors - creating, editing, deleting, QR codes, scan-code rotation
 * and the location prefill - is reserved for tenant owners. Reading the list
 * is additionally open to everyone who may read bookables, because the
 * selector in the bookable editor needs it.
 */
class AccessPointPermissionService {
  static _tenantPermissions() {
    const tenantId = store.getters["tenants/currentTenantId"];
    return user.state.data?.permissions?.tenants?.find(
      (p) => p.tenantId === tenantId
    );
  }

  static isInstanceOwner() {
    return user.state.data?.permissions?.instanceOwner === true;
  }

  static isTenantOwner() {
    return AccessPointPermissionService._tenantPermissions()?.isOwner === true;
  }

  static allowWrite() {
    return (
      AccessPointPermissionService.isInstanceOwner() ||
      AccessPointPermissionService.isTenantOwner()
    );
  }

  static allowRead() {
    if (AccessPointPermissionService.allowWrite()) return true;
    return (
      AccessPointPermissionService._tenantPermissions()?.manageBookables
        ?.readAny === true
    );
  }
}

export default AccessPointPermissionService;
