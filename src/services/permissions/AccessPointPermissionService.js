import user from "@/store/modules/user";
import store from "@/store";

/**
 * Who may change access points.
 *
 * Writing doors - creating, editing, deleting, QR codes, scan-code rotation
 * and the location prefill - is reserved for tenant owners. Reading the list
 * is open to everyone who may read bookables, but that is only needed by the
 * selector in the bookable editor and therefore not decided here.
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
}

export default AccessPointPermissionService;
