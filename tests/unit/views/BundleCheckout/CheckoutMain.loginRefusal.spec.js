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
vi.mock("@/views/BundleCheckout/CheckoutTimeSelector.vue", () => ({
  default: {
    name: "CheckoutTimeSelector",
    render: (h) => h("div", "Zeitraum"),
  },
}));
vi.mock("@/views/BundleCheckout/CheckoutContactDetails.vue", () => ({
  default: { name: "CheckoutContactDetails", render: (h) => h("div") },
}));

/**
 * ECCdigital/tickets#123: the backend refused the completion for want of a
 * sign-in - the session ended between the first step and „Buchung
 * abschließen“. The summary hands over (`login-required`), and the checkout
 * goes back to its step „Anmeldung“, which offers the login again.
 */
const USER = {
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
  isScheduleRelated: true,
};

function unauthorized() {
  const error = new Error("Request failed with status code 401");
  error.response = { status: 401, data: "checkout.login_required" };
  return error;
}

async function mountCheckout() {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { data: { user: USER } },
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
    data: () => ({ step: 1 }),
    mocks: {
      $route: { query: { tenant: "t1", id: "b1" } },
      $router: { push: vi.fn() },
    },
  });
  await flushPromises();
  return { wrapper, store };
}

describe("CheckoutMain — completion refused for want of a sign-in", () => {
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
    ApiAuthService.me.mockResolvedValue({ data: { user: USER } });
    ApiCheckoutService.getCheckoutPermissions.mockResolvedValue({});
  });

  it("goes back to the step „Anmeldung“, which offers the login", async () => {
    const { wrapper, store } = await mountCheckout();
    wrapper.setData({ step: wrapper.vm.steps.length - 1 });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Anmeldung erforderlich");

    // The session is gone by the time the booking is sent.
    ApiAuthService.me.mockRejectedValue(unauthorized());
    wrapper
      .findComponent({ name: "CheckoutQuickSummary" })
      .vm.$emit("login-required");
    await flushPromises();

    const signin = wrapper.vm.steps.findIndex(
      (s) => s.component === "checkout-signin"
    );
    expect(wrapper.vm.step).toBe(signin + 1);
    expect(wrapper.text()).toContain("Anmeldung erforderlich");
    expect(store.getters["user/getUser"]).toBeUndefined();
  });
});
