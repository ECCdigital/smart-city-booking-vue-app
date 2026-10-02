import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { createLocalVue } from "@vue/test-utils";
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
 * ECCdigital/tickets#106: the stepper header handed every step the rules of
 * `step`, the number of the current step, instead of the step it draws. While
 * `step` was still null - `validateItems` builds the steps before `init` sets
 * it - rendering threw, and afterwards the rules were always undefined.
 *
 * Only the render is asserted: on the first permission check, the one step
 * with rules, „Berechtigung“, comes with `preventBooking`, which hides the
 * header.
 */
const SIGNED_IN = { id: "petra@example.org", firstName: "Petra" };

const BOOKABLE = {
  id: "b1",
  title: "Werkstatt",
  requiresLogin: false,
  permittedUsers: [],
  permittedRoles: [],
  priceType: "per-item",
};

async function mountCheckout() {
  // Vue swallows an error thrown while re-rendering; the handler of a local
  // Vue is where Vue Test Utils hands it on instead.
  const renderErrors = [];
  const localVue = createLocalVue();
  localVue.config.errorHandler = (error) => renderErrors.push(error);

  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { data: { user: SIGNED_IN } },
        getters: { getUser: (state) => state.data?.user },
      },
      tenants: { namespaced: true, actions: { update: vi.fn() } },
    },
  });
  const wrapper = mountComponent(CheckoutMain, {
    localVue,
    store,
    mocks: { $route: { query: { tenant: "t1", id: "b1" } } },
  });
  await flushPromises();
  return { wrapper, renderErrors };
}

describe("CheckoutMain — stepper header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAuthService.me.mockResolvedValue({ data: { user: SIGNED_IN } });
    ApiCheckoutService.getCheckoutPermissions.mockResolvedValue({});
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });
    ApiCheckoutService.validateCheckoutItem.mockResolvedValue({
      status: 200,
      data: {},
    });
  });

  it("renders while the current step is not set yet", async () => {
    const { wrapper, renderErrors } = await mountCheckout();

    expect(renderErrors).toEqual([]);
    expect(wrapper.find(".v-stepper__header").text()).toContain("Kontaktdaten");
  });
});
