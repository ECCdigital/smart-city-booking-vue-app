import user from "@/store/modules/user";
import store from "@/store";

class TenantPermissionService {
  static isInstanceOwner() {
    return user.state.data.permissions.instanceOwner;
  }

  /**
   * Creating a tenant is an instance setting, not a role and not tenant
   * ownership - the backend authorises `createTenant` against
   * `allowCreateTenant`, which the permissions payload carries at the top
   * level. This is the same signal the `user/allowToCreateTenants` getter
   * reads for `Home.vue` and `InstanceTenants.vue`.
   */
  static allowCreate() {
    if (TenantPermissionService.isInstanceOwner()) return true;
    return user.state.data.permissions.allowCreateTenant === true;
  }

  /**
   * Editing a tenant belongs to its owner and to the instance owner - the
   * backend authorises `updateTenant` exactly that way.
   *
   * The membership's `isOwner` flag is what the permissions payload actually
   * carries. There is no `manageTenants` dimension in it, so asking for one
   * locked every tenant owner out of the tenant and access pages.
   */
  static allowUpdate() {
    if (TenantPermissionService.isInstanceOwner()) return true;
    const tenantId = store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    return permissions?.isOwner === true;
  }

  /**
   * Deleting a tenant belongs to its owner and to the instance owner, exactly
   * like editing it.
   *
   * Ownership comes from the membership's `isOwner` flag, not from a field on
   * the tenant document: the tenant carries `ownerUserIds` (a list), never an
   * `ownerUserId`, so the comparison this check used to make could not become
   * true for any tenant the API sends.
   *
   * The tenant argument scopes the membership lookup, because the tenant being
   * deleted is not necessarily the selected one - the instance tenant list
   * deletes any of them.
   */
  static allowDelete(tenant) {
    if (TenantPermissionService.isInstanceOwner()) return true;
    const tenantId = tenant?.id || store.getters["tenants/currentTenantId"];
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    return permissions?.isOwner === true;
  }
}

export default TenantPermissionService;
