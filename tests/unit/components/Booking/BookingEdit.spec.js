import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, lifecycleError } from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBooking: vi.fn(),
    storeBooking: vi.fn(),
    rejectBooking: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: { rejectGroupBooking: vi.fn(), updateGroupBooking: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantActivePaymentApps: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookable: vi.fn(), getBookablePrices: vi.fn() },
}));
vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { validateCheckoutItem: vi.fn() },
}));
vi.mock("@/components/Checkout/CheckoutCalendar.vue", () => ({
  default: {
    name: "CheckoutCalendar",
    render(h) {
      return h("div");
    },
  },
}));

import BookingEdit from "@/components/Booking/BookingEdit.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";

const CONFLICT_IN_CANCELLED =
  "Die Buchung ist inzwischen in einem anderen Zustand (Storniert).";
const GONE = "Die Buchung existiert nicht mehr.";

function booking(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    name: "Erika Muster",
    mail: "erika@example.org",
    timeBegin: 1_700_000_000_000,
    timeEnd: 1_700_003_600_000,
    priceEur: 25,
    status: "requested",
    bookableItems: [
      {
        bookableId: "room-1",
        amount: 1,
        _bookableUsed: {
          id: "room-1",
          title: "Raum 1",
          type: "room",
          priceType: "per-hour",
          priceCategories: [{ priceEur: 25, fixedPrice: false }],
        },
      },
    ],
    ...overrides,
  };
}

async function mountEdit(propsData = {}) {
  ApiTenantService.getTenantActivePaymentApps.mockResolvedValue({ data: [] });
  const store = new Vuex.Store({
    modules: {
      toasts,
      tenants: {
        namespaced: true,
        getters: {
          tenants: () => [{ id: "tenant-1", name: "Stadt" }],
          currentTenantId: () => "tenant-1",
        },
      },
    },
  });
  const wrapper = mountComponent(BookingEdit, {
    store,
    propsData: {
      booking: booking(),
      bookables: [],
      workflow: {},
      groupBooking: null,
      ...propsData,
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return { wrapper, store };
}

function inlineError(wrapper) {
  return wrapper.find(".booking-transition-error");
}

/**
 * The form's transition handlers follow spec E5: a refused transition is
 * read through the central reader and shown inline (like the group dialog's
 * `rejectError`), and after a 409 or 404 the form asks its page to reload the
 * booking, so that it shows the server's state.
 */
describe("BookingEdit", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("Ablehnen", () => {
    it("shows the conflict inline and asks for a reload on a 409", async () => {
      const { wrapper } = await mountEdit();
      ApiBookingService.rejectBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { status: "cancelled" })
      );

      const dialog = wrapper.findComponent({
        name: "BookingRejectConformationDialog",
      });
      dialog.vm.$emit("reject-booking", "bk-1", "Grund", false, undefined, 100);
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(inlineError(wrapper).text()).toBe(CONFLICT_IN_CANCELLED);
      expect(dialog.props("error")).toBe(CONFLICT_IN_CANCELLED);
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("still reads the naked `invalid_refund_percentage` string of a 400", async () => {
      const { wrapper } = await mountEdit();
      const error = new Error("Request failed with status code 400");
      error.response = { status: 400, data: "invalid_refund_percentage" };
      ApiBookingService.rejectBooking.mockRejectedValue(error);

      wrapper
        .findComponent({ name: "BookingRejectConformationDialog" })
        .vm.$emit("reject-booking", "bk-1", "Grund", false, undefined, 150);
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(inlineError(wrapper).text()).toBe(
        "Der Wert muss zwischen 0 und 100 liegen"
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
    });
  });

  describe("Wiederherstellen", () => {
    it("says the booking is gone and asks for a reload on a 404", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({ status: "rejected" }),
      });
      ApiBookingService.getBooking.mockRejectedValue(
        lifecycleError(404, "booking_not_found", { bookingId: "bk-1" })
      );

      wrapper
        .findComponent({ name: "BookingEditStatus" })
        .vm.$emit("confirm-unreject");
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(inlineError(wrapper).text()).toBe(GONE);
      expect(wrapper.emitted("reload")).toHaveLength(1);
    });
  });

  describe("Speichern", () => {
    async function saveWith(error) {
      const { wrapper } = await mountEdit();
      ApiBookingService.storeBooking.mockRejectedValue(error);

      wrapper.findComponent({ name: "SaveBar" }).vm.$emit("submit");
      await flushPromises();
      await wrapper.vm.$nextTick();
      return wrapper;
    }

    it("shows the conflict inline and asks for a reload on a 409", async () => {
      const wrapper = await saveWith(
        lifecycleError(409, "invalid_transition", { status: "cancelled" })
      );

      expect(inlineError(wrapper).text()).toBe(CONFLICT_IN_CANCELLED);
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("names a refused status change inline without a reload on a 400", async () => {
      const wrapper = await saveWith(
        lifecycleError(400, "invalid_status_change", {
          status: "confirmed",
          requested: "requested",
        })
      );

      expect(inlineError(wrapper).text()).toBe(
        "Dieser Statuswechsel ist nicht möglich."
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
    });
  });
});
