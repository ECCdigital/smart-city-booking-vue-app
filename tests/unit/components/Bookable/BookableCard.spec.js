import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookableCard from "@/components/Bookable/BookableCard.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: {
    getBookablePrices: vi.fn(),
    publicBookableCountCheck: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/services/permissions/BookablePermissionService", () => ({
  default: {
    allowCreate: () => true,
    allowDelete: () => true,
    allowUpdate: () => true,
  },
}));

vi.mock("@/components/Media/MediaReferenceImage.vue", () => ({
  default: {
    name: "MediaReferenceImage",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

const EXTERNAL_PRICES = [
  { priceEur: 1.5, unit: "hour", external: true },
  { priceEur: 9, unit: "day", external: true },
  { priceEur: 2.5, unit: "service-fee", external: true },
];

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
      instance: { namespaced: true, getters: { instance: () => ({}) } },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
}

function item(overrides = {}) {
  return {
    id: "b1",
    tenantId: "t1",
    title: "Fahrradbox",
    description: "",
    isBookable: true,
    isPublic: true,
    priceCategories: [],
    externalProviders: [
      {
        active: true,
        provider: "ifbs",
        handles: ["pricing"],
        config: { locationId: "loc-42", amount: 1 },
      },
    ],
    ...overrides,
  };
}

async function mountCard({
  prices = EXTERNAL_PRICES,
  pricesError = null,
  ...overrides
} = {}) {
  ApiBookablesService.getBookablePrices.mockReset();
  if (pricesError) {
    ApiBookablesService.getBookablePrices.mockRejectedValue(pricesError);
  } else {
    ApiBookablesService.getBookablePrices.mockResolvedValue({ data: prices });
  }

  const wrapper = mountComponent(BookableCard, {
    store: store(),
    propsData: { item: item(overrides) },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

function rows(wrapper) {
  return wrapper
    .findAll(".external-price-row")
    .wrappers.map((row) => row.text().replace(/\s+/g, " ").trim());
}

/**
 * The card shows what the provider charges instead of the bookable's own price
 * tiers. Since 4.3.x that answer is the flat array of `/bookables/:id/prices`;
 * the `/locker/*` price record it used to index by German key is gone.
 */
describe("BookableCard - the provider's prices", () => {
  it("reads the prices of the bookable, not of a locker location", async () => {
    await mountCard();

    expect(ApiBookablesService.getBookablePrices).toHaveBeenCalledWith(
      "b1",
      "t1"
    );
  });

  it("lists one row per rate the provider answered", async () => {
    const wrapper = await mountCard();

    const rendered = rows(wrapper);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toContain("pro Stunde");
    expect(rendered[0]).toContain("1.50");
    expect(rendered[1]).toContain("pro Tag");
  });

  it("shows the service fee of the array answer", async () => {
    const wrapper = await mountCard();

    expect(wrapper.find(".external-price-fee").text()).toContain("2.50");
  });

  it("leaves the fee out when the provider charges none", async () => {
    const wrapper = await mountCard({
      prices: [{ priceEur: 1.5, unit: "hour", external: true }],
    });

    expect(wrapper.find(".external-price-fee").exists()).toBe(false);
  });

  it("asks for no prices when no provider handles them", async () => {
    const wrapper = await mountCard({
      externalProviders: [
        { active: true, provider: "ifbs", handles: ["availability"] },
      ],
    });

    expect(ApiBookablesService.getBookablePrices).not.toHaveBeenCalled();
    expect(wrapper.find(".external-price-row").exists()).toBe(false);
  });

  it("says nothing it cannot know when the prices are refused", async () => {
    const wrapper = await mountCard({ pricesError: forbiddenError() });

    expect(wrapper.find(".external-price-row").exists()).toBe(false);
    expect(wrapper.text()).toContain("Preise nicht verfügbar");
  });

  // The prices route is the public one and refuses a bookable that is not
  // publicly visible; the card does not ask for one.
  it("does not ask for a bookable that is not publicly visible", async () => {
    const wrapper = await mountCard({ isPublic: false });

    expect(ApiBookablesService.getBookablePrices).not.toHaveBeenCalled();
    expect(wrapper.find(".external-price-row").exists()).toBe(false);
  });
});
