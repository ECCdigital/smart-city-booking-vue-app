import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, unauthorizedError } from "@tests/unit/support/api";
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
  default: {
    name: "CheckoutContactDetails",
    render: (h) => h("div", "Kontaktformular"),
  },
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

async function mountCheckout(query = {}) {
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
      $route: { query: { tenant: "t1", id: "b1", ...query } },
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

  async function refuseAtTheSummary(wrapper) {
    wrapper.setData({ step: wrapper.vm.steps.length - 1 });
    await flushPromises();
    // The session is gone by the time the booking is sent.
    ApiAuthService.me.mockRejectedValue(unauthorizedError({}));
    wrapper
      .findComponent({ name: "CheckoutQuickSummary" })
      .vm.$emit("login-required");
    await flushPromises();
  }

  it("goes back to the step „Anmeldung“ for an offer behind a role", async () => {
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: { ...BOOKABLE, requiresLogin: false, permittedRoles: ["r1"] },
    });
    const { wrapper } = await mountCheckout();

    await refuseAtTheSummary(wrapper);

    expect(wrapper.text()).toContain("Anmeldung erforderlich");
  });

  // ECCdigital/tickets#110: the person is anonymous now; only an offer that
  // needs a sign-in leads to the step „Anmeldung“.
  it("goes on as a guest from the contact details for an offer without a sign-in", async () => {
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: { ...BOOKABLE, requiresLogin: false },
    });
    const { wrapper, store } = await mountCheckout({
      start: "1767261600000",
      end: "1767265200000",
    });
    ApiCheckoutService.validateCheckoutItem.mockClear();

    await refuseAtTheSummary(wrapper);

    expect(wrapper.text()).not.toContain("Anmeldung erforderlich");
    expect(wrapper.text()).toContain("Kontaktformular");
    expect(ApiCheckoutService.validateCheckoutItem).toHaveBeenCalled();
    expect(store.getters["user/getUser"]).toBeUndefined();
  });

  it("goes back to the step „Anmeldung“, which offers the login", async () => {
    const { wrapper, store } = await mountCheckout();
    wrapper.setData({ step: wrapper.vm.steps.length - 1 });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Anmeldung erforderlich");

    // The session is gone by the time the booking is sent.
    ApiAuthService.me.mockRejectedValue(unauthorizedError({}));
    wrapper
      .findComponent({ name: "CheckoutQuickSummary" })
      .vm.$emit("login-required");
    await flushPromises();

    expect(wrapper.text()).toContain("Anmeldung erforderlich");
    expect(wrapper.text()).not.toContain("Angemeldet");
    expect(store.getters["user/getUser"]).toBeUndefined();
  });
});

/**
 * The group checkout has no step „Anmeldung“: refused for want of a sign-in,
 * it sends the person back here with `login=1`. A public offer whose series is
 * open to a role only then needs the sign-in for the series.
 */
describe("CheckoutMain — back from a series refused for want of a sign-in", () => {
  const SERIES_BOOKABLE = {
    ...BOOKABLE,
    requiresLogin: false,
    groupBooking: { enabled: true, permittedRoles: ["r1"] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    ApiCheckoutService.validateCheckoutItem.mockResolvedValue({
      status: 200,
      data: {},
    });
    ApiAuthService.me.mockRejectedValue(unauthorizedError({}));
    ApiCheckoutService.getCheckoutPermissions.mockResolvedValue({});
  });

  it("offers the login for a series behind a role", async () => {
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: SERIES_BOOKABLE,
    });

    const { wrapper } = await mountCheckout({ login: "1" });

    expect(wrapper.text()).toContain("Anmeldung erforderlich");
  });

  it("starts as a guest without the signal", async () => {
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: SERIES_BOOKABLE,
    });

    const { wrapper } = await mountCheckout();

    expect(wrapper.text()).not.toContain("Anmeldung erforderlich");
  });

  it("starts as a guest when the series is open to all", async () => {
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: {
        ...SERIES_BOOKABLE,
        groupBooking: { enabled: true, permittedRoles: [] },
      },
    });

    const { wrapper } = await mountCheckout({ login: "1" });

    expect(wrapper.text()).not.toContain("Anmeldung erforderlich");
  });
});
