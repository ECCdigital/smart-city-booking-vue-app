import user from "@/store/modules/user";
import store from "@/store";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";

class MediaPermissionService {
  static isOwner(media) {
    return media.uploadedBy === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner;
  }

  // Instance media know no tenant whose roles could grant anything — every
  // write there is the instance owner's alone (§4.9 of the media spec). The
  // tenant scope follows the manageMedia role group.
  static allowCreate(scope) {
    if (scope === MEDIA_SCOPE.INSTANCE) {
      return MediaPermissionService.isInstanceOwner();
    }
    if (MediaPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return permissions.manageMedia?.create ?? false;
  }

  static allowUpdate(media, scope) {
    if (scope === MEDIA_SCOPE.INSTANCE) {
      return MediaPermissionService.isInstanceOwner();
    }
    if (MediaPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return (
      permissions.manageMedia?.updateAny ||
      (permissions.manageMedia?.updateOwn &&
        MediaPermissionService.isOwner(media))
    );
  }

  static allowDelete(media, scope) {
    if (scope === MEDIA_SCOPE.INSTANCE) {
      return MediaPermissionService.isInstanceOwner();
    }
    if (MediaPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return (
      permissions.manageMedia?.deleteAny ||
      (permissions.manageMedia?.deleteOwn &&
        MediaPermissionService.isOwner(media))
    );
  }
}

export default MediaPermissionService;
