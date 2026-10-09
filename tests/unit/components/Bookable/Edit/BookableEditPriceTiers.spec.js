import { beforeEach, describe, expect, it, vi } from "vitest";
import BookableEditPriceTiers from "@/components/Bookable/Edit/BookableEditPriceTiers.vue";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiHolidaysService", () => ({
  default: { getHolidays: vi.fn() },
}));

/**
 * Tarife: the Staffel of the Preis component. Every change goes out at once
 * as the rebuilt categories; the bookable prop stays as it was handed in.
 */

const tier = (priceEur, interval, overrides = {}) => ({
  priceEur,
  interval,
  fixedPrice: false,
  holidays: [],
  weekdays: [],
  ...overrides,
});

const TIERS = [
  tier(10, { start: null, end: 2 }),
  tier(8, { start: 2, end: null }),
];

async function mountTiers(overrides = {}) {
  const mounted = mountEditing(BookableEditPriceTiers, {
    bookable: {
      id: "b1",
      tenantId: "t1",
      priceType: "per-hour",
      priceValueAddedTax: 19,
      priceCategories: TIERS,
      ...overrides,
    },
  });
  await flushPromises();
  return mounted;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

describe("BookableEditPriceTiers", () => {
  beforeEach(() => {
    ApiHolidaysService.getHolidays.mockResolvedValue({ data: [] });
  });

  it("changes nothing when it mounts", async () => {
    const { patches, bookable, stored } = await mountTiers();

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("hands on a changed tier as the rebuilt categories", async () => {
    const { wrapper, patches, bookable, stored } = await mountTiers();

    await find(wrapper, "price-category-start").find("input").setValue("1");

    expect(lastPatch(patches)).toEqual({
      priceCategories: [
        { ...TIERS[0], interval: { start: "1", end: 2 } },
        TIERS[1],
      ],
    });
    expect(bookable).toEqual(stored);
  });

  it("adds a tier after the last one", async () => {
    const { wrapper, patches } = await mountTiers();

    await find(wrapper, "price-category-add").trigger("click");

    expect(lastPatch(patches).priceCategories).toEqual([
      ...TIERS,
      tier(0, { start: null, end: null }),
    ]);
  });

  it("names the fixed price by the Preisart, an hour price „Tagespauschale“", async () => {
    const hourly = await mountTiers({
      priceCategories: [
        tier(10, { start: null, end: 2 }, { fixedPrice: true }),
      ],
    });
    const daily = await mountTiers({ priceType: "per-day" });

    expect(find(hourly.wrapper, "price-category-fixed").exists()).toBe(true);
    expect(hourly.wrapper.text()).toContain("Tagespauschale");
    expect(hourly.wrapper.text()).not.toContain("Pauschalpreis");
    expect(daily.wrapper.text()).toContain("Angefangene Tage zählen voll");
  });

  it("asks for the amount as the Preis component does", async () => {
    const { wrapper } = await mountTiers();

    expect(find(wrapper, "price-category-amount").exists()).toBe(true);
    expect(wrapper.text()).toContain("Was kostet es? (netto)");
    expect(wrapper.text()).not.toContain("Preis (netto)");
  });
});
