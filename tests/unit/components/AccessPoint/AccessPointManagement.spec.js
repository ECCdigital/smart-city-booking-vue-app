import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn(), deleteAccessPoint: vi.fn() },
}));
vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { getProviders: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: { getBookings: vi.fn() },
}));
vi.mock("@/components/AccessPoint/AccessPointEditDialog.vue", () => ({
  default: {
    name: "AccessPointEditDialog",
    props: ["open", "accessPoint", "accessPoints", "providers", "source"],
    render: () => null,
  },
}));
vi.mock("@/components/AccessPoint/AccessPointDeleteDialog.vue", () => ({
  default: {
    name: "AccessPointDeleteDialog",
    props: [
      "open",
      "accessPoint",
      "affectedBookables",
      "runningBookings",
      "bookingsUnreadable",
      "loadingBookings",
      "deleting",
      "error",
    ],
    render: () => null,
  },
}));
vi.mock("@/components/AccessPoint/AccessPointRotateDialog.vue", () => ({
  default: {
    name: "AccessPointRotateDialog",
    props: ["open", "accessPoint"],
    render: () => null,
  },
}));

import AccessPointManagement from "@/components/AccessPoint/AccessPointManagement.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";

const UNASSIGNED = "Keinem Buchungsobjekt zugeordnet";
const NOT_READABLE = "Nicht abrufbar";
const HINT = "Die Spalte „Zuordnung“ kann nicht gefüllt werden";

const DOOR = {
  id: "ap-door",
  type: "door",
  provider: "nuki",
  label: "Haupteingang",
  externalId: "lock-1",
  validationRules: [{ type: "qrScan" }],
};

const LOCKER = {
  id: "ap-locker",
  type: "locker",
  provider: "ifbs",
  label: "Fahrradboxen Bahnhof",
  externalId: "loc-42",
  validationRules: [],
};

async function mountManagement() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant-1" },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(AccessPointManagement, { store });
  await flushPromises();
  await wrapper.vm.$nextTick();
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

function rows(wrapper) {
  return wrapper.findAll("tbody tr");
}

function rowFor(wrapper, label) {
  return rows(wrapper).wrappers.find((row) => row.text().includes(label));
}

/**
 * The row actions live in a `v-menu`, which detaches its content into the
 * `data-app` container - so the item is clicked where Vuetify puts it.
 */
async function clickRowAction(wrapper, label, selector) {
  await rowFor(wrapper, label).find(".row-menu").trigger("click");
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
  document.querySelector(selector).click();
  await wrapper.vm.$nextTick();
}

/**
 * The assignment column is resolved from the bookables, not from the access
 * points, so a denied bookable list leaves it unresolvable. The original
 * decision - "the list stays usable without the assignment column" - is kept:
 * nothing replaces the table. What is not kept is the column then claiming
 * "Keinem Buchungsobjekt zugeordnet" for every row, which is an assertion
 * about data the user was refused.
 */
describe("AccessPointManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessAppsService.getProviders.mockResolvedValue({ data: [] });
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    ApiBookingService.getBookings.mockResolvedValue({ data: [] });
  });

  it("keeps the access point table when the bookable list is forbidden", async () => {
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [{ id: "ap1", label: "Door", externalId: "x1" }],
    });
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());

    const wrapper = await mountManagement();

    expect(wrapper.text()).toContain("Door");
    expect(wrapper.text()).toContain(NOT_READABLE);
    expect(wrapper.text()).not.toContain(UNASSIGNED);
    expect(wrapper.text()).toContain(HINT);
  });

  it("still says 'not assigned' when the bookables were readable", async () => {
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [{ id: "ap1", label: "Door", externalId: "x1" }],
    });

    const wrapper = await mountManagement();

    expect(wrapper.text()).toContain(UNASSIGNED);
    expect(wrapper.text()).not.toContain(NOT_READABLE);
    expect(wrapper.text()).not.toContain(HINT);
  });

  /**
   * Since the locker fold a locker system is a row in `accesspoints` like a
   * door, so it belongs in the same list - told apart by its type and by where
   * it came from, not by a screen of its own.
   */
  describe("doors and locker systems in one list", () => {
    it("names the type and the origin of both", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR, LOCKER],
      });

      const wrapper = await mountManagement();

      const doorRow = rowFor(wrapper, "Haupteingang");
      expect(doorRow.text()).toContain("Tür");
      expect(doorRow.text()).toContain("Selbst angelegt");

      const lockerRow = rowFor(wrapper, "Fahrradboxen Bahnhof");
      expect(lockerRow.text()).toContain("Anlage");
      expect(lockerRow.text()).toContain("Vom Anbieter");
    });

    /**
     * A locker system carries no validation rules (the migration creates it
     * with `validationRules: []`), so the QR question does not arise for it.
     */
    it("says the QR scan does not apply to a locker system", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR, LOCKER],
      });

      const wrapper = await mountManagement();

      expect(rowFor(wrapper, "Haupteingang").text()).toContain("erforderlich");
      expect(rowFor(wrapper, "Fahrradboxen Bahnhof").text()).toContain(
        "entfällt"
      );
    });

    it("says where the capacity of a locker system is set", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [LOCKER],
      });
      ApiBookablesService.getBookables.mockResolvedValue({
        data: [
          {
            id: "b1",
            title: "Fahrradbox",
            accessPointDetails: { accessPointIds: [LOCKER.id] },
          },
        ],
      });

      const wrapper = await mountManagement();

      const row = rowFor(wrapper, "Fahrradboxen Bahnhof");
      expect(row.text()).toContain("Fahrradbox");
      expect(row.text()).toContain("Kapazität");
    });

    it("filters the table down to one type", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR, LOCKER],
      });

      const wrapper = await mountManagement();
      expect(rows(wrapper)).toHaveLength(2);

      await wrapper.find(".type-filter-locker").trigger("click");
      expect(rows(wrapper)).toHaveLength(1);
      expect(rows(wrapper).at(0).text()).toContain("Fahrradboxen Bahnhof");

      await wrapper.find(".type-filter-door").trigger("click");
      expect(rows(wrapper)).toHaveLength(1);
      expect(rows(wrapper).at(0).text()).toContain("Haupteingang");

      await wrapper.find(".type-filter-all").trigger("click");
      expect(rows(wrapper)).toHaveLength(2);
    });
  });

  /**
   * Two buttons, one dialog: a door is entered by hand, a locker system is
   * taken over from the provider listing.
   */
  describe("the two ways into the dialog", () => {
    it("opens the dialog for a hand-entered door", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({ data: [] });

      const wrapper = await mountManagement();
      await wrapper.find(".create-door").trigger("click");

      const dialog = wrapper.findComponent({ name: "AccessPointEditDialog" });
      expect(dialog.props("open")).toBe(true);
      expect(dialog.props("accessPoint")).toBe(null);
      expect(dialog.props("source")).toBe("manual");
    });

    it("opens the same dialog on the provider picker", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({ data: [] });

      const wrapper = await mountManagement();
      await wrapper.find(".create-from-provider").trigger("click");

      const dialog = wrapper.findComponent({ name: "AccessPointEditDialog" });
      expect(dialog.props("open")).toBe(true);
      expect(dialog.props("source")).toBe("provider");
    });
  });

  /**
   * Deleting stays deleting, but the dialog is told which bookings hold a
   * granted, unrevoked access at the access point. The tenant's bookings carry
   * that in `accessInfo`; the tenant-wide access route answers per booking, and
   * `/access/access-points/:id/bookings` is the caller's own bookings only.
   */
  describe("what the delete dialog is told", () => {
    const NOW = Date.now();

    const RUNNING = {
      id: "booking-7",
      name: "Erika Mustermann",
      timeEnd: NOW + 3_600_000,
      accessInfo: [
        {
          accessPointId: LOCKER.id,
          accessPointType: "locker",
          isProvisioned: true,
          revokedAt: null,
          grant: { authorizationId: "auth-1" },
        },
      ],
    };

    const REVOKED = {
      id: "booking-8",
      timeEnd: NOW + 3_600_000,
      accessInfo: [
        {
          accessPointId: LOCKER.id,
          accessPointType: "locker",
          isProvisioned: true,
          revokedAt: NOW - 1000,
          grant: { authorizationId: "auth-2" },
        },
      ],
    };

    it("hands over the bookings with a live grant at the access point", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [LOCKER],
      });
      ApiBookingService.getBookings.mockResolvedValue({
        data: [RUNNING, REVOKED],
      });

      const wrapper = await mountManagement();
      await clickRowAction(
        wrapper,
        "Fahrradboxen Bahnhof",
        ".delete-access-point"
      );
      await flushPromises();
      await wrapper.vm.$nextTick();

      const dialog = wrapper.findComponent({ name: "AccessPointDeleteDialog" });
      expect(dialog.props("open")).toBe(true);
      expect(dialog.props("runningBookings")).toEqual([RUNNING]);
      expect(dialog.props("bookingsUnreadable")).toBe(false);
    });

    it("tells the dialog when the bookings could not be read", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [LOCKER],
      });
      ApiBookingService.getBookings.mockRejectedValue(forbiddenError());

      const wrapper = await mountManagement();
      await clickRowAction(
        wrapper,
        "Fahrradboxen Bahnhof",
        ".delete-access-point"
      );
      await flushPromises();
      await wrapper.vm.$nextTick();

      const dialog = wrapper.findComponent({ name: "AccessPointDeleteDialog" });
      expect(dialog.props("runningBookings")).toEqual([]);
      expect(dialog.props("bookingsUnreadable")).toBe(true);
    });
  });
});
