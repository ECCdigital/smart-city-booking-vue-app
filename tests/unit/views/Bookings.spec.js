import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import i18n from "@/language/index";
import toasts from "@/store/modules/toasts";
import { BOOKING_STATUS } from "@/utils/bookingStatus";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: {
    allowCreate: vi.fn(() => true),
    allowUpdate: vi.fn(() => true),
    allowDelete: vi.fn(() => true),
  },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBookings: vi.fn(),
    getBooking: vi.fn(),
    commitBooking: vi.fn(),
    payBooking: vi.fn(),
    rejectBooking: vi.fn(),
    reinstateBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    getGroupBookings: vi.fn(),
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiWorkflowService", () => ({
  default: { getWorkflowStates: vi.fn(), getBacklog: vi.fn() },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

import Bookings from "@/views/Bookings.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";

const OK = { success: true, data: null, errors: [] };
const CONFLICT_IN_CONFIRMED =
  "Die Buchung ist inzwischen in einem anderen Zustand (Bestätigt).";
const GONE = "Die Buchung existiert nicht mehr.";
/** The five state words in the order the filter lists them. */
const STATUS_LABELS = [
  "Angefragt",
  "Zahlung offen",
  "Bestätigt",
  "Abgelehnt",
  "Storniert",
];

function booking(overrides = {}) {
  return {
    id: "bk-1",
    name: "Erika Muster",
    timeCreated: 1_700_000_000_000,
    bookableItems: [{ _bookableUsed: { title: "Raum 1" } }],
    priceEur: 25,
    paymentProvider: "invoice",
    status: "requested",
    ...overrides,
  };
}

/** One booking per state, ids `bk-<status>`. */
function bookingsInEveryState() {
  return Object.values(BOOKING_STATUS).map((status) =>
    booking({ id: `bk-${status}`, status })
  );
}

async function mountBookings({
  bookings = [booking()],
  groupBookings = [],
  workflow = { active: false },
}) {
  ApiBookingService.getBookings.mockResolvedValue({ data: bookings });
  ApiGroupBookingService.getGroupBookings.mockResolvedValue({
    data: groupBookings,
  });
  ApiWorkflowService.getWorkflowStates.mockResolvedValue(workflow);
  ApiWorkflowService.getBacklog.mockResolvedValue([]);
  ApiBookingService.getCancellationRefundPreview.mockResolvedValue({});

  const store = new Vuex.Store({
    modules: {
      toasts,
      // The app's module reads a webpack-provided global `_`; the view only
      // needs the getter and the two actions.
      loading: {
        namespaced: true,
        getters: { isLoading: () => false },
        actions: { start() {}, stop() {} },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant-1" },
      },
      // The kanban asks whether to skip its status confirmation.
      userPreferences: {
        namespaced: true,
        getters: { shouldSkipStatusConfirmation: () => () => false },
        actions: { loadSkipStatusConfirmations() {} },
      },
    },
  });
  const wrapper = mountComponent(Bookings, {
    store,
    mocks: {
      $route: { query: {} },
      $router: { replace: vi.fn(() => Promise.resolve()) },
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  const listLoads = ApiBookingService.getBookings.mock.calls.length;
  const groupLoads = ApiGroupBookingService.getGroupBookings.mock.calls.length;
  return {
    wrapper,
    store,
    /** How often list and group list were reloaded since mounting. */
    reloads: () => ({
      list: ApiBookingService.getBookings.mock.calls.length - listLoads,
      groups:
        ApiGroupBookingService.getGroupBookings.mock.calls.length - groupLoads,
    }),
  };
}

function bookingIdsOf(wrapper, componentName) {
  return wrapper
    .findComponent({ name: componentName })
    .props("bookings")
    .map((item) => item.id);
}

/** The state words the status filter currently shows as selected. */
function selectedStatusLabels(wrapper) {
  return wrapper
    .findAll(".status-filter .v-chip")
    .wrappers.map((chip) => chip.text().trim());
}

/** Opens the status filter and clicks the entry with `label`, toggling it. */
async function toggleStatusFilter(wrapper, label) {
  await wrapper.find(".status-filter .v-input__slot").trigger("click");
  await wrapper.vm.$nextTick();
  Array.from(document.querySelectorAll(".v-select-list .v-list-item"))
    .find(
      (el) =>
        el.querySelector(".v-list-item__title")?.textContent.trim() === label
    )
    .click();
  await wrapper.vm.$nextTick();
  // Close the menu again so the next toggle opens a fresh one.
  await wrapper.find(".status-filter .v-input__slot").trigger("click");
  await wrapper.vm.$nextTick();
}

/** Switches the view through the toggle in the page header. */
async function switchView(wrapper, label) {
  wrapper
    .findAll(".v-btn-toggle .v-btn")
    .wrappers.find((btn) => btn.text().trim() === label)
    .trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

function toastMessages(store) {
  return store.getters["toasts/all"].map((toast) => toast.message);
}

/** Clicks the first row's menu entry with `title`. */
async function clickRowMenuEntry(wrapper, title) {
  await wrapper.find("td.controls-cell button").trigger("click");
  await wrapper.vm.$nextTick();
  const entry = Array.from(
    document.querySelectorAll(".v-menu__content .v-list-item")
  ).find(
    (el) =>
      el.querySelector(".v-list-item__title")?.textContent.trim() === title
  );
  entry.click();
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/** Clicks the button with `label` inside the open dialog. */
async function clickDialogButton(wrapper, label) {
  Array.from(document.querySelectorAll(".v-dialog--active button"))
    .find((el) => el.textContent.trim() === label)
    .click();
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * The list is a host of `BookingTransitions` (spec E3): its menus only raise
 * the transition, the module runs it, and the list reloads bookings and
 * groups after every successful transition and after every 409 or 404
 * (spec E5). List, calendar and kanban read the same data, so one reload
 * covers all three.
 */
describe("Bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  /**
   * The status filter (spec E11): a multi-select over the five states, all
   * selected by default, narrowing the table and the calendar - not the
   * kanban, whose columns are workflow states. Plain component state, no
   * persistence.
   */
  describe("the status filter", () => {
    it("has all five states selected by default and the table shows every booking", async () => {
      const { wrapper } = await mountBookings({
        bookings: bookingsInEveryState(),
      });

      expect(selectedStatusLabels(wrapper)).toEqual(STATUS_LABELS);
      expect(bookingIdsOf(wrapper, "BookingTable")).toEqual([
        "bk-requested",
        "bk-payment_due",
        "bk-confirmed",
        "bk-rejected",
        "bk-cancelled",
      ]);
    });

    it("drops the bookings of a deselected state from the table", async () => {
      const { wrapper } = await mountBookings({
        bookings: bookingsInEveryState(),
      });

      await toggleStatusFilter(wrapper, "Storniert");
      await toggleStatusFilter(wrapper, "Abgelehnt");

      expect(bookingIdsOf(wrapper, "BookingTable")).toEqual([
        "bk-requested",
        "bk-payment_due",
        "bk-confirmed",
      ]);
    });

    it("applies to the calendar as well", async () => {
      const { wrapper } = await mountBookings({
        bookings: bookingsInEveryState(),
      });

      await toggleStatusFilter(wrapper, "Angefragt");
      await switchView(wrapper, "Kalender");

      expect(bookingIdsOf(wrapper, "BookingOverviewCalendar")).toEqual([
        "bk-payment_due",
        "bk-confirmed",
        "bk-rejected",
        "bk-cancelled",
      ]);
    });

    it("leaves the kanban alone, whose columns are workflow states", async () => {
      const { wrapper } = await mountBookings({
        bookings: bookingsInEveryState(),
        workflow: {
          active: true,
          states: [
            { id: "st-1", name: "Neu", tasks: [{ id: "bk-requested" }] },
          ],
        },
      });

      await toggleStatusFilter(wrapper, "Angefragt");
      await switchView(wrapper, "Kanban");

      expect(bookingIdsOf(wrapper, "BookingWorkflow")).toEqual([
        "bk-requested",
        "bk-payment_due",
        "bk-confirmed",
        "bk-rejected",
        "bk-cancelled",
      ]);
    });

    it("shows nothing once every state is deselected", async () => {
      const { wrapper } = await mountBookings({
        bookings: bookingsInEveryState(),
      });

      for (const label of STATUS_LABELS) {
        await toggleStatusFilter(wrapper, label);
      }

      expect(selectedStatusLabels(wrapper)).toEqual([]);
      expect(bookingIdsOf(wrapper, "BookingTable")).toEqual([]);
    });
  });

  describe("after a transition", () => {
    it("reloads bookings and groups once Freigeben went through", async () => {
      const { wrapper, reloads } = await mountBookings({});
      ApiBookingService.commitBooking.mockResolvedValue(OK);

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(ApiBookingService.commitBooking).toHaveBeenCalledWith("bk-1");
      expect(reloads()).toEqual({ list: 1, groups: 1 });
    });

    it("reinstates a rejected booking over the reinstate route and reloads", async () => {
      const { wrapper, reloads } = await mountBookings({
        bookings: [booking({ status: "rejected" })],
      });
      ApiBookingService.reinstateBooking.mockResolvedValue(OK);

      await clickRowMenuEntry(wrapper, "Wiederherstellen");
      expect(ApiBookingService.reinstateBooking).not.toHaveBeenCalled();
      await clickDialogButton(wrapper, "Wiederherstellen");

      expect(ApiBookingService.reinstateBooking).toHaveBeenCalledWith("bk-1");
      expect(reloads()).toEqual({ list: 1, groups: 1 });
    });
  });

  describe("after a refused transition", () => {
    it("shows the state the booking moved to and reloads on a 409", async () => {
      const { wrapper, store, reloads } = await mountBookings({});
      ApiBookingService.commitBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", {
          bookingId: "bk-1",
          status: "confirmed",
          transition: "confirm",
        })
      );

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(CONFLICT_IN_CONFIRMED);
      expect(reloads()).toEqual({ list: 1, groups: 1 });
    });

    it("says the booking is gone and reloads on a 404", async () => {
      const { wrapper, store, reloads } = await mountBookings({});
      ApiBookingService.commitBooking.mockRejectedValue(
        lifecycleError(404, "booking_not_found", { bookingId: "bk-1" })
      );

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(GONE);
      expect(reloads()).toEqual({ list: 1, groups: 1 });
    });

    it("keeps the consistency check's message and does not reload on a 200 with success false", async () => {
      const { wrapper, store, reloads } = await mountBookings({});
      ApiBookingService.commitBooking.mockResolvedValue({
        success: false,
        data: null,
        errors: [{ code: "PAYMENT_PROVIDER_REQUIRED" }],
      });

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(
        "Die Buchung konnte nicht freigegeben werden."
      );
      expect(reloads()).toEqual({ list: 0, groups: 0 });
    });

    it("falls back to the generic message and does not reload on a 500", async () => {
      const { wrapper, store, reloads } = await mountBookings({});
      ApiBookingService.commitBooking.mockRejectedValue(serverError());

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(
        "Die Buchung konnte nicht freigegeben werden."
      );
      expect(reloads()).toEqual({ list: 0, groups: 0 });
    });
  });

  describe("a series member", () => {
    it("is handed to the module with its series, which asks about the whole series", async () => {
      const { wrapper, store, reloads } = await mountBookings({
        bookings: [booking(), booking({ id: "bk-2" })],
        groupBookings: [{ id: "grp-1", bookingIds: ["bk-1", "bk-2"] }],
      });
      ApiGroupBookingService.commitGroupBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { bookingIds: ["bk-2"] })
      );

      await clickRowMenuEntry(wrapper, "Freigeben");
      await clickDialogButton(wrapper, "Serie freigeben");

      expect(ApiGroupBookingService.commitGroupBooking).toHaveBeenCalledWith(
        null,
        "grp-1"
      );
      const expected =
        "Die Buchung ist inzwischen in einem anderen Zustand. Betroffene Buchungen: bk-2";
      expect(toastMessages(store)).toContain(expected);
      expect(
        wrapper
          .findComponent({ name: "GroupBookingCommitDialog" })
          .props("error")
      ).toBe(expected);
      expect(reloads()).toEqual({ list: 1, groups: 1 });
    });
  });

  describe("the dialogs of the transitions", () => {
    it("open from the row menu for Als bezahlt markieren and Ablehnen", async () => {
      const { wrapper } = await mountBookings({
        bookings: [booking({ status: "payment_due" })],
      });

      await clickRowMenuEntry(wrapper, "Als bezahlt markieren");

      expect(
        wrapper.findComponent({ name: "BookingPayDialog" }).props("open")
      ).toBe(true);
    });

    it("still read the naked `invalid_refund_percentage` string of a 400", async () => {
      const { wrapper, store, reloads } = await mountBookings({});
      const error = new Error("Request failed with status code 400");
      error.response = { status: 400, data: "invalid_refund_percentage" };
      ApiBookingService.rejectBooking.mockRejectedValue(error);

      await clickRowMenuEntry(wrapper, "Ablehnen");
      const dialog = wrapper.findComponent({
        name: "BookingRejectConformationDialog",
      });
      expect(dialog.props("open")).toBe(true);
      dialog.vm.$emit("reject-booking", "bk-1", "Grund", false, undefined, 50);
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(toastMessages(store)).toContain(
        i18n.t("booking.cancellationRefund.percentageRange")
      );
      expect(reloads()).toEqual({ list: 0, groups: 0 });
    });
  });
});
