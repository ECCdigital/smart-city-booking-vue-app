import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import CheckoutQuickSummary from "@/views/BundleCheckout/CheckoutQuickSummary.vue";
import CheckoutGroupBookingSummary from "@/views/BundleCheckout/CheckoutGroupBookingSummary.vue";
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
 * „Zahlungspflichtig buchen“, for every tenant.
 */

const PAID = "Zahlungspflichtig buchen";
const FREE = "Verbindlich buchen";

function item(grossEur, regularEur = grossEur) {
  return {
    bookableId: "room",
    amount: 1,
    valid: true,
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

async function quickSummary(leadItem) {
  const wrapper = mountComponent(CheckoutQuickSummary, {
    store: store(),
    propsData: {
      leadItem,
      subsequentItems: [],
      finalCheck: true,
      tenant: "t1",
      contactDetails: { name: "Max Muster", mail: "max@firma.test" },
    },
    mocks: { $router: { push: vi.fn() } },
  });
  await flushPromises();
  return wrapper;
}

async function groupSummary(bookingAttempts) {
  const wrapper = mountComponent(CheckoutGroupBookingSummary, {
    store: store(),
    propsData: { bookingAttempts, contactDetails: {}, activePaymentApps: [] },
  });
  await flushPromises();
  return wrapper;
}

describe("the submit button of the legacy checkout", () => {
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
  });

  it("asks for payment in a series that costs something", async () => {
    const attempt = {
      userPriceEur: 8,
      userGrossPriceEur: 8,
      bookableItems: [item(8)],
    };
    expect(buttonTexts(await groupSummary([attempt, attempt]))).toContain(PAID);
  });

  it("books a series bindingly at 0 EUR", async () => {
    const attempt = {
      userPriceEur: 0,
      userGrossPriceEur: 0,
      bookableItems: [item(0)],
    };
    expect(buttonTexts(await groupSummary([attempt, attempt]))).toContain(FREE);
  });
});
