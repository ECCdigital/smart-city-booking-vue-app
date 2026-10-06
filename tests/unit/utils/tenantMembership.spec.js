import { beforeEach, describe, expect, it, vi } from "vitest";

const storeDouble = vi.hoisted(() => ({
  permissions: null,
  tenants: [],
}));

vi.mock("@/store", () => ({
  default: {
    get state() {
      return { user: { data: { permissions: storeDouble.permissions } } };
    },
    getters: {
      get "tenants/tenants"() {
        return storeDouble.tenants;
      },
    },
  },
}));

const { isTenantMember, tenantToHold } = await import(
  "@/utils/tenantMembership"
);

beforeEach(() => {
  storeDouble.permissions = null;
  storeDouble.tenants = [];
});

describe("isTenantMember", () => {
  it("answers true for a tenant the permissions list", () => {
    storeDouble.permissions = { tenants: [{ tenantId: "tenant-a" }] };

    expect(isTenantMember("tenant-a")).toBe(true);
  });

  it("answers true for an instance owner whose tenant list carries the id", () => {
    storeDouble.permissions = { instanceOwner: true, tenants: [] };
    storeDouble.tenants = [{ id: "tenant-b", name: "Tenant B" }];

    expect(isTenantMember("tenant-b")).toBe(true);
  });

  it("answers false for an instance owner whose tenant list lacks the id", () => {
    storeDouble.permissions = { instanceOwner: true, tenants: [] };
    storeDouble.tenants = [{ id: "tenant-b", name: "Tenant B" }];

    expect(isTenantMember("tenant-x")).toBe(false);
  });

  it("answers false for a member of other tenants only", () => {
    storeDouble.permissions = { tenants: [{ tenantId: "tenant-a" }] };
    storeDouble.tenants = [{ id: "tenant-b", name: "Tenant B" }];

    expect(isTenantMember("tenant-b")).toBe(false);
  });

  it("answers false while no permissions are loaded", () => {
    storeDouble.permissions = null;

    expect(isTenantMember("tenant-a")).toBe(false);
  });

  it("answers false for a non-string id", () => {
    storeDouble.permissions = {
      instanceOwner: true,
      tenants: [{ tenantId: undefined }],
    };
    storeDouble.tenants = [{ id: undefined }];

    expect(isTenantMember(undefined)).toBe(false);
    expect(isTenantMember(null)).toBe(false);
    expect(isTenantMember(42)).toBe(false);
  });
});

/**
 * A stored `currentTenantId` outlives a membership. Once the permissions
 * arrive, the tenant to hold is one the user is still a Mitglied of.
 */
describe("tenantToHold", () => {
  it("keeps the current tenant while the permissions list it", () => {
    const permissions = {
      tenants: [{ tenantId: "tenant-a" }, { tenantId: "tenant-b" }],
    };

    expect(tenantToHold("tenant-b", permissions)).toBe("tenant-b");
  });

  it("replaces a tenant the user is no Mitglied of by the first membership", () => {
    const permissions = {
      tenants: [{ tenantId: "tenant-a" }, { tenantId: "tenant-b" }],
    };

    expect(tenantToHold("tenant-x", permissions)).toBe("tenant-a");
  });

  it("clears a tenant the user is no Mitglied of when there is no membership left", () => {
    expect(tenantToHold("tenant-x", { tenants: [] })).toBe(null);
    expect(tenantToHold("tenant-x", {})).toBe(null);
  });

  it("keeps the current tenant of an instance owner: the tenant list decides for them", () => {
    const permissions = { instanceOwner: true, tenants: [] };

    expect(tenantToHold("tenant-x", permissions)).toBe("tenant-x");
  });

  it("keeps an empty current tenant: the pickers fill it", () => {
    const permissions = { tenants: [{ tenantId: "tenant-a" }] };

    expect(tenantToHold(null, permissions)).toBe(null);
  });

  it("keeps the current tenant while no permissions are loaded", () => {
    expect(tenantToHold("tenant-x", null)).toBe("tenant-x");
    expect(tenantToHold("tenant-x", undefined)).toBe("tenant-x");
  });
});
