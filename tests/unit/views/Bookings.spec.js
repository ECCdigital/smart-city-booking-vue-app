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
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    getGroupBookings: vi.fn(),
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
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

const CONFLICT_IN_CONFIRMED =
  "Die Buchung ist inzwischen in einem anderen Zustand (Bestätigt).";
const GONE = "Die Buchung existiert nicht mehr.";

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

async function mountBookings({ bookings = [booking()], groupBookings = [] }) {
  ApiBookingService.getBookings.mockResolvedValue({ data: bookings });
  ApiGroupBookingService.getGroupBookings.mockResolvedValue({
    data: groupBookings,
  });
  ApiWorkflowService.getWorkflowStates.mockResolvedValue({ active: false });

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
  return { wrapper, store };
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

/**
 * Every transition handler of the list follows spec E5: the error is read
 * through the central reader and shown as a toast, and after a 409 or 404
 * the list is reloaded so that it shows the server's state. The list feeds
 * the calendar and the kanban, so one reload covers all three.
 */
describe("Bookings", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("Freigeben", () => {
    it("names the state the booking moved to and reloads the list on a 409", async () => {
      const { wrapper, store } = await mountBookings({});
      ApiBookingService.commitBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", {
          bookingId: "bk-1",
          status: "confirmed",
          transition: "confirm",
        })
      );
      const listLoads = ApiBookingService.getBookings.mock.calls.length;

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(CONFLICT_IN_CONFIRMED);
      expect(ApiBookingService.getBookings.mock.calls.length).toBe(
        listLoads + 1
      );
    });

    it("says the booking is gone and reloads the list on a 404", async () => {
      const { wrapper, store } = await mountBookings({});
      ApiBookingService.commitBooking.mockRejectedValue(
        lifecycleError(404, "booking_not_found", { bookingId: "bk-1" })
      );
      const listLoads = ApiBookingService.getBookings.mock.calls.length;

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(GONE);
      expect(ApiBookingService.getBookings.mock.calls.length).toBe(
        listLoads + 1
      );
    });

    it("keeps the consistency check's own message on a 200 with success false", async () => {
      const { wrapper, store } = await mountBookings({});
      ApiBookingService.commitBooking.mockResolvedValue({
        success: false,
        data: null,
        errors: [{ code: "PAYMENT_PROVIDER_REQUIRED" }],
      });
      const listLoads = ApiBookingService.getBookings.mock.calls.length;

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(
        "Die Buchung konnte nicht freigegeben werden."
      );
      expect(ApiBookingService.getBookings.mock.calls.length).toBe(listLoads);
    });

    it("falls back to the generic message and does not reload on a 500", async () => {
      const { wrapper, store } = await mountBookings({});
      ApiBookingService.commitBooking.mockRejectedValue(serverError());
      const listLoads = ApiBookingService.getBookings.mock.calls.length;

      await clickRowMenuEntry(wrapper, "Freigeben");

      expect(toastMessages(store)).toContain(
        "Die Buchung konnte nicht freigegeben werden."
      );
      expect(ApiBookingService.getBookings.mock.calls.length).toBe(listLoads);
    });
  });

  describe("Freigeben of a series member", () => {
    it("lists the diverging members in the dialog and reloads on a 409", async () => {
      const { wrapper, store } = await mountBookings({
        bookings: [booking(), booking({ id: "bk-2" })],
        groupBookings: [{ id: "grp-1", bookingIds: ["bk-1", "bk-2"] }],
      });
      ApiGroupBookingService.commitGroupBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", {
          bookingIds: ["bk-2"],
        })
      );
      const listLoads = ApiBookingService.getBookings.mock.calls.length;

      await clickRowMenuEntry(wrapper, "Freigeben");
      const dialog = wrapper.findComponent({
        name: "GroupBookingCommitDialog",
      });
      dialog.vm.$emit("commit-group-booking");
      await flushPromises();
      await wrapper.vm.$nextTick();

      const expected =
        "Die Buchung ist inzwischen in einem anderen Zustand. Betroffene Buchungen: bk-2";
      expect(toastMessages(store)).toContain(expected);
      expect(dialog.props("error")).toBe(expected);
      expect(ApiBookingService.getBookings.mock.calls.length).toBe(
        listLoads + 1
      );
    });
  });

  describe("Als bezahlt markieren", () => {
    it("shows the conflict in the dialog and reloads the list on a 409", async () => {
      const { wrapper, store } = await mountBookings({
        bookings: [booking({ status: "payment_due" })],
      });
      ApiBookingService.payBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", {
          bookingId: "bk-1",
          status: "confirmed",
          transition: "pay",
        })
      );
      const listLoads = ApiBookingService.getBookings.mock.calls.length;

      await clickRowMenuEntry(wrapper, "Als bezahlt markieren");
      const dialog = wrapper.findComponent({ name: "BookingPayDialog" });
      dialog.vm.$emit("pay-single-booking", {
        id: "bk-1",
        paymentMethod: "CASH",
        timePaid: null,
      });
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(toastMessages(store)).toContain(CONFLICT_IN_CONFIRMED);
      expect(dialog.props("error")).toBe(CONFLICT_IN_CONFIRMED);
      expect(ApiBookingService.getBookings.mock.calls.length).toBe(
        listLoads + 1
      );
    });
  });

  describe("Ablehnen", () => {
    async function rejectWith(error) {
      const { wrapper, store } = await mountBookings({});
      ApiBookingService.rejectBooking.mockRejectedValue(error);
      const listLoads = ApiBookingService.getBookings.mock.calls.length;

      await clickRowMenuEntry(wrapper, "Ablehnen");
      const dialog = wrapper.findComponent({
        name: "BookingRejectConformationDialog",
      });
      dialog.vm.$emit("reject-booking", "bk-1", "Grund", false, undefined, 50);
      await flushPromises();
      await wrapper.vm.$nextTick();

      return {
        store,
        dialog,
        reloaded: ApiBookingService.getBookings.mock.calls.length - listLoads,
      };
    }

    it("names the conflict in the dialog and reloads the list on a 409", async () => {
      const { store, dialog, reloaded } = await rejectWith(
        lifecycleError(409, "invalid_transition", { status: "cancelled" })
      );

      const expected =
        "Die Buchung ist inzwischen in einem anderen Zustand (Storniert).";
      expect(toastMessages(store)).toContain(expected);
      expect(dialog.props("error")).toBe(expected);
      expect(reloaded).toBe(1);
    });

    it("still reads the naked `invalid_refund_percentage` string of a 400", async () => {
      const error = new Error("Request failed with status code 400");
      error.response = { status: 400, data: "invalid_refund_percentage" };

      const { store, reloaded } = await rejectWith(error);

      expect(toastMessages(store)).toContain(
        i18n.t("booking.cancellationRefund.percentageRange")
      );
      expect(reloaded).toBe(0);
    });
  });
});
