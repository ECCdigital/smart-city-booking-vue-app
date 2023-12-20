import user from "@/store/modules/user";

class UserPermissionService {
  static isSelf(userObject) {
    return (
      userObject.id === user.state.data.id &&
      userObject.tenant === user.state.data.tenant
    );
  }

  static allowCreate() {
    return user.state.data.permissions.manageUsers.create;
  }

  static allowUpdate(userObject) {
    return (
      user.state.data.permissions.manageUsers.updateAny ||
      (user.state.data.permissions.manageUsers.updateOwn &&
        UserPermissionService.isSelf(userObject))
    );
  }

  static allowDelete(userObject) {
    return (
      user.state.data.permissions.manageUsers.deleteAny ||
      (user.state.data.permissions.manageUsers.deleteOwn &&
        UserPermissionService.isSelf(userObject))
    );
  }
}

export default UserPermissionService;
