import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookableEditAccessLocks from "@/components/Bookable/Edit/BookableEditAccessLocks.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { mountComponent } from "@tests/unit/support/mount";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import { toggleSwitch } from "@tests/unit/support/vuetify";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn() },
}));

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookablePrices: vi.fn() },
}));

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn() },
}));

vi.mock("@/services/permissions/BookablePermissionService", () => ({
  default: { allowCreate: () => true, allowUpdate: () => true },
}));

vi.mock("@/services/permissions/AccessPointPermissionService", () => ({
  default: { allowWrite: () => false },
}));

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

async function mountLocks(bookable = {}) {
  const wrapper = mountComponent(BookableEditAccessLocks, {
    store: store(),
    propsData: {
      bookable: {
        id: "b1",
        amount: 3,
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [],
        },
        ...bookable,
      },
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * Since the locker fold the access tab is one assignment table for doors and
 * locker systems alike. The three provider cards are gone, and with them the
 * "provider not active in the tenant" signal they carried - the picker simply
 * lists what the tenant has.
 */
describe("BookableEditAccessLocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.getAccessPoints.mockResolvedValue({ data: [] });
  });

  it("no longer offers the three provider cards", async () => {
    const wrapper = await mountLocks();

    expect(wrapper.text()).not.toMatch(/Fahrradbox/);
    expect(wrapper.text()).not.toMatch(/Smartes Türschloss/);
  });

  it("does not read the tenant application list any more", async () => {
    await mountLocks();

    expect(ApiTenantService.getTenant).not.toHaveBeenCalled();
  });

  /**
   * The Stückzahl is edited on the Preise tab ("Verfügbare Anzahl") and
   * nowhere else. A second editor here used to invite the mistake of reading
   * it as a number per Anlage.
   */
  it("renders no Stückzahl field", async () => {
    const wrapper = await mountLocks({ amount: 3 });

    expect(wrapper.text()).not.toMatch(/Stückzahl/);
    expect(
      wrapper.findAll("input").wrappers.map((i) => i.element.value)
    ).not.toContain("3");
  });
});

describe("BookableEditAccessLocks (Schließsysteme) on bookableEditing", () => {
  beforeEach(() => {
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [{ id: "ap-door", type: "door", label: "Haupteingang" }],
    });
  });

  const mountArea = async (accessPointDetails) => {
    const mounted = mountEditing(BookableEditAccessLocks, {
      store: store(),
      bookable: { id: "b1", title: "Saal", amount: 3, accessPointDetails },
    });
    await flushPromises();
    return mounted;
  };

  it("changes nothing when it mounts", async () => {
    const { patches, bookable, stored } = await mountArea({
      active: true,
      accessBuffer: { before: 0, after: 0 },
      accessPointIds: ["ap-door"],
    });

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("switches access on with only the access point details", async () => {
    const { wrapper, patches, bookable, stored } = await mountArea(undefined);

    await toggleSwitch(wrapper, undefined);

    expect(patches).toHaveLength(1);
    expect(Object.keys(patches[0])).toEqual(["accessPointDetails"]);
    expect(patches[0].accessPointDetails.active).toBe(true);
    expect(bookable).toEqual(stored);
  });

  it("hands on an assignment as a patch of the access point details", async () => {
    const { wrapper, patches } = await mountArea({
      active: true,
      accessBuffer: { before: 0, after: 0 },
      accessPointIds: [],
    });

    await wrapper.find("button.assign-button").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.find(".assign-option").trigger("click");

    expect(patches).toEqual([
      {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: ["ap-door"],
        },
      },
    ]);
  });
});

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

function lockerBookable(overrides = {}) {
  return {
    id: "b1",
    tenantId: "t1",
    title: "Fahrradbox",
    amount: 4,
    isPublic: true,
    priceType: "per-hour",
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

async function mountProvider({
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
  const mounted = mountEditing(BookableEditAccessLocks, {
    store: store(),
    bookable: lockerBookable(overrides),
    expertMode,
  });
  await flushPromises();
  await mounted.wrapper.vm.$nextTick();
  return mounted;
}

const panel = (wrapper) => wrapper.find("#be-section-pricing-external");

function tiles(wrapper) {
  return wrapper
    .findAll(".external-price-tier")
    .wrappers.map((tile) => tile.text().replace(/\s+/g, " ").trim());
}

/**
 * The settings of ParkraumService - recommendation, switch, what it handles
 * and the preview of its prices - belong to the assigned locker system, so
 * they sit in Schließsysteme, not with the price.
 */
describe("BookableEditAccessLocks - the settings of ParkraumService", () => {
  it("shows them for an assigned locker system of the provider", async () => {
    const { wrapper } = await mountProvider();

    expect(panel(wrapper).exists()).toBe(true);
    expect(panel(wrapper).text()).toContain("ParkraumService");
  });

  it("stays away when only doors are assigned", async () => {
    const { wrapper } = await mountProvider({
      accessPointDetails: {
        active: true,
        accessBuffer: { before: 0, after: 0 },
        accessPointIds: ["ap-door"],
      },
    });

    expect(panel(wrapper).exists()).toBe(false);
    expect(ApiBookablesService.getBookablePrices).not.toHaveBeenCalled();
  });

  it("changes nothing when it mounts", async () => {
    const { patches, bookable, stored } = await mountProvider();

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("points the provider at the assigned locker system when switched on", async () => {
    const { wrapper, patches } = await mountProvider({ externalProviders: [] });

    await panel(wrapper).find("input[role='switch']").trigger("click");

    expect(patches).toHaveLength(1);
    expect(Object.keys(patches[0])).toEqual(["externalProviders"]);
    expect(patches[0].externalProviders[0]).toMatchObject({
      active: true,
      provider: "ifbs",
      config: { locationId: "loc-42", amount: 4 },
    });
  });

  it("reads the prices of the bookable and shows one tile per rate", async () => {
    const { wrapper } = await mountProvider();

    expect(ApiBookablesService.getBookablePrices).toHaveBeenCalledWith(
      "b1",
      "t1"
    );
    const rendered = tiles(wrapper);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toContain("pro Stunde");
    expect(rendered[0]).toContain("1.50");
    expect(wrapper.find(".external-price-fee").text()).toContain("2.50");
  });

  it("says so when the prices cannot be read", async () => {
    const { wrapper } = await mountProvider({ pricesError: forbiddenError() });

    expect(wrapper.find(".external-price-error").text()).toContain(
      "Preise konnten nicht"
    );
  });

  it("names the save instead of asking for an unsaved bookable", async () => {
    const { wrapper } = await mountProvider({ id: undefined });

    expect(ApiBookablesService.getBookablePrices).not.toHaveBeenCalled();
    expect(wrapper.find(".external-price-empty").text()).toContain(
      "gespeichert"
    );
  });

  it("shows them without expert mode only while the provider is on", async () => {
    const active = await mountProvider({ expertMode: false });
    const inactive = await mountProvider({
      expertMode: false,
      externalProviders: [{ active: false, provider: "ifbs", handles: [] }],
    });

    expect(panel(active.wrapper).exists()).toBe(true);
    expect(panel(inactive.wrapper).exists()).toBe(false);
  });
});
