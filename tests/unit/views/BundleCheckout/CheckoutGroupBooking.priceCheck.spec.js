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
 * ECCdigital/tickets#1303: the summary of a series shows „Verbindlich buchen“
 * only at a certain 0 EUR. Removing a coupon of 100 % starts a new price
 * check; until it answers, the dates still hold the discounted 0 EUR. So the
 * series tells the summary that a check is running, and an older check that
 * answers late does not overwrite the newer price.
 */
const BOOKABLE = {
  id: "b1",
  title: "Werkstatt",
  permittedUsers: [],
  permittedRoles: [],
  priceType: "per-item",
  checkoutBookableIds: [],
};

const price = (grossEur) => ({
  status: 200,
  data: {
    regularPriceEur: 12,
    userPriceEur: grossEur,
    regularGrossPriceEur: 12,
    userGrossPriceEur: grossEur,
  },
});

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

function attempt() {
  return {
    timeBegin: 1,
    timeEnd: 2,
    bookableItems: [
      {
        bookableId: "b1",
        amount: 1,
        bookable: BOOKABLE,
        valid: true,
        userPriceEur: 0,
        userGrossPriceEur: 0,
      },
    ],
  };
}

async function mountSummaryStep() {
  const store = new Vuex.Store({
    modules: {
      user: { namespaced: true, getters: { getUser: () => null } },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(CheckoutGroupBooking, {
    store,
    mocks: {
      $route: { query: { tenant: "t1", id: "b1" } },
      $router: { push: vi.fn() },
    },
  });
  await flushPromises();
  wrapper.setData({ bookingAttempts: [attempt()] });
  wrapper.setData({ currentStep: wrapper.vm.steps.length });
  await flushPromises();
  return wrapper;
}

const summary = (wrapper) =>
  wrapper.findComponent({ name: "CheckoutGroupBookingSummary" });

const firstItem = (wrapper) =>
  summary(wrapper).vm.$attrs.bookingAttempts[0].bookableItems[0];

describe("CheckoutGroupBooking — the price check behind the submit button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAuthService.me.mockResolvedValue({ data: {} });
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });
  });

  it("tells the summary while a price check is running", async () => {
    const wrapper = await mountSummaryStep();
    expect(summary(wrapper).vm.$attrs.validating).toBe(false);

    const fullPrice = deferred();
    ApiCheckoutService.validateCheckoutItem.mockReturnValueOnce(
      fullPrice.promise
    );
    summary(wrapper).vm.$emit("remove-coupon");
    await flushPromises();

    expect(summary(wrapper).vm.$attrs.validating).toBe(true);

    fullPrice.resolve(price(12));
    await flushPromises();

    expect(summary(wrapper).vm.$attrs.validating).toBe(false);
    expect(firstItem(wrapper).userGrossPriceEur).toBe(12);
  });

  it("keeps the newer price when an older check answers late", async () => {
    const wrapper = await mountSummaryStep();

    const discounted = deferred();
    const fullPrice = deferred();
    ApiCheckoutService.validateCheckoutItem
      .mockReturnValueOnce(discounted.promise)
      .mockReturnValueOnce(fullPrice.promise);
    summary(wrapper).vm.$emit("remove-coupon");
    summary(wrapper).vm.$emit("remove-coupon");
    await flushPromises();

    fullPrice.resolve(price(12));
    await flushPromises();
    discounted.resolve(price(0));
    await flushPromises();

    expect(firstItem(wrapper).userGrossPriceEur).toBe(12);
    expect(summary(wrapper).vm.$attrs.validating).toBe(false);
  });
});
