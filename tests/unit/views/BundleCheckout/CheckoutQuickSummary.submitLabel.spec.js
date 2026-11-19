import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import CheckoutQuickSummary from "@/views/BundleCheckout/CheckoutQuickSummary.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { checkout: vi.fn() },
}));
vi.mock("@/services/api/ApiPaymentService", () => ({
  default: { payments: vi.fn() },
}));

/**
 * ECCdigital/tickets#937: a booking with a total of 0 EUR, also after a
 * discount, is completed with „Verbindlich buchen“ instead of
 * „Zahlungspflichtig buchen“, for every tenant. ECCdigital/tickets#1303: only
 * when every item is valid and every price known; a missing price asks for
 * payment.
 */

const PAID = "Zahlungspflichtig buchen";
const FREE = "Verbindlich buchen";

function item(grossEur, regularEur = grossEur, valid = true) {
  return {
    bookableId: "room",
    amount: 1,
    valid,
    userPriceEur: grossEur,
    userGrossPriceEur: grossEur,
    regularPriceEur: regularEur,
    regularGrossPriceEur: regularEur,
    bookable: {
      id: "room",
      title: "Werkstatt",
      priceType: "per-item",
      amount: null,
      maxAmountPerBooking: null,
      checkoutBookableIds: [],
      attachments: [],
      autoCommitBooking: true,
    },
  };
}

const store = () =>
  new Vuex.Store({
    modules: { toasts: { namespaced: true, actions: { add: vi.fn() } } },
  });

const buttonTexts = (wrapper) =>
  wrapper.findAll("button").wrappers.map((b) => b.text());

const submitButton = (wrapper) =>
  wrapper
    .findAll("button")
    .wrappers.find((b) => [PAID, FREE].includes(b.text()));

async function quickSummary(leadItem, subsequentItems = [], props = {}) {
  const wrapper = mountComponent(CheckoutQuickSummary, {
    store: store(),
    propsData: {
      ...props,
      leadItem,
      subsequentItems,
      finalCheck: true,
      tenant: "t1",
      contactDetails: { name: "Max Muster", mail: "max@firma.test" },
    },
    mocks: { $router: { push: vi.fn() } },
  });
  await flushPromises();
  return wrapper;
}

describe("the submit button of the quick summary", () => {
  it("asks for payment where the booking costs something", async () => {
    const texts = buttonTexts(await quickSummary(item(12)));
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });

  it("books bindingly at 0 EUR", async () => {
    const texts = buttonTexts(await quickSummary(item(0)));
    expect(texts).toContain(FREE);
    expect(texts).not.toContain(PAID);
  });

  it("books bindingly at 0 EUR after a discount", async () => {
    const texts = buttonTexts(await quickSummary(item(0, 20)));
    expect(texts).toContain(FREE);
    expect(texts).not.toContain(PAID);
  });

  it("asks for payment where the check of the lead item failed", async () => {
    const texts = buttonTexts(await quickSummary(item(null, null, false)));
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });

  it("asks for payment where an added item is not checked yet", async () => {
    const texts = buttonTexts(
      await quickSummary(item(0), [item(null, null, null)])
    );
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });

  it("asks for payment where an added item still has an unchecked 0 EUR", async () => {
    const texts = buttonTexts(await quickSummary(item(0), [item(0, 0, null)]));
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });

  it("asks for payment and waits while a price check is running", async () => {
    const wrapper = await quickSummary(item(0), [], { validating: true });
    expect(submitButton(wrapper).text()).toBe(PAID);
    expect(submitButton(wrapper).attributes("disabled")).toBe("disabled");
  });

  it("can be sent once the price check is done", async () => {
    const wrapper = await quickSummary(item(0), [], { validating: false });
    expect(submitButton(wrapper).text()).toBe(FREE);
    expect(submitButton(wrapper).attributes("disabled")).toBeUndefined();
  });
});
