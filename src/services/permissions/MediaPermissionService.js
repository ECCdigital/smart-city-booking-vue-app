import user from "@/store/modules/user";
import store from "@/store";

class MediaPermissionService {
  static isOwner(media) {
    return media.uploadedBy === user.state.data.user.id;
  }

  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner;
  }

  static allowCreate() {
    if (MediaPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    if (!permissions) return false;
    if (permissions.isOwner) return true;

    return permissions.manageMedia?.create ?? false;
  }

  static allowUpdate(media) {
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

  static allowDelete(media) {
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
