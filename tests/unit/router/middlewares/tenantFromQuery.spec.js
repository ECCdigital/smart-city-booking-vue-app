import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/language/index";

const storeDouble = vi.hoisted(() => ({
  permissions: {
    tenants: [{ tenantId: "tenant-a" }, { tenantId: "tenant-b" }],
  },
  tenants: [
    { id: "tenant-a", name: "Stadt A" },
    { id: "tenant-b", name: "Stadt B" },
  ],
  currentTenantId: "tenant-a",
  dispatch: vi.fn(),
}));

vi.mock("@/store", () => ({
  default: {
    dispatch: (...args) => storeDouble.dispatch(...args),
    get state() {
      return { user: { data: { permissions: storeDouble.permissions } } };
    },
    getters: {
      get "tenants/tenants"() {
        return storeDouble.tenants;
      },
      get "tenants/currentTenantId"() {
        return storeDouble.currentTenantId;
      },
    },
  },
}));

const { selectTenantFromQuery } = await import(
  "@/router/middlewares/tenantFromQuery"
);

/** A route as the Buchungsseite will declare it, with a `?tenant=` query. */
function bookingLink(tenant, meta = { tenantFromQuery: true }) {
  return {
    meta: { requiresAuth: true, interfaceName: "bookings", ...meta },
    query: tenant === undefined ? {} : { tenant },
  };
}

beforeEach(() => {
  storeDouble.permissions = {
    tenants: [{ tenantId: "tenant-a" }, { tenantId: "tenant-b" }],
  };
  storeDouble.tenants = [
    { id: "tenant-a", name: "Stadt A" },
    { id: "tenant-b", name: "Stadt B" },
  ];
  storeDouble.currentTenantId = "tenant-a";
  storeDouble.dispatch = vi.fn();
});

describe("selectTenantFromQuery", () => {
  describe("on a route without the flag", () => {
    it("continues and touches nothing", async () => {
      const next = vi.fn();

      await selectTenantFromQuery({
        to: bookingLink("tenant-b", { tenantFromQuery: undefined }),
        next,
      });

      expect(next).toHaveBeenCalledWith();
      expect(storeDouble.dispatch).not.toHaveBeenCalled();
    });
  });

  describe("on a flagged route", () => {
    it("selects the tenant of a member's link and continues", async () => {
      const next = vi.fn();

      await selectTenantFromQuery({ to: bookingLink("tenant-b"), next });

      expect(storeDouble.dispatch).toHaveBeenCalledWith(
        "tenants/select",
        "tenant-b"
      );
      expect(next).toHaveBeenCalledWith();
    });

    it("continues untouched when the link names no tenant", async () => {
      for (const tenant of [undefined, ""]) {
        const next = vi.fn();

        await selectTenantFromQuery({ to: bookingLink(tenant), next });

        expect(next).toHaveBeenCalledWith();
      }
      expect(storeDouble.dispatch).not.toHaveBeenCalled();
    });

    it("neither selects nor redirects for a non-member's link", async () => {
      const next = vi.fn();

      await selectTenantFromQuery({ to: bookingLink("tenant-x"), next });

      expect(next).toHaveBeenCalledWith();
      expect(storeDouble.dispatch).not.toHaveBeenCalled();
    });

    it("says which tenant it switched to when another one was stored", async () => {
      await selectTenantFromQuery({
        to: bookingLink("tenant-b"),
        next: vi.fn(),
      });

      expect(storeDouble.dispatch).toHaveBeenCalledWith(
        "toasts/add",
        expect.objectContaining({
          message: i18n.t("booking.page.tenant-switched.message", {
            name: "Stadt B",
          }),
          type: "info",
        })
      );
      expect(
        i18n.t("booking.page.tenant-switched.message", { name: "Stadt B" })
      ).toBe("Mandant zu „Stadt B“ gewechselt.");
    });

    it("names the tenant by its id when the list does not know it", async () => {
      storeDouble.tenants = [{ id: "tenant-a", name: "Stadt A" }];

      await selectTenantFromQuery({
        to: bookingLink("tenant-b"),
        next: vi.fn(),
      });

      expect(storeDouble.dispatch).toHaveBeenCalledWith(
        "toasts/add",
        expect.objectContaining({
          message: "Mandant zu „tenant-b“ gewechselt.",
        })
      );
    });

    it("stays silent when the link names the stored tenant", async () => {
      await selectTenantFromQuery({
        to: bookingLink("tenant-a"),
        next: vi.fn(),
      });

      expect(storeDouble.dispatch).toHaveBeenCalledWith(
        "tenants/select",
        "tenant-a"
      );
      expect(storeDouble.dispatch).not.toHaveBeenCalledWith(
        "toasts/add",
        expect.anything()
      );
    });

    it("stays silent in a fresh browser with no stored tenant", async () => {
      storeDouble.currentTenantId = null;
      const next = vi.fn();

      await selectTenantFromQuery({ to: bookingLink("tenant-b"), next });

      expect(storeDouble.dispatch).toHaveBeenCalledWith(
        "tenants/select",
        "tenant-b"
      );
      expect(storeDouble.dispatch).not.toHaveBeenCalledWith(
        "toasts/add",
        expect.anything()
      );
      expect(next).toHaveBeenCalledWith();
    });
  });
});
