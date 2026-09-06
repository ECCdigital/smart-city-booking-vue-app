import { beforeEach, describe, expect, it, vi } from "vitest";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";
import { mountComponent } from "@tests/unit/support/mount";
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

  const wrapper = mountComponent(BookableEditPrice, {
    propsData: { bookable: bookable(overrides) },
  });
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

  // The prices route is the public one - it answers 403 for a bookable that
  // is not publicly visible. Asking and reporting the refusal as a provider
  // failure would blame the provider for a state of the bookable.
  it("names the visibility instead of asking for a hidden bookable", async () => {
    const wrapper = await mountPrice({ isPublic: false });

    expect(ApiBookablesService.getBookablePrices).not.toHaveBeenCalled();
    expect(wrapper.find(".external-price-error").exists()).toBe(false);
    expect(wrapper.find(".external-price-empty").text()).toContain(
      "öffentlich sichtbar"
    );
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
