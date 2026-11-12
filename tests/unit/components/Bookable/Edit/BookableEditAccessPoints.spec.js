import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookableEditAccessPoints from "@/components/Bookable/Edit/BookableEditAccessPoints.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn() },
}));

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
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

// A fixed Open Locker compartment: a door by type, a Fach on site.
const OPEN_LOCKER_COMPARTMENT = {
  id: "ap-open-locker",
  type: "door",
  provider: "open-locker",
  label: "Labor Fachbank 1 · Fach 2",
  externalId: "4f9c2a1e-0b7d-4c3a-9e51-2d6f8a0b1c3d",
};

// An Open Locker Schließfachanlage: its Fächer are Biletado's to assign.
const OPEN_LOCKER_SYSTEM = {
  id: "ap-open-locker-system",
  type: "locker",
  provider: "open-locker",
  label: "Fahrradgarage",
  externalId: "",
  config: { compartments: [] },
};

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

async function mountPoints({
  accessPoints = [],
  bookable = {},
  bookables = [],
} = {}) {
  ApiAccessPointService.getAccessPoints.mockResolvedValue({
    data: accessPoints,
  });
  ApiBookablesService.getBookables.mockResolvedValue({ data: bookables });

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
    expect(row.text()).toMatch(/im Buchungszeitraum mit anderen geteilt/);
  });

  /**
   * An Open Locker compartment is shared like a door, but it is no door
   * (ECCdigital/tickets#1036): its row says „Fach“ in type and grant, never
   * „Tür“, and in the picker it reads the same.
   */
  it("calls an assigned Open Locker compartment a Fach, shared for the period", async () => {
    const wrapper = await mountPoints({
      accessPoints: [OPEN_LOCKER_COMPARTMENT],
      bookable: {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [OPEN_LOCKER_COMPARTMENT.id],
        },
      },
    });

    const text = rows(wrapper).at(0).text();
    expect(text).toMatch(/Labor Fachbank 1 · Fach 2/);
    expect(text).toMatch(/Das Fach, im Buchungszeitraum mit anderen geteilt/);
    expect(text).not.toMatch(/Tür/);
  });

  /**
   * An Open Locker Schließfachanlage hands out a Fach per booked unit like
   * any Anlage, but Biletado assigns it, not the provider
   * (ECCdigital/tickets#1037).
   */
  it("says Biletado assigns the Fächer of an Open Locker Schließfachanlage", async () => {
    const wrapper = await mountPoints({
      accessPoints: [OPEN_LOCKER_SYSTEM],
      bookable: {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [OPEN_LOCKER_SYSTEM.id],
        },
      },
    });

    const text = rows(wrapper).at(0).text();
    expect(text).toMatch(/Schließfachanlage/);
    expect(text).toMatch(/von Biletado aus den Fächern der Anlage zugeteilt/);
    expect(text).not.toMatch(/vom Anbieter zugeteilt/);
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

  /**
   * An Anlage with its own Fächer belongs to one bookable only
   * (ECCdigital/tickets#1038): one another bookable links is not offered.
   * Doors and Anlagen whose provider assigns stay shareable.
   */
  describe("an Anlage with its own Fächer at one bookable only", () => {
    const OTHER = {
      id: "b2",
      title: "Lastenrad",
      accessPointDetails: {
        active: false,
        accessPointIds: [OPEN_LOCKER_SYSTEM.id, DOOR.id, LOCKER.id],
      },
    };

    async function pickerOptions(wrapper) {
      await wrapper.find("button.assign-button").trigger("click");
      await wrapper.vm.$nextTick();
      return wrapper.findAll(".assign-option").wrappers.map((o) => o.text());
    }

    it("does not offer an Anlage another bookable links, but its doors and provider Anlagen", async () => {
      const wrapper = await mountPoints({
        accessPoints: [DOOR, LOCKER, OPEN_LOCKER_SYSTEM],
        bookables: [OTHER],
      });

      const options = await pickerOptions(wrapper);
      expect(options).toHaveLength(2);
      expect(options.join(" ")).toMatch(/Haupteingang/);
      expect(options.join(" ")).toMatch(/Fahrradboxen Bahnhof/);
      expect(options.join(" ")).not.toMatch(/Fahrradgarage/);
    });

    it("offers an Anlage that only this bookable links, once it is removed", async () => {
      const wrapper = await mountPoints({
        accessPoints: [OPEN_LOCKER_SYSTEM],
        bookables: [
          {
            id: "b1",
            accessPointDetails: { accessPointIds: [OPEN_LOCKER_SYSTEM.id] },
          },
        ],
      });

      expect(await pickerOptions(wrapper)).toHaveLength(1);
    });

    it("offers every Anlage when the other bookables cannot be read; the save decides", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [OPEN_LOCKER_SYSTEM],
      });
      ApiBookablesService.getBookables.mockRejectedValue({
        response: { status: 403 },
      });
      const wrapper = mountComponent(BookableEditAccessPoints, {
        store: store(),
        propsData: {
          bookable: {
            id: "b1",
            accessPointDetails: { active: true, accessPointIds: [] },
          },
        },
      });
      await flushPromises();

      expect(await pickerOptions(wrapper)).toHaveLength(1);
    });

    it("reads no bookables while the tenant has no Anlage with its own Fächer", async () => {
      await mountPoints({ accessPoints: [DOOR, LOCKER] });

      expect(ApiBookablesService.getBookables).not.toHaveBeenCalled();
    });
  });

  /**
   * `amount` stays the editor's: a hint, never a refusal, when it is
   * unlimited or larger than the Fächer of a linked Anlage
   * (ECCdigital/tickets#1038).
   */
  describe("the hint on amount and Fächer", () => {
    const GARAGE = {
      ...OPEN_LOCKER_SYSTEM,
      config: {
        compartments: [
          { id: "c-1", number: 1 },
          { id: "c-2", number: 2 },
        ],
      },
    };
    const linked = (amount) => ({
      amount,
      accessPointDetails: {
        active: true,
        accessBuffer: { before: 0, after: 0 },
        accessPointIds: [GARAGE.id],
      },
    });
    const hint = (wrapper) =>
      wrapper.find("[data-test='compartment-count-hint']");

    it("says so when the amount is larger than the Fächer", async () => {
      const wrapper = await mountPoints({
        accessPoints: [GARAGE],
        bookable: linked(3),
      });

      expect(hint(wrapper).text()).toMatch(
        /Die Anzahl \(3\) ist größer als die 2 Fächer der Schließfachanlage „Fahrradgarage“/
      );
    });

    it("says so when the amount is unlimited", async () => {
      const wrapper = await mountPoints({
        accessPoints: [GARAGE],
        bookable: linked(null),
      });

      expect(hint(wrapper).text()).toMatch(
        /Die Anzahl ist unbegrenzt.*2 Fächer der Schließfachanlage „Fahrradgarage“/
      );
    });

    it("says nothing when the amount fits", async () => {
      const wrapper = await mountPoints({
        accessPoints: [GARAGE],
        bookable: linked(2),
      });

      expect(hint(wrapper).exists()).toBe(false);
    });
  });

  it("hands on only the access point details", async () => {
    const wrapper = await mountPoints({ accessPoints: [DOOR] });

    await wrapper.find("button.assign-button").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.find(".assign-option").trigger("click");

    expect(Object.keys(lastUpdate(wrapper))).toEqual(["accessPointDetails"]);
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

  /**
   * There is no number per Anlage. A booking gets one compartment per unit it
   * books at each assigned locker system, and the capacity is the bookable's
   * `amount` on the pricing tab plus the provider's live answer
   * (`.scratch/schliesssysteme-ohne-menge/spec.md`, local, not committed;
   * R2 and R4).
   */
  it("offers no amount field at an Anlage and names the rule instead", async () => {
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

    expect(wrapper.find("thead").text()).not.toMatch(/Menge/);
    expect(rows(wrapper).at(1).findAll("input")).toHaveLength(0);
    expect(rows(wrapper).at(1).text()).toMatch(
      /Je gebuchter Einheit ein Fach, vom Anbieter zugeteilt/
    );
  });

  /**
   * A map a bookable saved before the field was retired is neither read nor
   * rewritten here; the service drops it on the way out.
   */
  it("patches only the id list when an Anlage is removed", async () => {
    const stored = { [LOCKER.id]: 4 };
    const wrapper = await mountPoints({
      accessPoints: [DOOR, LOCKER],
      bookable: {
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [DOOR.id, LOCKER.id],
          accessPointAmounts: stored,
        },
      },
    });

    await rows(wrapper).at(1).find("button.assignment-remove").trigger("click");

    expect(lastUpdate(wrapper).accessPointDetails).toEqual({
      active: true,
      accessBuffer: { before: 0, after: 0 },
      accessPointIds: [DOOR.id],
      accessPointAmounts: stored,
    });
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
