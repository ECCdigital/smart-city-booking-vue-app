import { describe, expect, it } from "vitest";
import CheckoutAmountSelector from "@/views/BundleCheckout/CheckoutAmountSelector.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

function leadItem(bookable, amount = 1) {
  return {
    bookableId: "b1",
    amount,
    valid: true,
    bookable: {
      id: "b1",
      title: "Messefläche",
      priceType: "per-square-meter",
      amount: null,
      maxAmountPerBooking: null,
      ...bookable,
    },
  };
}

async function mountSelector(item) {
  const wrapper = mountComponent(CheckoutAmountSelector, {
    propsData: { leadItem: item },
  });
  await flushPromises();
  return wrapper;
}

function plus(wrapper) {
  return wrapper.find(".mdi-plus").element.closest("button");
}

/**
 * The square meters of the lead item stop at the stricter of the capacity
 * („Verfügbare Anzahl“) and the Höchstmenge je Buchung; when the Höchstmenge
 * binds, the selector names it in the backend's words instead of the
 * capacity.
 */
describe("CheckoutAmountSelector", () => {
  it("stops at the Höchstmenge je Buchung below the capacity", async () => {
    const item = leadItem({ amount: 100, maxAmountPerBooking: 2 });
    const wrapper = await mountSelector(item);

    plus(wrapper).click();
    plus(wrapper).click();
    plus(wrapper).click();
    await flushPromises();

    expect(item.amount).toBe(2);
    expect(wrapper.find(".amount-limit").text()).toBe(
      "Höchstmenge je Buchung: 2 m²"
    );
  });

  it("names the Höchstmenge je Buchung when a typed amount exceeds it", async () => {
    const item = leadItem({ amount: 100, maxAmountPerBooking: 20 });
    const wrapper = await mountSelector(item);

    const input = wrapper.find("input");
    await input.trigger("focus");
    await input.setValue("25");
    await input.trigger("blur");
    await flushPromises();

    expect(item.amount).toBe("25");
    expect(wrapper.text()).toContain(
      "Von Messefläche können höchstens 20 m² je Buchung gebucht werden."
    );
    expect(wrapper.text()).not.toContain("Quadratmeter möglich");
  });

  it("keeps the capacity's text when the capacity is stricter", async () => {
    const item = leadItem({ amount: 10, maxAmountPerBooking: 50 }, 12);
    const wrapper = await mountSelector(item);

    expect(wrapper.find(".amount-limit").text()).toContain(
      "Maximal verfügbar:"
    );
    expect(wrapper.text()).toContain("Maximal sind 10 Quadratmeter möglich");
    expect(wrapper.text()).not.toContain("je Buchung");
  });

  it("takes an unlimited capacity of 0 as no limit", async () => {
    const item = leadItem({ amount: 0, maxAmountPerBooking: null }, 500);
    const wrapper = await mountSelector(item);

    plus(wrapper).click();
    await flushPromises();

    expect(item.amount).toBe(501);
    expect(wrapper.find(".amount-limit").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("möglich");
  });
});
