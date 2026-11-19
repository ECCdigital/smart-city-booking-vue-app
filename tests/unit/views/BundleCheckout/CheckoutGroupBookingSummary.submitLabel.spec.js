import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import CheckoutGroupBookingSummary from "@/views/BundleCheckout/CheckoutGroupBookingSummary.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

/**
 * ECCdigital/tickets#937: a series with a total of 0 EUR is completed with
 * „Verbindlich buchen“ instead of „Zahlungspflichtig buchen“.
 * ECCdigital/tickets#1303: only when every item of every date is valid; a
 * failed check or a date without times asks for payment.
 */

const PAID = "Zahlungspflichtig buchen";
const FREE = "Verbindlich buchen";

function item(grossEur, valid = true) {
  return {
    bookableId: "room",
    amount: 1,
    valid,
    userPriceEur: grossEur,
    userGrossPriceEur: grossEur,
    regularPriceEur: grossEur,
    regularGrossPriceEur: grossEur,
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

/**
 * A date of the series the way `CheckoutGroupBooking.validateItems` leaves
 * it: the prices of the date add up its items, counting a missing one as 0.
 */
function attempt(bookableItem) {
  const gross = bookableItem.userGrossPriceEur || 0;
  return {
    userPriceEur: gross,
    userGrossPriceEur: gross,
    bookableItems: [bookableItem],
  };
}

const store = () =>
  new Vuex.Store({
    modules: { toasts: { namespaced: true, actions: { add: vi.fn() } } },
  });

const buttonTexts = (wrapper) =>
  wrapper.findAll("button").wrappers.map((b) => b.text());

async function groupSummary(bookingAttempts) {
  const wrapper = mountComponent(CheckoutGroupBookingSummary, {
    store: store(),
    propsData: { bookingAttempts, contactDetails: {}, activePaymentApps: [] },
  });
  await flushPromises();
  return wrapper;
}

describe("the submit button of the group booking summary", () => {
  it("asks for payment in a series that costs something", async () => {
    const texts = buttonTexts(
      await groupSummary([attempt(item(8)), attempt(item(8))])
    );
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });

  it("books a series bindingly at 0 EUR", async () => {
    const texts = buttonTexts(
      await groupSummary([attempt(item(0)), attempt(item(0))])
    );
    expect(texts).toContain(FREE);
    expect(texts).not.toContain(PAID);
  });

  it("asks for payment in a series without dates", async () => {
    const texts = buttonTexts(await groupSummary([]));
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });

  it("asks for payment where the check of every date failed", async () => {
    const texts = buttonTexts(
      await groupSummary([
        attempt(item(null, false)),
        attempt(item(null, false)),
      ])
    );
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });

  it("asks for payment where a time-dependent item has no times", async () => {
    const texts = buttonTexts(
      await groupSummary([attempt(item(null, null)), attempt(item(null, null))])
    );
    expect(texts).toContain(PAID);
    expect(texts).not.toContain(FREE);
  });
});
