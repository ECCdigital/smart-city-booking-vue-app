import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";
import {
  filterSegmentLabels,
  openFilterCard,
  pickFilterOption,
  typeSearch,
} from "@tests/unit/support/search";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: {
    getAccessPoints: vi.fn(),
    deleteAccessPoint: vi.fn(),
    getQrCode: vi.fn(),
  },
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
    props: ["open", "accessPoint", "accessPoints", "providers"],
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

const PAREVA_LOCKER = {
  id: "ap-pareva",
  type: "locker",
  provider: "pareva",
  label: "Schließfächer Rathaus",
  externalId: "66570d1a1f9b6357ed971746",
  validationRules: [],
};

// An Open Locker compartment as #970 and #971 stored it: a door of its own,
// opened remotely, named by locker bank and number.
const OPEN_LOCKER_COMPARTMENT = {
  id: "ap-open-locker",
  type: "door",
  mode: "remote",
  provider: "open-locker",
  label: "Labor Fachbank 1 · Fach 2",
  externalId: "4f9c2a1e-0b7d-4c3a-9e51-2d6f8a0b1c3d",
  validationRules: [],
};

// What the backend reports: iFBS lists its locations, Pareva lists nothing
// to take over (its listing names size codes, not products).
const PROVIDERS = [
  {
    id: "ifbs",
    title: "Parkraumservice",
    providerCapabilities: ["listAccessPoints"],
  },
  { id: "pareva", title: "Pareva", providerCapabilities: [] },
];

const addToast = vi.fn();

async function mountManagement() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant-1" },
      },
      toasts: { namespaced: true, actions: { add: addToast } },
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
    /**
     * The Herkunft is derived, not stored: "Vom Anbieter" for an Anlage whose
     * provider lists access points, "Selbst angelegt" for everything else -
     * a door, and a Pareva Anlage, which is typed in by its Produkt-ID.
     */
    it("names the type and the origin of both", async () => {
      ApiAccessAppsService.getProviders.mockResolvedValue({ data: PROVIDERS });
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR, LOCKER, PAREVA_LOCKER],
      });

      const wrapper = await mountManagement();

      const doorRow = rowFor(wrapper, "Haupteingang");
      expect(doorRow.text()).toContain("Tür");
      expect(doorRow.text()).toContain("Selbst angelegt");

      const lockerRow = rowFor(wrapper, "Fahrradboxen Bahnhof");
      expect(lockerRow.text()).toContain("Anlage");
      expect(lockerRow.text()).toContain("Vom Anbieter");

      const parevaRow = rowFor(wrapper, "Schließfächer Rathaus");
      expect(parevaRow.text()).toContain("Anlage");
      expect(parevaRow.text()).toContain("Selbst angelegt");
      expect(parevaRow.text()).not.toContain("Vom Anbieter");
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

    it("filters the table down to one type behind the funnel", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR, LOCKER],
      });

      const wrapper = await mountManagement();
      expect(rows(wrapper)).toHaveLength(2);

      await openFilterCard(wrapper);
      await pickFilterOption("Anlagen");
      expect(rows(wrapper)).toHaveLength(1);
      expect(rows(wrapper).at(0).text()).toContain("Fahrradboxen Bahnhof");

      await pickFilterOption("Türen");
      expect(rows(wrapper)).toHaveLength(1);
      expect(rows(wrapper).at(0).text()).toContain("Haupteingang");

      await pickFilterOption("Alle");
      expect(rows(wrapper)).toHaveLength(2);
    });

    /**
     * An Open Locker compartment is a door by type but a Fach on site
     * (ECCdigital/tickets#1036), so neither its type column nor the filter
     * that holds it calls it a „Tür“. A tenant without one sees the list as
     * before.
     */
    it("calls an Open Locker compartment a Fach, not a Tür", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [OPEN_LOCKER_COMPARTMENT],
      });

      const wrapper = await mountManagement();

      const row = rowFor(wrapper, "Labor Fachbank 1 · Fach 2");
      expect(row.text()).toContain("Fach");
      expect(row.text()).not.toContain("Tür");
      await openFilterCard(wrapper);
      expect(filterSegmentLabels()).toEqual(["Alle", "Fächer", "Anlagen"]);
    });

    it.each([
      [[DOOR, LOCKER], "Türen"],
      [[DOOR, OPEN_LOCKER_COMPARTMENT], "Türen & Fächer"],
      [[OPEN_LOCKER_COMPARTMENT, LOCKER], "Fächer"],
      [[], "Türen"],
    ])(
      "names the filter for doors by what it holds",
      async (accessPoints, label) => {
        ApiAccessPointService.getAccessPoints.mockResolvedValue({
          data: accessPoints,
        });

        const wrapper = await mountManagement();
        await openFilterCard(wrapper);

        expect(filterSegmentLabels()[1]).toBe(label);
      }
    );

    it("filters an Open Locker compartment with the doors", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR, OPEN_LOCKER_COMPARTMENT, LOCKER],
      });

      const wrapper = await mountManagement();
      await openFilterCard(wrapper);
      await pickFilterOption("Türen & Fächer");

      expect(rows(wrapper)).toHaveLength(2);
      expect(rowFor(wrapper, "Haupteingang")).toBeTruthy();
      expect(rowFor(wrapper, "Labor Fachbank 1 · Fach 2")).toBeTruthy();
    });

    it("narrows the table to what the search matches", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR, LOCKER],
      });
      const wrapper = await mountManagement();

      await typeSearch(
        wrapper.find("input[data-test='access-point-search']"),
        "Bahnhof"
      );

      expect(rows(wrapper)).toHaveLength(1);
      expect(rows(wrapper).at(0).text()).toContain("Fahrradboxen Bahnhof");
    });
  });

  /**
   * One button, one dialog: where the access point comes from - the
   * provider's listing or the admin's hand - is chosen inside the dialog, not
   * by the button that opened it.
   */
  describe("one button opens the dialog", () => {
    it("opens the dialog in create mode", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({ data: [] });

      const wrapper = await mountManagement();
      expect(wrapper.find(".create-door").exists()).toBe(false);
      expect(wrapper.find(".create-from-provider").exists()).toBe(false);

      const button = wrapper.find(".create-access-point");
      expect(button.text()).toContain("Zugangspunkt anlegen");
      await button.trigger("click");

      const dialog = wrapper.findComponent({ name: "AccessPointEditDialog" });
      expect(dialog.props("open")).toBe(true);
      expect(dialog.props("accessPoint")).toBe(null);
    });

    // ECCdigital/tickets#57: the creation floats as on every main page.
    it("floats bottom right, not in the section's header", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({ data: [] });

      const wrapper = await mountManagement();

      const button = wrapper.find(".create-access-point");
      expect(button.classes()).toEqual(
        expect.arrayContaining([
          "v-btn--fixed",
          "v-btn--bottom",
          "v-btn--right",
        ])
      );
      expect(wrapper.find(".v-card__title .create-access-point").exists()).toBe(
        false
      );
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

  /**
   * The QR code encodes the store-front address of the instance. Without
   * `STORE_FRONT_URL` the backend answers `503 store_front_url_missing`
   * (tickets#272), in the blob body the download asked for - and the toast
   * names the missing configuration instead of a bare failure.
   */
  describe("the QR code of a door", () => {
    function blobError(status, body) {
      const error = new Error(`Request failed with status code ${status}`);
      error.response = {
        status,
        data: new Blob([JSON.stringify(body)], { type: "application/json" }),
      };
      return error;
    }

    it("names the missing store-front address of the instance", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR],
      });
      ApiAccessPointService.getQrCode.mockRejectedValue(
        blobError(503, {
          error: "BaseError",
          code: "store_front_url_missing",
          statusCode: 503,
          params: {},
        })
      );

      const wrapper = await mountManagement();
      await clickRowAction(wrapper, "Haupteingang", ".download-qr-pdf");
      await flushPromises();

      expect(ApiAccessPointService.getQrCode).toHaveBeenCalledWith(
        "ap-door",
        "pdf",
        "tenant-1"
      );
      expect(addToast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "error",
          message:
            "Für diese Instanz ist keine Adresse der Storefront eingerichtet (STORE_FRONT_URL), der QR-Code lässt sich deshalb nicht erzeugen. Bitte wenden Sie sich an den Betrieb.",
        })
      );
    });

    it("keeps the general failure for any other error", async () => {
      ApiAccessPointService.getAccessPoints.mockResolvedValue({
        data: [DOOR],
      });
      ApiAccessPointService.getQrCode.mockRejectedValue(
        blobError(500, {
          error: "InternalError",
          code: "internal_error",
          statusCode: 500,
        })
      );

      const wrapper = await mountManagement();
      await clickRowAction(wrapper, "Haupteingang", ".download-qr-svg");
      await flushPromises();

      expect(addToast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "error",
          title: "QR-Code fehlgeschlagen",
          message: "Der QR-Code konnte nicht erzeugt werden.",
        })
      );
    });
  });
});
