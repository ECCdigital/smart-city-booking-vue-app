import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import CheckoutGroupBooking from "@/views/BundleCheckout/CheckoutGroupBooking.vue";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { me: vi.fn() },
}));
vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { groupCheckout: vi.fn(), validateCheckoutItem: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getPublicBookable: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantActivePaymentApps: vi.fn(async () => ({ data: [] })) },
}));
vi.mock("@/services/api/ApiPaymentService", () => ({ default: {} }));
vi.mock("@/services/api/ApiCouponService", () => ({ default: {} }));

const { stub } = vi.hoisted(() => ({
  stub: (name) => ({ default: { name, render: (h) => h("div") } }),
}));
vi.mock("@/views/BundleCheckout/CheckoutSeriesBooking.vue", () =>
  stub("CheckoutSeriesBooking")
);
vi.mock("@/views/BundleCheckout/CheckoutContactDetails.vue", () =>
  stub("CheckoutContactDetails")
);
vi.mock("@/views/BundleCheckout/CheckoutPaymentProvider.vue", () =>
  stub("CheckoutPaymentProvider")
);
vi.mock("@/views/BundleCheckout/CheckoutGroupBookingSummary.vue", () =>
  stub("CheckoutGroupBookingSummary")
);
vi.mock("@/views/BundleCheckout/AdditionalBookables.vue", () =>
  stub("AdditionalBookables")
);
vi.mock("@/views/BundleCheckout/BookingSidebar.vue", () =>
  stub("BookingSidebar")
);

/**
 * ECCdigital/tickets#123: the group checkout has no step „Anmeldung“ of its
 * own. When the backend refuses the completion for want of a sign-in, it
 * says so and goes back to the single checkout of the offer, whose first
 * step offers the login. Before, it failed without a word.
 */

const BOOKABLE = {
  id: "b1",
  title: "Werkstatt",
  requiresLogin: true,
  permittedUsers: [],
  permittedRoles: [],
  priceType: "per-item",
  checkoutBookableIds: [],
};

function refusal(status, data) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data };
  return error;
}

async function mountGroupCheckout() {
  const addToast = vi.fn();
  const push = vi.fn();
  const store = new Vuex.Store({
    modules: {
      user: { namespaced: true, getters: { getUser: () => null } },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(CheckoutGroupBooking, {
    store,
    mocks: {
      $route: { query: { tenant: "t1", id: "b1" } },
      $router: { push },
    },
  });
  await flushPromises();
  wrapper.setData({ currentStep: wrapper.vm.steps.length });
  await flushPromises();
  return { wrapper, addToast, push };
}

async function performCheckout(wrapper) {
  wrapper
    .findComponent({ name: "CheckoutGroupBookingSummary" })
    .vm.$emit("perform-checkout");
  await flushPromises();
}

describe("CheckoutGroupBooking — completion refused for want of a sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    ApiAuthService.me.mockRejectedValue(refusal(401, {}));
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });
  });

  it("names the sign-in and goes back to the single checkout, which offers it", async () => {
    ApiCheckoutService.groupCheckout.mockRejectedValue(
      refusal(401, "checkout.login_required")
    );
    const { wrapper, addToast, push } = await mountGroupCheckout();

    await performCheckout(wrapper);

    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toMatchObject({
      title: "Anmeldung erforderlich",
      type: "error",
    });
    expect(push).toHaveBeenCalledWith({
      name: "checkout",
      query: { id: "b1", tenant: "t1" },
    });
  });

  it("stays where it is on any other refusal", async () => {
    ApiCheckoutService.groupCheckout.mockRejectedValue(
      refusal(409, "Booking not possible")
    );
    const { wrapper, push } = await mountGroupCheckout();

    await performCheckout(wrapper);

    expect(ApiCheckoutService.groupCheckout).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
