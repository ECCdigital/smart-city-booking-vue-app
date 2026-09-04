import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookableEditAccessPoints from "@/components/Bookable/Edit/BookableEditAccessPoints.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn() },
}));

vi.mock("@/services/permissions/AccessPointPermissionService", () => ({
  default: { allowWrite: () => false },
}));

const DOOR = {
  id: "ap-door",
  type: "door",
  provider: "nuki",
  label: "Haupteingang",
  externalId: "lock-1",
};

const LOCKER = {
  id: "ap-locker",
  type: "locker",
  provider: "ifbs",
  label: "Fahrradboxen Bahnhof",
  externalId: "loc-42",
};

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

async function mountPoints({ accessPoints = [], bookable = {} } = {}) {
  ApiAccessPointService.getAccessPoints.mockResolvedValue({
    data: accessPoints,
  });

  const wrapper = mountComponent(BookableEditAccessPoints, {
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

function lastUpdate(wrapper) {
  const updates = wrapper.emitted("update:bookable");
  expect(updates).toBeTruthy();
  return updates[updates.length - 1][0];
}

function rows(wrapper) {
  return wrapper.findAll("tr.assignment-row");
}

/**
 * After the locker fold a bookable references locker systems the same way it
 * references doors: as ids in `accessPointDetails.accessPointIds`. The tab is
 * one assignment table for both kinds - no `/locker/*` facade, no
 * `lockerDetails`.
 */
describe("BookableEditAccessPoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists an assigned locker system as an Anlage", async () => {
    const wrapper = await mountPoints({
      accessPoints: [DOOR, LOCKER],
      bookable: {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [LOCKER.id],
        },
      },
    });

    expect(rows(wrapper)).toHaveLength(1);
    const row = rows(wrapper).at(0);
    expect(row.text()).toMatch(/Fahrradboxen Bahnhof/);
    expect(row.text()).toMatch(/Anlage/);
    expect(row.text()).toMatch(/ifbs/);
  });

  /**
   * A booking gets one compartment per unit *it* books
   * (`_ensureCompartmentEntries` is fed `_itemAmount(booking, bookable.id)` in
   * `access-service.js`). The bookable's `amount` is the capacity the
   * concurrent bookings are counted against - naming it here would promise a
   * number the backend never grants.
   */
  it("says a booking gets a compartment per booked unit, not per bookable amount", async () => {
    const wrapper = await mountPoints({
      accessPoints: [LOCKER],
      bookable: {
        amount: 3,
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [LOCKER.id],
        },
      },
    });

    const text = rows(wrapper).at(0).text();
    expect(text).toMatch(/Je gebuchter Einheit ein Fach/);
    expect(text).not.toMatch(/3 Fächer/);
  });

  it("says a booking shares a door for its period", async () => {
    const wrapper = await mountPoints({
      accessPoints: [DOOR],
      bookable: {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [DOOR.id],
        },
      },
    });

    const row = rows(wrapper).at(0);
    expect(row.text()).toMatch(/Tür/);
    expect(row.text()).toMatch(/Geteilter Zugang/);
  });

  it("offers only unassigned access points in the picker and assigns one", async () => {
    const wrapper = await mountPoints({
      accessPoints: [DOOR, LOCKER],
      bookable: {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [DOOR.id],
        },
      },
    });

    await wrapper.find("button.assign-button").trigger("click");
    await wrapper.vm.$nextTick();

    const options = wrapper.findAll(".assign-option");
    expect(options).toHaveLength(1);
    expect(options.at(0).text()).toMatch(/Fahrradboxen Bahnhof/);

    await options.at(0).trigger("click");

    expect(lastUpdate(wrapper).accessPointDetails.accessPointIds).toEqual([
      DOOR.id,
      LOCKER.id,
    ]);
  });

  it("removes an assignment", async () => {
    const wrapper = await mountPoints({
      accessPoints: [DOOR, LOCKER],
      bookable: {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [DOOR.id, LOCKER.id],
        },
      },
    });

    await rows(wrapper).at(0).find("button.assignment-remove").trigger("click");

    expect(lastUpdate(wrapper).accessPointDetails.accessPointIds).toEqual([
      LOCKER.id,
    ]);
  });

  /**
   * An empty picker while the list is still in flight used to claim the tenant
   * has no access point at all - a sentence the UI cannot say yet.
   */
  it("does not call the tenant empty while the list is still loading", async () => {
    let resolve;
    ApiAccessPointService.getAccessPoints.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );

    const wrapper = mountComponent(BookableEditAccessPoints, {
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
        },
      },
    });
    await wrapper.vm.$nextTick();

    await wrapper.find("button.assign-button").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toMatch(/noch kein Zugangspunkt angelegt/);

    resolve({ data: [] });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toMatch(/noch kein Zugangspunkt angelegt/);
  });

  it("keeps the buffer editable for the whole bookable", async () => {
    const wrapper = await mountPoints({ accessPoints: [DOOR] });

    await wrapper.find(".buffer-before input").setValue("15");

    expect(lastUpdate(wrapper).accessPointDetails.accessBuffer).toEqual({
      before: 15,
      after: 0,
    });
  });
});
