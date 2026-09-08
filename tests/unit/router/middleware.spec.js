import { beforeEach, describe, expect, it, vi } from "vitest";

const storeDouble = vi.hoisted(() => ({
  authorizedInterfaces: [],
  permissionsLoaded: true,
  loggedIn: true,
  currentTenantId: "tenant-a",
  dispatch: vi.fn(),
}));

vi.mock("@/store", () => ({
  default: {
    dispatch: (...args) => storeDouble.dispatch(...args),
    getters: {
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
const { requireInterfaceAccess } = await import(
  "@/router/middlewares/interface"
);

/** Runs a navigation through the real pipeline and reports how it ended. */
function navigateTo(meta) {
  const next = vi.fn();
  const to = { meta, fullPath: "/coupons" };
  return pipeline({ to, from: {}, next }, middlewares, 0)().then(() => next);
}

const COUPONS = { requiresAuth: true, interfaceName: "coupons" };

beforeEach(() => {
  storeDouble.authorizedInterfaces = [];
  storeDouble.permissionsLoaded = true;
  storeDouble.loggedIn = true;
  storeDouble.currentTenantId = "tenant-a";
  storeDouble.dispatch = vi.fn();
});

describe("router middleware pipeline", () => {
  it("runs the reach gate after authentication and tenant selection", () => {
    const gate = middlewares.indexOf(requireInterfaceAccess);

    expect(gate).toBeGreaterThan(middlewares.indexOf(requiresAuth));
    expect(gate).toBeGreaterThan(middlewares.indexOf(requireTenant));
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
