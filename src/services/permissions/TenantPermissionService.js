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
   * reads for `Home.vue` and `InstanceTenants.vue`; the payload is read
   * directly here because every sibling permission service does, and the
   * getter is the shape components consume.
   */
  static allowCreate() {
    if (TenantPermissionService.isInstanceOwner()) return true;
    return user.state.data.permissions.allowCreateTenant === true;
  }

  /**
   * Ownership of one tenant, read from the membership the permissions payload
   * carries. Update and delete ask the identical question, so they share this.
   */
  static isTenantOwner(tenantId) {
    const permissions = user.state.data.permissions.tenants.find(
      (p) => p.tenantId === tenantId
    );
    return permissions?.isOwner === true;
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
    return TenantPermissionService.isTenantOwner(
      store.getters["tenants/currentTenantId"]
    );
  }

  /**
   * Deleting a tenant belongs to its owner and to the instance owner, exactly
   * like editing it.
   *
   * Ownership comes from the membership's `isOwner` flag, not from a field on
   * the tenant document: the tenant schema carries no owner field at all, so
   * the `tenant.ownerUserId` comparison this check used to make read
   * `undefined` and could never become true. Its `deleteOwn` path was dead.
   *
   * The tenant argument scopes the membership lookup, because the tenant being
   * deleted is not necessarily the selected one - the instance tenant list
   * deletes any of them. A tenant passed without an id resolves to no
   * membership and therefore to false: the check fails closed rather than
   * quietly answering for the selected tenant.
   */
  static allowDelete(tenant) {
    if (TenantPermissionService.isInstanceOwner()) return true;
    const tenantId = tenant
      ? tenant.id
      : store.getters["tenants/currentTenantId"];
    return TenantPermissionService.isTenantOwner(tenantId);
  }
}

export default TenantPermissionService;
