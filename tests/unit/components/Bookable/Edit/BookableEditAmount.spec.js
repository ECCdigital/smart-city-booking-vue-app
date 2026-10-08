import { describe, expect, it } from "vitest";
import BookableEditAmount from "@/components/Bookable/Edit/BookableEditAmount.vue";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";

function bookable(overrides = {}) {
  return {
    id: "b1",
    tenantId: "t1",
    amount: 4,
    priceType: "per-hour",
    externalProviders: [
      {
        active: true,
        provider: "ifbs",
        handles: ["pricing", "availability", "maxAmount"],
        config: { locationId: "loc-42", amount: 4 },
      },
    ],
    ...overrides,
  };
}

async function mountAmount(overrides = {}) {
  // Hosted as BookableEdit hosts it: every patch lands in the next prop.
  const mounted = mountEditing(BookableEditAmount, {
    bookable: bookable(overrides),
  });
  const { wrapper } = mounted;
  wrapper.patches = mounted.patches;
  wrapper.handedIn = mounted.bookable;
  wrapper.stored = mounted.stored;
  await flushPromises();
  return wrapper;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

/**
 * The Höchstmenge je Buchung sits beside the capacity and limits one booking
 * of the bookable. Empty is unlimited and is saved as null - the backend
 * refuses an empty string or 0. A provider handling `maxAmount` locks the
 * capacity, not this field: both limits apply.
 */
describe("BookableEditAmount - Höchstmenge je Buchung", () => {
  function field(wrapper) {
    return wrapper.find(".max-amount-per-booking");
  }

  it("says the Höchstmenge is unlimited while it is empty", async () => {
    const wrapper = await mountAmount({ maxAmountPerBooking: null });

    expect(field(wrapper).text()).toContain("Höchstmenge je Buchung");
    expect(field(wrapper).text()).toContain("Höchstmenge ist unbegrenzt!");
    expect(field(wrapper).find("input").element.value).toBe("");
  });

  it("stays editable while the provider handles maxAmount", async () => {
    const wrapper = await mountAmount();

    expect(field(wrapper).find("input").attributes("disabled")).toBe(undefined);
  });

  it("keeps a typed limit as a number", async () => {
    const wrapper = await mountAmount({ maxAmountPerBooking: null });

    await field(wrapper).find("input").setValue("3");

    expect(wrapper.props("bookable").maxAmountPerBooking).toBe(3);
    expect(field(wrapper).text()).not.toContain("unbegrenzt");
  });

  it("saves an emptied field as null, not as an empty string", async () => {
    const wrapper = await mountAmount({ maxAmountPerBooking: 3 });

    await field(wrapper).find("input").setValue("");

    expect(wrapper.props("bookable").maxAmountPerBooking).toBeNull();
    expect(field(wrapper).text()).toContain("Höchstmenge ist unbegrenzt!");
  });

  it("refuses 0 and a fraction", async () => {
    const wrapper = await mountAmount({ maxAmountPerBooking: null });

    for (const value of ["0", "2.5"]) {
      await field(wrapper).find("input").setValue(value);
      await flushPromises();
      expect(field(wrapper).text()).toContain(
        "Bitte eine ganze Zahl ab 1 eingeben"
      );
    }
  });

  it("names the unit of the price type", async () => {
    const perItem = await mountAmount({ priceType: "per-item" });
    expect(field(perItem).text()).toContain("Stück");

    const perSquareMeter = await mountAmount({ priceType: "per-square-meter" });
    expect(field(perSquareMeter).text()).toContain("m²");
  });
});

describe("BookableEditAmount - changes as partial patches", () => {
  it("changes nothing when it mounts", async () => {
    const wrapper = await mountAmount();

    expect(wrapper.patches).toEqual([]);
    expect(wrapper.handedIn).toEqual(wrapper.stored);
  });

  it("hands on the amount at once", async () => {
    const wrapper = await mountAmount({ externalProviders: [] });

    await find(wrapper, "price-amount").find("input").setValue("7");

    expect(lastPatch(wrapper.patches)).toEqual({ amount: "7" });
    expect(wrapper.handedIn).toEqual(wrapper.stored);
  });

  it("locks the amount while the provider handles it", async () => {
    const wrapper = await mountAmount();

    expect(
      find(wrapper, "price-amount").find("input").attributes("disabled")
    ).toBe("disabled");
  });
});
