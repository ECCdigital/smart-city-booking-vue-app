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

const { isTenantMember } = await import("@/utils/tenantMembership");

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
