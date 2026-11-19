import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import CheckoutMain from "@/views/BundleCheckout/CheckoutMain.vue";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { me: vi.fn() },
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
vi.mock("@/views/BundleCheckout/CheckoutQuickSummary.vue", () => ({
  default: { name: "CheckoutQuickSummary", render: (h) => h("div") },
}));
vi.mock("@/views/BundleCheckout/CheckoutContactDetails.vue", () => ({
  default: { name: "CheckoutContactDetails", render: (h) => h("div") },
}));

/**
 * ECCdigital/tickets#1303: the quick summary shows „Verbindlich buchen“ only
 * at a certain 0 EUR. A switch to „Zum vollen Preis buchen“ starts a new price
 * check; until it answers, the items still hold the discounted 0 EUR. So the
 * checkout tells the summary that a check is running, and an older check
 * that answers late does not overwrite the newer price.
 */
const BOOKABLE = {
  id: "b1",
  title: "Werkstatt",
  requiresLogin: false,
  permittedUsers: [],
  permittedRoles: [],
  priceType: "per-item",
};

const price = (grossEur) => ({
  status: 200,
  data: {
    regularPriceEur: 12,
    userPriceEur: grossEur,
    regularGrossPriceEur: 12,
    userGrossPriceEur: grossEur,
    freeBookingAllowed: true,
    bookingDiscountPercent: 100,
  },
});

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

async function mountCheckout() {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { data: { user: null } },
        getters: { getUser: () => null },
      },
      tenants: { namespaced: true, actions: { update: vi.fn() } },
    },
  });
  const wrapper = mountComponent(CheckoutMain, {
    store,
    mocks: { $route: { query: { tenant: "t1", id: "b1" } } },
  });
  await flushPromises();
  return wrapper;
}

const summary = (wrapper) =>
  wrapper.findComponent({ name: "CheckoutQuickSummary" });

describe("CheckoutMain — the price check behind the submit button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAuthService.me.mockResolvedValue({ data: {} });
    ApiCheckoutService.getCheckoutPermissions.mockResolvedValue({});
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });
    ApiCheckoutService.validateCheckoutItem.mockResolvedValue(price(0));
  });

  it("tells the summary while a price check is running", async () => {
    const wrapper = await mountCheckout();
    expect(summary(wrapper).vm.$attrs.validating).toBe(false);

    const fullPrice = deferred();
    ApiCheckoutService.validateCheckoutItem.mockReturnValueOnce(
      fullPrice.promise
    );
    summary(wrapper).vm.$emit("set-book-without-discount", true);
    await flushPromises();

    expect(summary(wrapper).vm.$attrs.validating).toBe(true);

    fullPrice.resolve(price(12));
    await flushPromises();

    expect(summary(wrapper).vm.$attrs.validating).toBe(false);
    expect(summary(wrapper).vm.$attrs["lead-item"].userGrossPriceEur).toBe(12);
  });

  it("keeps the newer price when an older check answers late", async () => {
    const wrapper = await mountCheckout();

    const discounted = deferred();
    const fullPrice = deferred();
    ApiCheckoutService.validateCheckoutItem
      .mockReturnValueOnce(discounted.promise)
      .mockReturnValueOnce(fullPrice.promise);
    summary(wrapper).vm.$emit("set-book-without-discount", false);
    summary(wrapper).vm.$emit("set-book-without-discount", true);
    await flushPromises();

    fullPrice.resolve(price(12));
    await flushPromises();
    discounted.resolve(price(0));
    await flushPromises();

    expect(summary(wrapper).vm.$attrs["lead-item"].userGrossPriceEur).toBe(12);
    expect(summary(wrapper).vm.$attrs.validating).toBe(false);
  });
});
