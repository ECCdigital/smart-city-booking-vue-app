import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookableEditAccessLocks from "@/components/Bookable/Edit/BookableEditAccessLocks.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiTenantService from "@/services/api/ApiTenantService";
import { mountComponent } from "@tests/unit/support/mount";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import { toggleSwitch } from "@tests/unit/support/vuetify";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn() },
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
