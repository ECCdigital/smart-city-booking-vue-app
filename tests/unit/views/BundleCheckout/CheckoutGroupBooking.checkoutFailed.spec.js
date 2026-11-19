import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiPaymentService from "@/services/api/ApiPaymentService";
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
vi.mock("@/services/api/ApiPaymentService", () => ({
  default: { payments: vi.fn() },
}));
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
 * A refused group checkout used to fail without a word, only a line in the
 * console. The backend refuses an offer it cannot find with a bare
 * `404 "Bookable not found"`, without a reason code; the group checkout says
 * so in the words of the single checkout, any other failure in the generic
 * text.
 */
const GONE_TEXT =
  "Dieses Angebot ist nicht mehr verfügbar und kann nicht gebucht werden.";

const BOOKABLE = {
  id: "b1",
  title: "Werkstatt",
  permittedUsers: [],
  permittedRoles: [],
  priceType: "per-item",
  checkoutBookableIds: [],
};

function notFoundError() {
  const error = new Error("Request failed with status code 404");
  error.response = { status: 404, data: "Bookable not found" };
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

describe("CheckoutGroupBooking — the checkout fails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    ApiAuthService.me.mockResolvedValue({ data: {} });
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });
  });

  it("says the offer is no longer available on the bare 404 of the backend", async () => {
    ApiCheckoutService.groupCheckout.mockRejectedValue(notFoundError());
    const { wrapper, addToast, push } = await mountGroupCheckout();

    await performCheckout(wrapper);

    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toMatchObject({
      title: "Angebot nicht mehr verfügbar",
      message: GONE_TEXT,
      type: "error",
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("names any other refusal in the generic text", async () => {
    ApiCheckoutService.groupCheckout.mockRejectedValue(serverError(409));
    const { wrapper, addToast } = await mountGroupCheckout();

    await performCheckout(wrapper);

    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toMatchObject({
      title: "Ein Fehler ist aufgetreten.",
      type: "error",
    });
  });

  it("names a failed payment in the generic text, not as a gone offer", async () => {
    ApiCheckoutService.groupCheckout.mockResolvedValue({
      status: 200,
      data: {
        bookingIds: ["bk1"],
        bookings: [{ id: "bk1", status: "payment_due" }],
      },
    });
    ApiPaymentService.payments.mockRejectedValue(serverError(404));
    const { wrapper, addToast } = await mountGroupCheckout();

    await performCheckout(wrapper);

    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toMatchObject({
      title: "Ein Fehler ist aufgetreten.",
      type: "error",
    });
  });
});
