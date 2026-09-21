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

function signIn({
  instanceOwner = false,
  allowCreateTenant = false,
  tenants = [],
} = {}) {
  userState.data = {
    user: { id: USER_ID },
    permissions: { instanceOwner, allowCreateTenant, tenants },
  };
}

function membership(overrides = {}) {
  return { tenantId: TENANT_ID, ...overrides };
}

/**
 * The service reads the permissions payload straight from the user store
 * singleton and scopes it with `tenants/currentTenantId`.
 *
 * Rewritten with §E7 of the permissions strand: 4.3.x dropped the
 * `manageTenants` role dimension, so creating a tenant now follows the
 * instance setting `allowCreateTenant` and deleting one follows the
 * membership's `isOwner` flag. The characterisation quirks this file used to
 * pin - `allowCreate`/`allowDelete` returning `undefined` rather than `false`
 * - went away with the dimension they read.
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

  describe("allowCreate", () => {
    it("lets the instance owner through", () => {
      signIn({ instanceOwner: true, allowCreateTenant: false });
      expect(TenantPermissionService.allowCreate()).toBe(true);
    });

    it("reads the instance setting `allowCreateTenant`", () => {
      signIn({ allowCreateTenant: true });
      expect(TenantPermissionService.allowCreate()).toBe(true);

      signIn({ allowCreateTenant: false });
      expect(TenantPermissionService.allowCreate()).toBe(false);
    });

    it("does not look at tenant memberships at all", () => {
      signIn({
        allowCreateTenant: true,
        tenants: [membership({ tenantId: "other-tenant" })],
      });
      storeState.currentTenantId = TENANT_ID;
      expect(TenantPermissionService.allowCreate()).toBe(true);

      signIn({ allowCreateTenant: false, tenants: [membership()] });
      expect(TenantPermissionService.allowCreate()).toBe(false);
    });

    it("returns false - not undefined - when the payload omits the setting", () => {
      signIn();
      delete userState.data.permissions.allowCreateTenant;
      expect(TenantPermissionService.allowCreate()).toBe(false);
    });
  });

  describe("allowUpdate", () => {
    it("lets the instance owner through", () => {
      signIn({ instanceOwner: true, tenants: [] });
      expect(TenantPermissionService.allowUpdate()).toBe(true);
    });

    it("asks the membership's `isOwner` flag", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowUpdate()).toBe(true);

      signIn({ tenants: [membership({ isOwner: false })] });
      expect(TenantPermissionService.allowUpdate()).toBe(false);
    });

    it("ignores role dimensions - no role grants tenant editing", () => {
      signIn({
        tenants: [
          membership({ isOwner: false, manageUsers: { updateAny: true } }),
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
    it("lets the instance owner through", () => {
      signIn({ instanceOwner: true, tenants: [] });
      expect(TenantPermissionService.allowDelete({ id: TENANT_ID })).toBe(true);
    });

    it("asks the membership's `isOwner` flag", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowDelete({ id: TENANT_ID })).toBe(true);

      signIn({ tenants: [membership({ isOwner: false })] });
      expect(TenantPermissionService.allowDelete({ id: TENANT_ID })).toBe(
        false
      );
    });

    it("scopes the lookup to the tenant that is about to be deleted", () => {
      signIn({
        tenants: [
          membership({ tenantId: "tenant-a", isOwner: true }),
          membership({ tenantId: "tenant-b", isOwner: false }),
        ],
      });
      storeState.currentTenantId = "tenant-a";

      expect(TenantPermissionService.allowDelete({ id: "tenant-a" })).toBe(
        true
      );
      expect(TenantPermissionService.allowDelete({ id: "tenant-b" })).toBe(
        false
      );
    });

    it("falls back to the current tenant when none is passed", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowDelete()).toBe(true);
    });

    it("returns false without a membership for that tenant", () => {
      signIn({ tenants: [membership({ tenantId: "other-tenant" })] });
      expect(TenantPermissionService.allowDelete({ id: TENANT_ID })).toBe(
        false
      );
    });
  });

  describe("allowReadiness", () => {
    it("lets the instance owner see the check of any tenant", () => {
      signIn({ instanceOwner: true, tenants: [] });
      expect(TenantPermissionService.allowReadiness("other-tenant")).toBe(true);
    });

    it("lets the owner of that tenant see it", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowReadiness(TENANT_ID)).toBe(true);
    });

    it("keeps it from members who do not own the tenant", () => {
      signIn({
        tenants: [
          membership({ isOwner: false, manageUsers: { updateAny: true } }),
        ],
      });
      expect(TenantPermissionService.allowReadiness(TENANT_ID)).toBe(false);
    });

    it("keeps the check of a foreign tenant from another tenant's owner", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowReadiness("other-tenant")).toBe(
        false
      );
    });

    it("falls back to the current tenant when none is passed", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowReadiness()).toBe(true);
    });
  });

  // Backend: `reviewSubmit: { own: "tenantOwner", any: "instanceOwner" }`,
  // `reviewDecide: { any: "instanceOwner" }` - for bookables and events alike.
  describe("reviewViewer", () => {
    it("names the owner of the tenant as the one who submits", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.reviewViewer(TENANT_ID)).toEqual({
        tenantOwner: true,
        instanceOwner: false,
      });
    });

    it("names the instance owner as the one who decides", () => {
      signIn({ instanceOwner: true });
      expect(TenantPermissionService.reviewViewer(TENANT_ID)).toEqual({
        tenantOwner: false,
        instanceOwner: true,
      });
    });

    it("names a member without ownership, and another tenant's owner, as neither", () => {
      signIn({ tenants: [membership({ isOwner: false })] });
      expect(TenantPermissionService.reviewViewer(TENANT_ID)).toEqual({
        tenantOwner: false,
        instanceOwner: false,
      });

      signIn({ tenants: [membership({ isOwner: true })] });
      expect(
        TenantPermissionService.reviewViewer("other-tenant").tenantOwner
      ).toBe(false);
    });
  });

  describe("allowSupervise", () => {
    it("lets the instance owner change the supervision level", () => {
      signIn({ instanceOwner: true });
      expect(TenantPermissionService.allowSupervise()).toBe(true);
    });

    it("keeps the level change from a tenant owner", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowSupervise()).toBe(false);
    });
  });

  describe("allowSupervisionHistory", () => {
    it("lets the instance owner read the history of any tenant", () => {
      signIn({ instanceOwner: true, tenants: [] });
      expect(
        TenantPermissionService.allowSupervisionHistory("other-tenant")
      ).toBe(true);
    });

    it("lets the owner of the tenant read its history", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowSupervisionHistory()).toBe(true);
    });

    it("keeps it from members who do not own the tenant", () => {
      signIn({ tenants: [membership({ isOwner: false })] });
      expect(TenantPermissionService.allowSupervisionHistory(TENANT_ID)).toBe(
        false
      );
    });

    it("keeps a foreign tenant's history from another tenant's owner", () => {
      signIn({ tenants: [membership({ isOwner: true })] });
      expect(
        TenantPermissionService.allowSupervisionHistory("other-tenant")
      ).toBe(false);
    });
  });

  describe("allowInstanceSupervisionHistory", () => {
    it("is the instance owner's alone", () => {
      signIn({ instanceOwner: true });
      expect(TenantPermissionService.allowInstanceSupervisionHistory()).toBe(
        true
      );

      signIn({ tenants: [membership({ isOwner: true })] });
      expect(TenantPermissionService.allowInstanceSupervisionHistory()).toBe(
        false
      );
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
