import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { createLocalVue } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";
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
 * ECCdigital/tickets#262: the offer is gone before the checkout opens - the
 * link was old, the offer deleted in the meantime. The public bookable answers
 * 404, and the checkout says so in the words the store front uses, instead of
 * a blank page.
 */
const GONE_TEXT =
  "Dieses Angebot ist nicht mehr verfügbar und kann nicht gebucht werden.";

async function mountCheckout() {
  // Vue swallows an error thrown while rendering or in a hook; the handler of
  // a local Vue is where Vue Test Utils hands it on instead.
  const errors = [];
  const localVue = createLocalVue();
  localVue.config.errorHandler = (error) => errors.push(error);

  const store = new Vuex.Store({
    modules: {
      user: { namespaced: true, getters: { getUser: () => null } },
      tenants: { namespaced: true, actions: { update: vi.fn() } },
    },
  });
  const wrapper = mountComponent(CheckoutMain, {
    localVue,
    store,
    mocks: { $route: { query: { tenant: "t1", id: "b1" } } },
  });
  await flushPromises();
  return { wrapper, errors };
}

describe("CheckoutMain — offer gone before the checkout opens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    ApiAuthService.me.mockRejectedValue(serverError(401));
    ApiCheckoutService.getCheckoutPermissions.mockRejectedValue(
      serverError(404)
    );
    ApiBookablesService.getPublicBookable.mockRejectedValue(serverError(404));
    ApiCheckoutService.validateCheckoutItem.mockRejectedValue(serverError(404));
  });

  it("says the offer is no longer available", async () => {
    const { wrapper, errors } = await mountCheckout();

    expect(errors).toEqual([]);
    expect(wrapper.text()).toContain(GONE_TEXT);
  });

  it("offers no step of the checkout", async () => {
    const { wrapper } = await mountCheckout();

    expect(wrapper.find(".v-stepper").exists()).toBe(false);
    expect(wrapper.text()).not.toContain(
      "Dieses Angebot ist für Sie nicht buchbar"
    );
  });
});
