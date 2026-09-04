import { beforeEach, describe, expect, it, vi } from "vitest";

const userState = { data: null };
const storeState = { currentTenantId: null };

vi.mock("@/store/modules/user", () => ({
  default: { state: userState },
}));

vi.mock("@/store", () => ({
  default: {
    getters: {
      get "tenants/currentTenantId"() {
        return storeState.currentTenantId;
      },
    },
  },
}));

const TenantPermissionService = (
  await import("@/services/permissions/TenantPermissionService")
).default;

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";

function signIn({ instanceOwner = false, tenants = [] } = {}) {
  userState.data = {
    user: { id: USER_ID },
    permissions: { instanceOwner, tenants },
  };
}

function membership(overrides = {}) {
  return { tenantId: TENANT_ID, ...overrides };
}

/**
 * Characterisation: the service reads the permissions payload straight from the
 * user store singleton and scopes it with `tenants/currentTenantId`. Pinned
 * here before the permissions strand touches `manageTenants` gating.
 */
describe("TenantPermissionService", () => {
  beforeEach(() => {
    userState.data = null;
    storeState.currentTenantId = TENANT_ID;
  });

  describe("isInstanceOwner", () => {
    it("mirrors the flag from the permissions payload", () => {
      signIn({ instanceOwner: true });
      expect(TenantPermissionService.isInstanceOwner()).toBe(true);
      signIn({ instanceOwner: false });
      expect(TenantPermissionService.isInstanceOwner()).toBe(false);
    });

    it("throws when nobody is signed in", () => {
      expect(() => TenantPermissionService.isInstanceOwner()).toThrow();
    });
  });

  describe("isOwner", () => {
    it("compares the tenant's owner against the signed-in user id", () => {
      signIn();
      expect(TenantPermissionService.isOwner({ ownerUserId: USER_ID })).toBe(
        true
      );
      expect(TenantPermissionService.isOwner({ ownerUserId: "someone" })).toBe(
        false
      );
    });
  });

  describe("allowCreate", () => {
    it("lets the instance owner through without looking at memberships", () => {
      signIn({ instanceOwner: true, tenants: [] });
      expect(TenantPermissionService.allowCreate()).toBe(true);
    });

    it("reads `manageTenants.create` of the current tenant's membership", () => {
      signIn({
        tenants: [membership({ manageTenants: { create: true } })],
      });
      expect(TenantPermissionService.allowCreate()).toBe(true);

      signIn({
        tenants: [membership({ manageTenants: { create: false } })],
      });
      expect(TenantPermissionService.allowCreate()).toBe(false);
    });

    it("returns false without a membership for the current tenant", () => {
      signIn({ tenants: [membership({ tenantId: "other-tenant" })] });
      expect(TenantPermissionService.allowCreate()).toBe(false);
    });

    it("returns undefined - not false - when the membership carries no `manageTenants`", () => {
      signIn({ tenants: [membership()] });
      expect(TenantPermissionService.allowCreate()).toBeUndefined();
    });
  });

  describe("allowUpdate", () => {
    it("lets the instance owner through", () => {
      signIn({ instanceOwner: true, tenants: [] });
      expect(TenantPermissionService.allowUpdate()).toBe(true);
    });

    it("asks the membership's `isOwner` flag, not `manageTenants`", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowUpdate()).toBe(true);

      signIn({
        tenants: [
          membership({ isOwner: false, manageTenants: { updateAny: true } }),
        ],
      });
      expect(TenantPermissionService.allowUpdate()).toBe(false);
    });

    it("returns false without a membership for the current tenant", () => {
      signIn({ tenants: [membership({ tenantId: "other-tenant" })] });
      expect(TenantPermissionService.allowUpdate()).toBe(false);
    });
  });

  describe("allowDelete", () => {
    const ownedTenant = { ownerUserId: USER_ID };
    const foreignTenant = { ownerUserId: "someone" };

    it("lets the instance owner through", () => {
      signIn({ instanceOwner: true, tenants: [] });
      expect(TenantPermissionService.allowDelete(foreignTenant)).toBe(true);
    });

    it("accepts `deleteAny` for any tenant", () => {
      signIn({ tenants: [membership({ manageTenants: { deleteAny: true } })] });
      expect(TenantPermissionService.allowDelete(foreignTenant)).toBe(true);
    });

    it("limits `deleteOwn` to tenants the user owns", () => {
      signIn({ tenants: [membership({ manageTenants: { deleteOwn: true } })] });
      expect(TenantPermissionService.allowDelete(ownedTenant)).toBe(true);
      expect(TenantPermissionService.allowDelete(foreignTenant)).toBe(false);
    });

    it("returns false without a membership for the current tenant", () => {
      signIn({ tenants: [membership({ tenantId: "other-tenant" })] });
      expect(TenantPermissionService.allowDelete(ownedTenant)).toBe(false);
    });

    it("returns undefined - not false - when the membership carries no `manageTenants`", () => {
      signIn({ tenants: [membership()] });
      expect(TenantPermissionService.allowDelete(ownedTenant)).toBeUndefined();
    });
  });

  it("re-reads the current tenant on every call", () => {
    signIn({
      tenants: [
        membership({ tenantId: "tenant-a", isOwner: true }),
        membership({ tenantId: "tenant-b", isOwner: false }),
      ],
    });

    storeState.currentTenantId = "tenant-a";
    expect(TenantPermissionService.allowUpdate()).toBe(true);

    storeState.currentTenantId = "tenant-b";
    expect(TenantPermissionService.allowUpdate()).toBe(false);
  });
});
