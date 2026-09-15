import { beforeEach, describe, expect, it, vi } from "vitest";

const storeDouble = vi.hoisted(() => ({
  authorizedInterfaces: [],
  permissionsLoaded: true,
  loggedIn: true,
  currentTenantId: "tenant-a",
  memberOf: [],
  tenants: [],
  dispatch: vi.fn(),
}));

vi.mock("@/store", () => ({
  default: {
    // `tenants/select` takes effect on the double, so a later middleware
    // sees the tenant an earlier one switched to.
    dispatch: (...args) => {
      if (args[0] === "tenants/select") {
        storeDouble.currentTenantId = args[1];
      }
      return storeDouble.dispatch(...args);
    },
    get state() {
      return {
        user: {
          data: {
            permissions: {
              tenants: storeDouble.memberOf.map((tenantId) => ({ tenantId })),
            },
          },
        },
      };
    },
    getters: {
      get "tenants/tenants"() {
        return storeDouble.tenants;
      },
      get "user/isAuthorized"() {
        return (ifce) => storeDouble.authorizedInterfaces.includes(ifce);
      },
      get "user/permissionsLoaded"() {
        return storeDouble.permissionsLoaded;
      },
      get "user/isDenied"() {
        return (ifce) =>
          storeDouble.permissionsLoaded &&
          !storeDouble.authorizedInterfaces.includes(ifce);
      },
      get "user/isLoggedIn"() {
        return storeDouble.loggedIn;
      },
      get "tenants/currentTenantId"() {
        return storeDouble.currentTenantId;
      },
    },
  },
}));

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { me: vi.fn(async () => ({ data: { user: {}, permissions: {} } })) },
}));

const { middlewares, pipeline } = await import("@/router/middleware");
const { requiresAuth } = await import("@/router/middlewares/auth");
const { requireTenant } = await import("@/router/middlewares/requireTenant");
const { selectTenantFromQuery } = await import(
  "@/router/middlewares/tenantFromQuery"
);
const { requireInterfaceAccess } = await import(
  "@/router/middlewares/interface"
);

/** Runs a navigation through the real pipeline and reports how it ended. */
function navigateTo(meta, query = {}) {
  const next = vi.fn();
  const to = { meta, query, fullPath: "/coupons" };
  return pipeline({ to, from: {}, next }, middlewares, 0)().then(() => next);
}

const COUPONS = { requiresAuth: true, interfaceName: "coupons" };

beforeEach(() => {
  storeDouble.authorizedInterfaces = [];
  storeDouble.permissionsLoaded = true;
  storeDouble.loggedIn = true;
  storeDouble.currentTenantId = "tenant-a";
  storeDouble.memberOf = [];
  storeDouble.tenants = [];
  storeDouble.dispatch = vi.fn();
});

describe("router middleware pipeline", () => {
  it("runs the reach gate after authentication and tenant selection", () => {
    const gate = middlewares.indexOf(requireInterfaceAccess);

    expect(gate).toBeGreaterThan(middlewares.indexOf(requiresAuth));
    expect(gate).toBeGreaterThan(middlewares.indexOf(requireTenant));
  });

  it("switches the tenant from the query right after authentication", () => {
    expect(middlewares.indexOf(selectTenantFromQuery)).toBe(
      middlewares.indexOf(requiresAuth) + 1
    );
  });

  it("lets the tenant middleware see the tenant a Buchungslink switched to", async () => {
    storeDouble.currentTenantId = null;
    storeDouble.memberOf = ["tenant-b"];
    storeDouble.authorizedInterfaces = ["bookings"];
    const BOOKING_PAGE = {
      requiresAuth: true,
      interfaceName: "bookings",
      tenantFromQuery: true,
    };

    const next = await navigateTo(BOOKING_PAGE, { tenant: "tenant-b" });

    expect(next).toHaveBeenCalledWith();
    expect(storeDouble.currentTenantId).toBe("tenant-b");
  });

  it("lets a member with reach onto a tenant-scoped route", async () => {
    storeDouble.authorizedInterfaces = ["coupons"];

    const next = await navigateTo(COUPONS);

    expect(next).toHaveBeenCalledWith();
  });

  it("sends a member without reach to the tenant overview", async () => {
    const next = await navigateTo(COUPONS);

    expect(next).toHaveBeenCalledWith({ name: "dashboard" });
    expect(storeDouble.dispatch).toHaveBeenCalledWith(
      "toasts/add",
      expect.objectContaining({ type: "error" })
    );
  });

  it("leaves a missing tenant to the tenant middleware, without a reach verdict", async () => {
    storeDouble.currentTenantId = null;

    const next = await navigateTo(COUPONS);

    expect(next).toHaveBeenCalledWith({
      name: "dashboard",
      query: { redirect: "/coupons" },
    });
    expect(storeDouble.dispatch).not.toHaveBeenCalledWith(
      "toasts/add",
      expect.anything()
    );
  });
});
