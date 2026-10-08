import { beforeEach, describe, expect, it, vi } from "vitest";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn() },
}));

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookablePrices: vi.fn() },
}));

vi.mock("@/services/api/ApiHolidaysService", () => ({
  default: { getHolidays: vi.fn() },
}));

const IFBS_SYSTEM = {
  id: "ap-ifbs",
  type: "locker",
  provider: "ifbs",
  label: "Fahrradboxen Bahnhof",
  externalId: "loc-42",
};

const DOOR = {
  id: "ap-door",
  type: "door",
  provider: "nuki",
  label: "Haupteingang",
  externalId: "lock-1",
};

const EXTERNAL_PRICES = [
  { priceEur: 1.5, unit: "hour", external: true },
  { priceEur: 9, unit: "day", external: true },
  { priceEur: 2.5, unit: "service-fee", external: true },
];

function bookable(overrides = {}) {
  return {
    id: "b1",
    tenantId: "t1",
    amount: 4,
    isPublic: true,
    priceType: "per-hour",
    priceEur: 0,
    priceValueAddedTax: 19,
    priceCategories: [
      {
        priceEur: 0,
        interval: { start: null, end: null },
        fixedPrice: false,
        holidays: [],
        weekdays: [],
      },
    ],
    accessPointDetails: {
      active: true,
      accessBuffer: { before: 0, after: 0 },
      accessPointIds: ["ap-ifbs"],
    },
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

async function mountPrice({
  accessPoints = [IFBS_SYSTEM, DOOR],
  prices = EXTERNAL_PRICES,
  pricesError = null,
  expertMode,
  ...overrides
} = {}) {
  ApiAccessPointService.getAccessPoints.mockReset();
  ApiBookablesService.getBookablePrices.mockReset();
  ApiAccessPointService.getAccessPoints.mockResolvedValue({
    data: accessPoints,
  });
  if (pricesError) {
    ApiBookablesService.getBookablePrices.mockRejectedValue(pricesError);
  } else {
    ApiBookablesService.getBookablePrices.mockResolvedValue({ data: prices });
  }

  // Hosted as BookableEdit hosts it: every patch lands in the next prop.
  const mounted = mountEditing(BookableEditPrice, {
    bookable: bookable(overrides),
    expertMode,
  });
  const { wrapper } = mounted;
  wrapper.patches = mounted.patches;
  wrapper.handedIn = mounted.bookable;
  wrapper.stored = mounted.stored;
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

function tiles(wrapper) {
  return wrapper
    .findAll(".external-price-tier")
    .wrappers.map((tile) => tile.text().replace(/\s+/g, " ").trim());
}

/**
 * Since 4.3.x the provider's prices are the flat array `/bookables/:id/prices`
 * answers. The `/locker/*` facade with its per-location price record is gone,
 * and so are the two figures only that facade ever carried: the location's
 * total capacity and its buffer.
 */
describe("BookableEditPrice - the provider's prices", () => {
  beforeEach(() => {
    ApiHolidaysService.getHolidays.mockResolvedValue({ data: [] });
  });

  it("reads the prices of the bookable, not of a locker location", async () => {
    await mountPrice();

    expect(ApiBookablesService.getBookablePrices).toHaveBeenCalledWith(
      "b1",
      "t1"
    );
  });

  it("shows one tile per rate the provider answered", async () => {
    const wrapper = await mountPrice();

    const rendered = tiles(wrapper);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toContain("pro Stunde");
    expect(rendered[0]).toContain("1.50");
    expect(rendered[1]).toContain("pro Tag");
  });

  it("leaves out a rate the provider does not charge", async () => {
    const wrapper = await mountPrice({
      prices: [{ priceEur: 1.5, unit: "hour", external: true }],
    });

    expect(tiles(wrapper)).toHaveLength(1);
  });

  it("shows the service fee of the array answer", async () => {
    const wrapper = await mountPrice();

    const fee = wrapper.find(".external-price-fee");
    expect(fee.exists()).toBe(true);
    expect(fee.text()).toContain("Servicegebühr");
    expect(fee.text()).toContain("2.50");
  });

  it("leaves the fee out when the provider charges none", async () => {
    const wrapper = await mountPrice({
      prices: [{ priceEur: 1.5, unit: "hour", external: true }],
    });

    expect(wrapper.find(".external-price-fee").exists()).toBe(false);
  });

  it("says so when the prices cannot be read", async () => {
    const wrapper = await mountPrice({ pricesError: forbiddenError() });

    expect(wrapper.find(".external-price-error").text()).toContain(
      "Preise konnten nicht"
    );
    expect(wrapper.find(".external-price-tier").exists()).toBe(false);
  });

  // The prices route answers a hidden bookable to whoever may read it, and
  // the editor is opened by such a reader - so a bookable that is not yet
  // listed previews its provider's prices like a public one.
  it("asks for a hidden bookable as for a public one", async () => {
    const wrapper = await mountPrice({ isPublic: false });

    expect(ApiBookablesService.getBookablePrices).toHaveBeenCalledWith(
      "b1",
      "t1"
    );
    expect(tiles(wrapper)).toHaveLength(2);
    expect(wrapper.find(".external-price-empty").exists()).toBe(false);
  });

  it("names the save instead of asking for an unsaved bookable", async () => {
    const wrapper = await mountPrice({ id: undefined });

    expect(ApiBookablesService.getBookablePrices).not.toHaveBeenCalled();
    expect(wrapper.find(".external-price-empty").text()).toContain(
      "gespeichert"
    );
  });
});

/**
 * A locker system is an access point since the fold, so what makes the panel
 * relevant is an assigned access point of the provider - not the derived
 * `lockerDetails` the bookable still carries.
 */
describe("BookableEditPrice - when the panel applies", () => {
  beforeEach(() => {
    ApiHolidaysService.getHolidays.mockResolvedValue({ data: [] });
  });

  it("shows the panel for an assigned locker system of the provider", async () => {
    const wrapper = await mountPrice();

    expect(wrapper.find("#be-section-pricing-external").exists()).toBe(true);
  });

  it("stays away when only doors are assigned", async () => {
    const wrapper = await mountPrice({
      accessPointDetails: {
        active: true,
        accessBuffer: { before: 0, after: 0 },
        accessPointIds: ["ap-door"],
      },
    });

    expect(wrapper.find("#be-section-pricing-external").exists()).toBe(false);
    expect(ApiBookablesService.getBookablePrices).not.toHaveBeenCalled();
  });

  it("ignores a locker system the bookable does not reference", async () => {
    const wrapper = await mountPrice({
      accessPointDetails: {
        active: true,
        accessBuffer: { before: 0, after: 0 },
        accessPointIds: [],
      },
    });

    expect(wrapper.find("#be-section-pricing-external").exists()).toBe(false);
  });

  it("points the provider at the assigned locker system when switched on", async () => {
    const wrapper = await mountPrice({ externalProviders: [] });

    await wrapper
      .find("#be-section-pricing-external input[role='switch']")
      .trigger("click");
    await flushPromises();

    expect(wrapper.props("bookable").externalProviders[0].config).toEqual({
      locationId: "loc-42",
      amount: 4,
    });
  });
});

/**
 * The Höchstmenge je Buchung sits beside the capacity and limits one booking
 * of the bookable. Empty is unlimited and is saved as null - the backend
 * refuses an empty string or 0. A provider handling `maxAmount` locks the
 * capacity, not this field: both limits apply.
 */
describe("BookableEditPrice - Höchstmenge je Buchung", () => {
  beforeEach(() => {
    ApiHolidaysService.getHolidays.mockResolvedValue({ data: [] });
  });

  function field(wrapper) {
    return wrapper.find(".max-amount-per-booking");
  }

  it("says the Höchstmenge is unlimited while it is empty", async () => {
    const wrapper = await mountPrice({ maxAmountPerBooking: null });

    expect(field(wrapper).text()).toContain("Höchstmenge je Buchung");
    expect(field(wrapper).text()).toContain("Höchstmenge ist unbegrenzt!");
    expect(field(wrapper).find("input").element.value).toBe("");
  });

  it("stays editable while the provider handles maxAmount", async () => {
    const wrapper = await mountPrice();

    expect(field(wrapper).find("input").attributes("disabled")).toBe(undefined);
  });

  it("keeps a typed limit as a number", async () => {
    const wrapper = await mountPrice({ maxAmountPerBooking: null });

    await field(wrapper).find("input").setValue("3");

    expect(wrapper.props("bookable").maxAmountPerBooking).toBe(3);
    expect(field(wrapper).text()).not.toContain("unbegrenzt");
  });

  it("saves an emptied field as null, not as an empty string", async () => {
    const wrapper = await mountPrice({ maxAmountPerBooking: 3 });

    await field(wrapper).find("input").setValue("");

    expect(wrapper.props("bookable").maxAmountPerBooking).toBeNull();
    expect(field(wrapper).text()).toContain("Höchstmenge ist unbegrenzt!");
  });

  it("refuses 0 and a fraction", async () => {
    const wrapper = await mountPrice({ maxAmountPerBooking: null });

    for (const value of ["0", "2.5"]) {
      await field(wrapper).find("input").setValue(value);
      await flushPromises();
      expect(field(wrapper).text()).toContain(
        "Bitte eine ganze Zahl ab 1 eingeben"
      );
    }
  });

  it("names the unit of the price type", async () => {
    const perItem = await mountPrice({ priceType: "per-item" });
    expect(field(perItem).text()).toContain("Stück");

    const perSquareMeter = await mountPrice({ priceType: "per-square-meter" });
    expect(field(perSquareMeter).text()).toContain("m²");
  });
});

/**
 * Every change goes out at once as a patch of the top-level fields it
 * changed; the bookable prop itself stays as it was handed in.
 */
describe("BookableEditPrice - changes as partial patches", () => {
  beforeEach(() => {
    ApiHolidaysService.getHolidays.mockResolvedValue({ data: [] });
  });

  const tiers = [
    {
      priceEur: 10,
      interval: { start: null, end: 2 },
      fixedPrice: false,
      holidays: [],
      weekdays: [],
    },
    {
      priceEur: 8,
      interval: { start: 2, end: null },
      fixedPrice: false,
      holidays: [],
      weekdays: [],
    },
  ];

  const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

  it("changes nothing when it mounts, with tiers or without", async () => {
    for (const priceCategories of [undefined, tiers]) {
      const wrapper = await mountPrice(
        priceCategories ? { priceCategories } : {}
      );
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(wrapper.patches).toEqual([]);
      expect(wrapper.handedIn).toEqual(wrapper.stored);
    }
  });

  it("hands on the amount at once", async () => {
    const wrapper = await mountPrice({ externalProviders: [] });

    await find(wrapper, "price-amount").find("input").setValue("7");

    expect(lastPatch(wrapper.patches)).toEqual({ amount: "7" });
    expect(wrapper.handedIn).toEqual(wrapper.stored);
  });

  it("hands on a simple price as the rebuilt categories", async () => {
    const wrapper = await mountPrice({ externalProviders: [] });

    await find(wrapper, "price-simple").find("input").setValue("12");

    expect(lastPatch(wrapper.patches)).toEqual({
      priceCategories: [
        {
          priceEur: "12",
          interval: { start: null, end: null },
          fixedPrice: false,
          holidays: [],
          weekdays: [],
        },
      ],
    });
    expect(wrapper.handedIn).toEqual(wrapper.stored);
  });

  it("hands on a changed tier as the rebuilt categories", async () => {
    const wrapper = await mountPrice({
      externalProviders: [],
      priceCategories: tiers,
    });

    await find(wrapper, "price-category-start").find("input").setValue("1");

    expect(lastPatch(wrapper.patches)).toEqual({
      priceCategories: [
        { ...tiers[0], interval: { start: "1", end: 2 } },
        tiers[1],
      ],
    });
    expect(wrapper.handedIn).toEqual(wrapper.stored);
  });

  it("adds a tier after the last one", async () => {
    const wrapper = await mountPrice({
      externalProviders: [],
      priceCategories: tiers,
    });

    await find(wrapper, "price-category-add").trigger("click");

    expect(lastPatch(wrapper.patches).priceCategories).toEqual([
      ...tiers,
      {
        priceEur: 0,
        interval: { start: null, end: null },
        fixedPrice: false,
        holidays: [],
        weekdays: [],
      },
    ]);
    expect(wrapper.handedIn).toEqual(wrapper.stored);
  });

  it("folds the tiers into the first price when they are switched off", async () => {
    const wrapper = await mountPrice({
      externalProviders: [],
      priceCategories: tiers,
    });

    await find(wrapper, "price-graduated-switch")
      .find("input")
      .trigger("click");

    expect(lastPatch(wrapper.patches)).toEqual({
      priceCategories: [
        {
          priceEur: 10,
          interval: { start: null, end: null },
          fixedPrice: false,
          holidays: [],
          weekdays: [],
        },
      ],
    });
    expect(find(wrapper, "price-simple").exists()).toBe(true);
  });

  it("keeps the tiers switched on before a second tier is there", async () => {
    const wrapper = await mountPrice({ externalProviders: [] });

    await find(wrapper, "price-graduated-switch")
      .find("input")
      .trigger("click");
    await find(wrapper, "price-amount").find("input").setValue("7");

    expect(find(wrapper, "price-category-add").exists()).toBe(true);
    expect(wrapper.patches).toEqual([{ amount: "7" }]);
  });
});

describe("BookableEditPrice - without expert mode", () => {
  beforeEach(() => {
    ApiHolidaysService.getHolidays.mockResolvedValue({ data: [] });
  });

  const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
  const OWN_PRICES = { externalProviders: [], accessPointDetails: undefined };
  const TIERS = [
    { priceEur: 10, interval: { start: null, end: 2 }, weekdays: [] },
    { priceEur: 8, interval: { start: 2, end: null }, weekdays: [] },
  ];

  it("shows Rabattcodes while they are switched off", async () => {
    const off = await mountPrice({
      ...OWN_PRICES,
      enableCoupons: false,
      expertMode: false,
    });
    const on = await mountPrice({
      ...OWN_PRICES,
      enableCoupons: true,
      expertMode: false,
    });

    expect(find(off, "price-coupons").exists()).toBe(true);
    expect(find(on, "price-coupons").exists()).toBe(false);
  });

  it("lets tiers in use be edited, without a hint", async () => {
    const wrapper = await mountPrice({
      ...OWN_PRICES,
      priceCategories: TIERS,
      expertMode: false,
    });

    expect(find(wrapper, "price-graduated-switch").exists()).toBe(true);
    expect(find(wrapper, "price-category-add").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Experten-Modus");
  });

  it("offers no tiers while a single price is set", async () => {
    const wrapper = await mountPrice({ ...OWN_PRICES, expertMode: false });

    expect(find(wrapper, "price-graduated-switch").exists()).toBe(false);
    expect(find(wrapper, "price-simple").exists()).toBe(true);
  });

  it("shows the provider's panel while its prices are switched on", async () => {
    const active = await mountPrice({ expertMode: false });
    const inactive = await mountPrice({
      expertMode: false,
      externalProviders: [{ active: false, provider: "ifbs", handles: [] }],
    });

    expect(active.find("#be-section-pricing-external").exists()).toBe(true);
    expect(inactive.find("#be-section-pricing-external").exists()).toBe(false);
  });
});
