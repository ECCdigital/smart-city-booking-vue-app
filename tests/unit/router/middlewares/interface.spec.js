import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/language/index";

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
      // Mirrors the real getter: denied only where the reach is known.
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

const { checkInterface, requireInterfaceAccess } = await import(
  "@/router/middlewares/interface"
);

/** A tenant-scoped route as `src/router/index.js` declares it. */
function gatedRoute(interfaceName = "coupons") {
  return { meta: { requiresAuth: true, interfaceName } };
}

beforeEach(() => {
  storeDouble.authorizedInterfaces = [];
  storeDouble.permissionsLoaded = true;
  storeDouble.loggedIn = true;
  storeDouble.currentTenantId = "tenant-a";
  storeDouble.dispatch = vi.fn();
});

describe("requireInterfaceAccess", () => {
  describe("on a tenant-scoped route", () => {
    it("turns a user without reach away", async () => {
      const next = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("coupons"), next });

      expect(next).toHaveBeenCalledWith({ name: "dashboard" });
    });

    it("says why, instead of bouncing silently", async () => {
      await requireInterfaceAccess({ to: gatedRoute("rooms"), next: vi.fn() });

      expect(storeDouble.dispatch).toHaveBeenCalledWith(
        "toasts/add",
        expect.objectContaining({
          title: i18n.t("errors.interface-forbidden.title"),
          message: i18n.t("errors.interface-forbidden.message"),
          type: "error",
        })
      );
    });

    it("lets a user with reach through", async () => {
      storeDouble.authorizedInterfaces = ["coupons"];
      const next = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("coupons"), next });

      expect(next).toHaveBeenCalledWith();
      expect(storeDouble.dispatch).not.toHaveBeenCalled();
    });

    it("asks for the reach the route names, not for another", async () => {
      storeDouble.authorizedInterfaces = ["rooms"];
      const next = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("resources"), next });

      expect(next).toHaveBeenCalledWith({ name: "dashboard" });
    });

    it("gates every tenant-scoped interface of the navigation", async () => {
      const gated = [
        "bookings",
        "coupons",
        "locations",
        "rooms",
        "resources",
        "tickets",
        "events",
        "media",
        "tenants",
        "users",
        "roles",
      ];

      for (const interfaceName of gated) {
        const next = vi.fn();
        await requireInterfaceAccess({ to: gatedRoute(interfaceName), next });
        expect(next).toHaveBeenCalledWith({ name: "dashboard" });
      }
    });
  });

  describe("where the answer cannot be trusted", () => {
    it("lets the route through while the permissions are not loaded", async () => {
      storeDouble.permissionsLoaded = false;
      const next = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("coupons"), next });

      expect(next).toHaveBeenCalledWith();
      expect(storeDouble.dispatch).not.toHaveBeenCalled();
    });

    it("lets the route through while no tenant is selected", async () => {
      storeDouble.currentTenantId = null;
      const next = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("coupons"), next });

      expect(next).toHaveBeenCalledWith();
      expect(storeDouble.dispatch).not.toHaveBeenCalled();
    });

    it("leaves an anonymous visitor to the authentication middleware", async () => {
      storeDouble.loggedIn = false;
      const next = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("coupons"), next });

      expect(next).toHaveBeenCalledWith();
      expect(storeDouble.dispatch).not.toHaveBeenCalled();
    });
  });

  describe("on a route it does not gate", () => {
    it("lets the tenant dashboard through — it is where the gate redirects", async () => {
      const next = vi.fn();

      await requireInterfaceAccess({
        to: {
          meta: {
            requiresAuth: true,
            interfaceName: "dashboard",
            public: true,
          },
        },
        next,
      });

      expect(next).toHaveBeenCalledWith();
    });

    it("lets the tenant-exempt interfaces through", async () => {
      for (const interfaceName of ["instance", "settings"]) {
        const next = vi.fn();
        await requireInterfaceAccess({
          to: { meta: { requiresAuth: true, interfaceName } },
          next,
        });
        expect(next).toHaveBeenCalledWith();
      }
    });

    it("lets a route without an interface name through", async () => {
      const next = vi.fn();

      await requireInterfaceAccess({
        to: { meta: { requiresAuth: true } },
        next,
      });

      expect(next).toHaveBeenCalledWith();
    });

    it("lets a route that needs no authentication through", async () => {
      const next = vi.fn();

      await requireInterfaceAccess({
        to: { meta: { requiresAuth: false, interfaceName: "coupons" } },
        next,
      });

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("after a tenant switch", () => {
    it("closes a route the new membership does not carry", async () => {
      storeDouble.authorizedInterfaces = ["coupons"];
      const allowed = vi.fn();
      await requireInterfaceAccess({
        to: gatedRoute("coupons"),
        next: allowed,
      });
      expect(allowed).toHaveBeenCalledWith();

      storeDouble.currentTenantId = "tenant-b";
      storeDouble.authorizedInterfaces = [];
      const denied = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("coupons"), next: denied });

      expect(denied).toHaveBeenCalledWith({ name: "dashboard" });
    });

    it("opens a route the new membership carries", async () => {
      const denied = vi.fn();
      await requireInterfaceAccess({ to: gatedRoute("rooms"), next: denied });
      expect(denied).toHaveBeenCalledWith({ name: "dashboard" });

      storeDouble.currentTenantId = "tenant-b";
      storeDouble.authorizedInterfaces = ["rooms"];
      const allowed = vi.fn();

      await requireInterfaceAccess({ to: gatedRoute("rooms"), next: allowed });

      expect(allowed).toHaveBeenCalledWith();
    });
  });
});

/**
 * Characterisation: `checkInterface` keeps its own, unrelated job — pushing an
 * authorised user off a screen flagged `isPublic`. No route sets that flag
 * today (`src/router/index.js` writes `public`), so the branch stays dormant;
 * it is pinned here so the reach gate cannot be mistaken for a replacement.
 */
describe("checkInterface", () => {
  it("sends an authorised user off an `isPublic` screen", () => {
    storeDouble.authorizedInterfaces = ["settings"];
    const next = vi.fn();

    checkInterface({
      to: { meta: { interfaceName: "settings", isPublic: true } },
      next,
    });

    expect(next).toHaveBeenCalledWith({ name: "home" });
  });

  it("holds nobody back on a screen that is not `isPublic`", () => {
    const next = vi.fn();

    checkInterface({ to: gatedRoute("coupons"), next });

    expect(next).toHaveBeenCalledWith();
  });

  it("ignores the `public` flag the routes actually carry", () => {
    storeDouble.authorizedInterfaces = ["settings"];
    const next = vi.fn();

    checkInterface({
      to: { meta: { interfaceName: "settings", public: true } },
      next,
    });

    expect(next).toHaveBeenCalledWith();
  });
});
