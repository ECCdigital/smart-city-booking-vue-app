import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import CheckoutQuickSummary from "@/views/BundleCheckout/CheckoutQuickSummary.vue";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { checkout: vi.fn() },
}));
vi.mock("@/services/api/ApiPaymentService", () => ({ default: {} }));

/**
 * ECCdigital/tickets#123: the backend refuses the completion of an offer
 * behind a login without a sign-in with 401 `checkout.login_required` - or
 * the session ended on the way and its renewal failed. The checkout says so
 * and hands over to the sign-in instead of a generic error.
 */

function loginRefusal() {
  const error = new Error("Request failed with status code 401");
  error.response = { status: 401, data: "checkout.login_required" };
  return error;
}

function conflict() {
  const error = new Error("Request failed with status code 409");
  error.response = { status: 409, data: "Booking not possible" };
  return error;
}

const leadItem = {
  bookableId: "login-room",
  amount: 1,
  valid: true,
  userPriceEur: 0,
  regularPriceEur: 0,
  bookable: {
    id: "login-room",
    title: "Werkstatt",
    priceType: "per-item",
    amount: null,
    maxAmountPerBooking: null,
    checkoutBookableIds: [],
    attachments: [],
    autoCommitBooking: true,
    requiresLogin: true,
  },
};

async function mountFinalCheck() {
  const addToast = vi.fn();
  const store = new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(CheckoutQuickSummary, {
    store,
    propsData: {
      leadItem,
      subsequentItems: [],
      finalCheck: true,
      tenant: "t1",
      contactDetails: { name: "Erika Muster", mail: "erika@example.org" },
    },
    mocks: { $router: { push: vi.fn() } },
  });
  await flushPromises();
  return { wrapper, addToast };
}

async function submit(wrapper) {
  const button = wrapper
    .findAll("button")
    .filter((b) => b.text().includes("Buchung abschließen"))
    .at(0);
  await button.trigger("click");
  await flushPromises();
}

describe("CheckoutQuickSummary - completion refused for want of a sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("names the sign-in and hands over to it", async () => {
    ApiCheckoutService.checkout.mockRejectedValue(loginRefusal());
    const { wrapper, addToast } = await mountFinalCheck();

    await submit(wrapper);

    expect(wrapper.emitted("login-required")).toHaveLength(1);
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toMatchObject({
      title: "Anmeldung erforderlich",
      type: "error",
    });
  });

  it("keeps any other refusal a refusal without the sign-in", async () => {
    ApiCheckoutService.checkout.mockRejectedValue(conflict());
    const { wrapper, addToast } = await mountFinalCheck();

    await submit(wrapper);

    expect(wrapper.emitted("login-required")).toBeUndefined();
    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1].title).not.toBe("Anmeldung erforderlich");
  });
});
