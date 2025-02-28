import user from "@/store/modules/user";

class UserPermissionService {
  static isSelf(userObject) {
    return userObject.id === user.state.data.user.id;
  }

  static allowCreate() {
    return true;
  }

  static allowUpdate() {
    return true;
  }

  static allowDelete() {
    return true;
  }
}

export default UserPermissionService;
