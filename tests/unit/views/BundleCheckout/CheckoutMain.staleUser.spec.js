import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import CheckoutMain from "@/views/BundleCheckout/CheckoutMain.vue";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { me: vi.fn(), logout: vi.fn() },
}));
vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { getCheckoutPermissions: vi.fn(), validateCheckoutItem: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getPublicBookable: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenantActivePaymentApps: vi.fn(async () => ({ data: [] })),
    getTenant: vi.fn(async () => ({ data: { id: "t1" } })),
  },
}));
vi.mock("@/services/api/ApiCouponService", () => ({ default: {} }));
vi.mock("@/services/api/ApiRolesService", () => ({ default: {} }));
vi.mock("@/components/Auth/LoginCard.vue", () => ({
  default: { name: "LoginCard", render: (h) => h("div", "LoginCard") },
}));
vi.mock("@/views/BundleCheckout/CheckoutQuickSummary.vue", () => ({
  default: { name: "CheckoutQuickSummary", render: (h) => h("div") },
}));
vi.mock("@/views/BundleCheckout/CheckoutContactDetails.vue", () => ({
  default: { name: "CheckoutContactDetails", render: (h) => h("div") },
}));

/**
 * ECCdigital/tickets#77: a bookable behind a login, opened in the checkout by
 * a browser whose session is gone while localStorage still holds the user of
 * the earlier one. The checkout used to fall back to that user, so the step
 * „Anmeldung“ said „Angemeldet“ instead of offering a login, the permission
 * check answered 401 and booking stayed impossible until the customer cleared
 * the browser cache.
 */
const STORED_USER = {
  id: "petra@example.org",
  firstName: "Petra",
  lastName: "Muster",
};

const BOOKABLE = {
  id: "b1",
  title: "Werkstatt",
  requiresLogin: true,
  permittedUsers: [],
  permittedRoles: [],
  priceType: "per-item",
};

function unauthorized() {
  const error = new Error("Request failed with status code 401");
  error.response = { status: 401, data: {} };
  return error;
}

async function mountCheckout({ storedUser }) {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { data: storedUser ? { user: storedUser } : null },
        getters: { getUser: (state) => state.data?.user },
        mutations: {
          DELETE(state) {
            state.data = null;
          },
        },
        actions: {
          delete({ commit }) {
            commit("DELETE");
          },
        },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenant: () => ({ id: "t1" }) },
        actions: { update: vi.fn() },
      },
      instance: {
        namespaced: true,
        getters: { instance: () => ({ applications: [] }) },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(CheckoutMain, {
    store,
    // The stepper header reads `step.rules`, which throws while `step` is
    // still null - before `init` has set it, once the steps exist.
    data: () => ({ step: 1 }),
    mocks: {
      $route: { query: { tenant: "t1", id: "b1" } },
      $router: { push: vi.fn() },
    },
  });
  await flushPromises();
  return { wrapper, store };
}

describe("CheckoutMain — bookable behind a login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    ApiCheckoutService.validateCheckoutItem.mockResolvedValue({
      status: 200,
      data: {},
    });
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });
  });

  describe("when the session is gone", () => {
    beforeEach(() => {
      ApiAuthService.me.mockRejectedValue(unauthorized());
      ApiCheckoutService.getCheckoutPermissions.mockRejectedValue(
        unauthorized()
      );
    });

    it("offers a login although localStorage still holds an earlier user", async () => {
      const { wrapper } = await mountCheckout({ storedUser: STORED_USER });

      expect(wrapper.text()).toContain("Anmeldung erforderlich");
      expect(wrapper.text()).not.toContain("Angemeldet");
    });

    it("forgets the earlier user, so no cache has to be cleared", async () => {
      const { store } = await mountCheckout({ storedUser: STORED_USER });

      expect(store.getters["user/getUser"]).toBeUndefined();
    });

    it("offers a login when nothing is stored", async () => {
      const { wrapper } = await mountCheckout({ storedUser: null });

      expect(wrapper.text()).toContain("Anmeldung erforderlich");
    });
  });

  describe("when the session is alive", () => {
    beforeEach(() => {
      ApiAuthService.me.mockResolvedValue({ data: { user: STORED_USER } });
      ApiCheckoutService.getCheckoutPermissions.mockResolvedValue({});
    });

    it("keeps the signed-in user", async () => {
      const { store } = await mountCheckout({ storedUser: STORED_USER });

      expect(store.getters["user/getUser"]).toEqual(STORED_USER);
    });
  });

  describe("when auth/me fails without a 401", () => {
    beforeEach(() => {
      ApiAuthService.me.mockRejectedValue(new Error("Network Error"));
      ApiCheckoutService.getCheckoutPermissions.mockRejectedValue(
        unauthorized()
      );
    });

    it("offers a login but keeps the stored user", async () => {
      const { wrapper, store } = await mountCheckout({
        storedUser: STORED_USER,
      });

      expect(wrapper.text()).toContain("Anmeldung erforderlich");
      expect(store.getters["user/getUser"]).toEqual(STORED_USER);
    });
  });
});
