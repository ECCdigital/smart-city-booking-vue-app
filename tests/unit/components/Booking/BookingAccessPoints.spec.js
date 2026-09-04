import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookingAccessPoints from "@/components/Booking/BookingAccessPoints.vue";
import ApiAccessService from "@/services/api/ApiAccessService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessService", () => ({
  default: {
    getAccessPoints: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    unlatch: vi.fn(),
    getStatus: vi.fn(),
    getOpenStatus: vi.fn(),
  },
}));

vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowUpdate: vi.fn(() => true) },
}));

const HOUR = 60 * 60 * 1000;

const BOOKING = Object.freeze({
  id: "bk-1",
  tenantId: "t1",
  timeBegin: Date.now() - HOUR,
  timeEnd: Date.now() + HOUR,
});

function door(overrides = {}) {
  return {
    id: "ap-door",
    type: "door",
    provider: "nuki",
    label: "Haupteingang",
    mode: "both",
    validationRuleTypes: [],
    capabilities: ["open", "close", "getStatus"],
    accessFrom: BOOKING.timeBegin,
    accessTo: BOOKING.timeEnd,
    accessBuffer: { beforeMs: 0, afterMs: 0 },
    isProvisioned: true,
    ...overrides,
  };
}

function compartment(overrides = {}) {
  return {
    id: "ap-locker:auth-77",
    type: "locker",
    provider: "ifbs",
    label: "Fahrradboxen Bahnhof",
    mode: "remote",
    validationRuleTypes: [],
    capabilities: ["open"],
    accessFrom: BOOKING.timeBegin,
    accessTo: BOOKING.timeEnd,
    accessBuffer: { beforeMs: 0, afterMs: 0 },
    isProvisioned: true,
    externalBookingId: "auth-77",
    compartment: "17",
    ...overrides,
  };
}

function store() {
  return new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: vi.fn() } },
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

async function mountList({ entries = [], booking = {} } = {}) {
  ApiAccessService.getAccessPoints.mockResolvedValue({
    data: { success: true, data: entries },
  });

  const wrapper = mountComponent(BookingAccessPoints, {
    store: store(),
    propsData: { booking: { ...BOOKING, ...booking } },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

function tiles(wrapper) {
  return wrapper.findAll(".access-point-tile");
}

function openButton(tile) {
  return tile.find("[data-test='access-open']");
}

beforeEach(() => {
  vi.clearAllMocks();
  BookingPermissionService.allowUpdate.mockReturnValue(true);
});

/**
 * One list of accesses for doors and compartments, fed by the tenant-scaled
 * projection alone - `booking.lockerInfo` and `booking.accessInfo` are not
 * read here.
 */
describe("BookingAccessPoints", () => {
  it("reads the booking's accesses from the tenant-scaled access route", async () => {
    await mountList({ entries: [door()] });

    expect(ApiAccessService.getAccessPoints).toHaveBeenCalledWith("bk-1", "t1");
  });

  it("lists compartments and doors together, compartments first", async () => {
    const wrapper = await mountList({ entries: [door(), compartment()] });

    const titles = tiles(wrapper).wrappers.map((tile) =>
      tile.find(".access-point-tile__title").text()
    );
    expect(titles).toHaveLength(2);
    expect(titles[0]).toContain("Fahrradboxen Bahnhof");
    expect(titles[1]).toContain("Haupteingang");
  });

  it("names the compartment a person looks for", async () => {
    const wrapper = await mountList({ entries: [compartment()] });

    expect(tiles(wrapper).at(0).find(".access-point-tile__title").text()).toBe(
      "Fahrradboxen Bahnhof — Fach 17"
    );
  });

  it("shows the provider and the provider's process id", async () => {
    const wrapper = await mountList({ entries: [compartment()] });

    const meta = tiles(wrapper).at(0).find(".access-point-tile__meta").text();
    expect(meta).toContain("ifbs");
    expect(meta).toContain("auth-77");
  });

  it("shows nothing at all when the booking has no access", async () => {
    const wrapper = await mountList({ entries: [] });

    expect(wrapper.find(".access-point-grid").exists()).toBe(false);
  });

  describe("state", () => {
    it("reads an entry without a grant as reserved", async () => {
      const wrapper = await mountList({
        entries: [
          compartment({ externalBookingId: null, isProvisioned: false }),
        ],
      });

      expect(
        tiles(wrapper).at(0).find("[data-test='access-state']").text()
      ).toContain("Vorgemerkt");
    });

    it("reads a provisioned entry as granted", async () => {
      const wrapper = await mountList({ entries: [compartment()] });

      expect(
        tiles(wrapper).at(0).find("[data-test='access-state']").text()
      ).toContain("Erteilt");
    });

    it("reads an entry that lost its provisioning as revoked", async () => {
      const wrapper = await mountList({
        entries: [compartment({ isProvisioned: false })],
      });

      expect(
        tiles(wrapper).at(0).find("[data-test='access-state']").text()
      ).toContain("Widerrufen");
    });
  });

  describe("opening", () => {
    it("addresses the open call with the id of the projection, unsplit", async () => {
      ApiAccessService.open.mockResolvedValue({
        data: { success: true, data: {} },
      });
      ApiAccessService.getStatus.mockResolvedValue({
        data: { success: true, data: { open: true } },
      });

      const wrapper = await mountList({ entries: [compartment()] });
      await openButton(tiles(wrapper).at(0)).trigger("click");
      await flushPromises();

      expect(ApiAccessService.open).toHaveBeenCalledWith(
        "bk-1",
        "ap-locker:auth-77",
        "t1"
      );
    });

    it("keeps the open button visible but blocked, with the reason, where the access point is not remotely operable", async () => {
      const wrapper = await mountList({
        entries: [compartment({ mode: "authorization" })],
      });

      const tile = tiles(wrapper).at(0);
      expect(openButton(tile).exists()).toBe(true);
      expect(openButton(tile).attributes("disabled")).toBeTruthy();
      expect(tile.find("[data-test='access-blocked']").text()).toContain(
        "keine Fernsteuerung"
      );
    });

    it("blocks the open button outside the access window and says so", async () => {
      const wrapper = await mountList({
        entries: [
          compartment({
            accessFrom: BOOKING.timeEnd + HOUR,
            accessTo: BOOKING.timeEnd + 2 * HOUR,
          }),
        ],
      });

      const tile = tiles(wrapper).at(0);
      expect(openButton(tile).attributes("disabled")).toBeTruthy();
      expect(tile.find("[data-test='access-blocked']").text()).toContain(
        "Zeitfensters"
      );
    });

    it("blocks the open button without the permission to operate the booking", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);

      const wrapper = await mountList({ entries: [compartment()] });

      const tile = tiles(wrapper).at(0);
      expect(openButton(tile).attributes("disabled")).toBeTruthy();
      expect(tile.find("[data-test='access-blocked']").text()).toContain(
        "Berechtigung"
      );
    });

    it("names the blocking reason the server sent back", async () => {
      ApiAccessService.open.mockResolvedValue({
        data: {
          success: false,
          data: { blockingReasons: ["not_provisioned"] },
        },
      });

      const wrapper = await mountList({ entries: [compartment()] });
      await openButton(tiles(wrapper).at(0)).trigger("click");
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(tiles(wrapper).at(0).text()).toContain(
        "Der Zugang ist noch nicht freigegeben."
      );
    });

    it("leaves the open button alive where the entry declares no window at all", async () => {
      const wrapper = await mountList({
        entries: [compartment({ accessFrom: null, accessTo: null })],
      });

      const tile = tiles(wrapper).at(0);
      expect(openButton(tile).attributes("disabled")).toBeFalsy();
      expect(tile.find("[data-test='access-blocked']").exists()).toBe(false);
      expect(tile.find(".access-point-tile__window").exists()).toBe(false);
    });
  });

  it("says so when the accesses could not be read, instead of looking empty", async () => {
    ApiAccessService.getAccessPoints.mockRejectedValue(serverError());

    const wrapper = mountComponent(BookingAccessPoints, {
      store: store(),
      propsData: { booking: { ...BOOKING } },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.find("[data-test='access-load-error']").text()).toContain(
      "konnten nicht geladen werden"
    );
  });
});
