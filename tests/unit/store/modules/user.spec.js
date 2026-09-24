import { beforeEach, describe, expect, it, vi } from "vitest";

const currentTenant = vi.hoisted(() => ({ id: "tenant-a" }));

// `user.js` reaches back into the store root for the current tenant, which
// makes the module circular; the double breaks the cycle for the spec.
vi.mock("@/store", () => ({
  default: {
    getters: {
      get "tenants/currentTenantId"() {
        return currentTenant.id;
      },
    },
  },
}));

const user = (await import("@/store/modules/user")).default;
const { isAuthorized, permissionsLoaded } = user.getters;

beforeEach(() => {
  currentTenant.id = "tenant-a";
});

/**
 * `isAuthorized` answers `false` for "not permitted" and for "not answered
 * yet" alike. The router gate must not confuse the two, so it asks
 * `permissionsLoaded` first.
 */
describe("user/permissionsLoaded", () => {
  it("is false before /me has answered", () => {
    expect(permissionsLoaded({ data: null })).toBe(false);
  });

  it("is false for a user payload without permissions", () => {
    expect(permissionsLoaded({ data: { user: { id: "u1" } } })).toBe(false);
  });

  it("is true once the permissions are there, even when empty", () => {
    expect(permissionsLoaded({ data: { permissions: { tenants: [] } } })).toBe(
      true
    );
    expect(permissionsLoaded({ data: { permissions: {} } })).toBe(true);
  });
});

/**
 * The one place that turns "not authorised" into "denied": every caller that
 * takes something away from the user asks this, so that a permission set
 * which has not arrived yet never counts as a denial.
 */
describe("user/isDenied", () => {
  const membership = {
    data: {
      permissions: {
        tenants: [{ tenantId: "tenant-a", adminInterfaces: ["coupons"] }],
      },
    },
  };

  function denied(state, ifce) {
    return user.getters.isDenied(state, {
      permissionsLoaded: permissionsLoaded(state),
      isAuthorized: isAuthorized(state),
    })(ifce);
  }

  it("denies an interface the membership does not carry", () => {
    expect(denied(membership, "rooms")).toBe(true);
  });

  it("does not deny what the membership carries", () => {
    expect(denied(membership, "coupons")).toBe(false);
  });

  it("denies nothing while the permissions are not loaded", () => {
    expect(denied({ data: null }, "coupons")).toBe(false);
    expect(denied({ data: { user: {} } }, "coupons")).toBe(false);
  });
});

/** Characterisation of the getter the navbar and the router gate share. */
describe("user/isAuthorized", () => {
  it("grants an instance owner every interface", () => {
    const state = { data: { permissions: { instanceOwner: true } } };

    expect(isAuthorized(state)("coupons")).toBe(true);
  });

  it("grants what the membership at the current tenant carries", () => {
    const state = {
      data: {
        permissions: {
          tenants: [{ tenantId: "tenant-a", adminInterfaces: ["coupons"] }],
        },
      },
    };

    expect(isAuthorized(state)("coupons")).toBe(true);
    expect(isAuthorized(state)("rooms")).toBe(false);
  });

  it("follows the tenant switch", () => {
    const state = {
      data: {
        permissions: {
          tenants: [
            { tenantId: "tenant-a", adminInterfaces: ["coupons"] },
            { tenantId: "tenant-b", adminInterfaces: ["rooms"] },
          ],
        },
      },
    };

    currentTenant.id = "tenant-b";

    expect(isAuthorized(state)("coupons")).toBe(false);
    expect(isAuthorized(state)("rooms")).toBe(true);
  });

  it("denies where there is no membership at the current tenant", () => {
    const state = { data: { permissions: { tenants: [] } } };

    expect(isAuthorized(state)("coupons")).toBe(false);
  });

  it("denies while the permissions are not loaded", () => {
    expect(isAuthorized({ data: null })("coupons")).toBe(false);
    expect(isAuthorized({ data: { user: {} } })("coupons")).toBe(false);
  });
});

/**
 * Every sign-in answer names the supervision of each tenant of the user in
 * `permissions.tenants[]`, so the UI marks a waiting or declined tenant
 * before its first request.
 */
describe("user/supervisionLevelOf", () => {
  const state = {
    data: {
      permissions: {
        tenants: [
          { tenantId: "tenant-a", supervisionLevel: "pending" },
          { tenantId: "tenant-b" },
        ],
      },
    },
  };

  function levelOf(someState, tenantId) {
    return user.getters.supervisionLevelOf(someState)(tenantId);
  }

  it("reads the level of a tenant from its membership", () => {
    expect(levelOf(state, "tenant-a")).toBe("pending");
  });

  it("knows no level without a membership, without the field or before the permissions", () => {
    expect(levelOf(state, "tenant-x")).toBeNull();
    expect(levelOf(state, "tenant-b")).toBeNull();
    expect(levelOf({ data: null }, "tenant-a")).toBeNull();
  });
});

/**
 * A declined tenant (glossary „abgewiesen“) is closed to its own people; the
 * instance owner keeps every tenant.
 */
describe("user/declinedMembership", () => {
  const declined = {
    tenantId: "tenant-a",
    supervisionLevel: "declined",
    supervisionChangedAt: "2026-09-24T10:00:00.000Z",
    supervisionReason: "Kein Impressum",
  };

  function declinedMembership(permissions, tenantId) {
    return user.getters.declinedMembership({ data: { permissions } })(tenantId);
  }

  it("names the membership of a declined tenant, with time and reason", () => {
    expect(declinedMembership({ tenants: [declined] }, "tenant-a")).toEqual(
      declined
    );
  });

  it("leaves every other level and a tenant without membership open", () => {
    const permissions = {
      tenants: [
        { tenantId: "tenant-a", supervisionLevel: "pending" },
        { tenantId: "tenant-b", supervisionLevel: "free" },
        { tenantId: "tenant-c" },
      ],
    };

    for (const tenantId of ["tenant-a", "tenant-b", "tenant-c", "tenant-x"]) {
      expect(declinedMembership(permissions, tenantId)).toBeNull();
    }
  });

  it("closes nothing to an instance owner", () => {
    const permissions = { instanceOwner: true, tenants: [declined] };

    expect(declinedMembership(permissions, "tenant-a")).toBeNull();
  });

  it("closes nothing while the permissions are not loaded", () => {
    expect(
      user.getters.declinedMembership({ data: null })("tenant-a")
    ).toBeNull();
  });
});
