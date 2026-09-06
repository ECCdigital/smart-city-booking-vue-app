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
    commitBooking: vi.fn(),
    payBooking: vi.fn(),
    rejectBooking: vi.fn(),
    reinstateBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    getInvoice: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    reprintGroupCancellationReceipt: vi.fn(),
    updateGroupBooking: vi.fn(),
  },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: {
    allowUpdate: vi.fn(() => true),
    allowDelete: vi.fn(() => true),
    allowReprint: vi.fn(() => true),
  },
}));

import GroupBookingDetails from "@/components/Booking/GroupBookingDetails.vue";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const REPRINT = "Stornobeleg erneut ausstellen";

function member(overrides = {}) {
  return {
    id: "bk-1",
    name: "Erika Muster",
    timeCreated: 1_700_000_000_000,
    bookableItems: [{ _bookableUsed: { title: "Raum 1" } }],
    priceEur: 25,
    status: "requested",
    paymentProvider: "manual",
    attachments: [],
    ...overrides,
  };
}

function series(statuses) {
  const bookings = statuses.map((status, index) =>
    member({ id: `bk-${index + 1}`, status })
  );
  return {
    id: "grp-1",
    tenantId: "tenant-1",
    timeCreated: 1_700_000_000_000,
    bookingIds: bookings.map((b) => b.id),
    bookings,
  };
}

function mountDetails(groupBooking) {
  const store = new Vuex.Store({ modules: { toasts } });
  return mountComponent(GroupBookingDetails, {
    store,
    propsData: { groupBooking },
  });
}

function button(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((button) => button.text() === label);
}

function actionLabels(wrapper) {
  return wrapper
    .findAll("button.booking-action")
    .wrappers.map((button) => button.text());
}

function toastMessages(wrapper) {
  return wrapper.vm.$store.getters["toasts/all"].map((toast) => toast.message);
}

/**
 * The series drawer shows the series' derived state (spec E9) - the
 * members' shared state or Gemischt - offers a series-wide action only where
 * that state allows it, hands a member row's action to the same module, and
 * offers the aggregated cancellation receipt's reprint once every member is
 * cancelled (spec E8). There is no series-wide Wiederherstellen.
 */
describe("GroupBookingDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowUpdate.mockReturnValue(true);
    BookingPermissionService.allowReprint.mockReturnValue(true);
  });

  describe("the series' state", () => {
    it("shows the members' shared state", () => {
      const wrapper = mountDetails(series(["confirmed", "confirmed"]));
      expect(wrapper.find(".booking-status-chip").text()).toBe("Bestätigt");
    });

    it("says Gemischt where the members disagree", () => {
      const wrapper = mountDetails(series(["confirmed", "cancelled"]));
      expect(wrapper.find(".booking-status-chip").text()).toBe("Gemischt");
    });
  });

  describe("the series' actions", () => {
    it.each([
      [
        ["requested", "requested"],
        ["Freigeben", "Ablehnen"],
      ],
      [
        ["payment_due", "payment_due"],
        ["Als bezahlt markieren", "Stornieren"],
      ],
      [["confirmed", "confirmed"], ["Stornieren"]],
      [["rejected", "rejected"], []],
      [["cancelled", "cancelled"], []],
      [["requested", "confirmed"], []],
    ])("offers for members %j exactly %j", (statuses, labels) => {
      const wrapper = mountDetails(series(statuses));
      expect(actionLabels(wrapper)).toEqual(labels);
    });

    it("offers nothing to a reader without the update right", () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const wrapper = mountDetails(series(["requested", "requested"]));
      expect(actionLabels(wrapper)).toEqual([]);
    });

    it("hands the whole series to the transition module, with no single-member option", async () => {
      const groupBooking = series(["confirmed", "confirmed"]);
      const wrapper = mountDetails(groupBooking);
      const start = vi
        .spyOn(wrapper.vm.$refs.transitions, "start")
        .mockImplementation(() => {});

      await button(wrapper, "Stornieren").trigger("click");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: groupBooking.bookings[0],
        groupBooking,
        bookings: groupBooking.bookings,
        seriesOnly: true,
      });
    });

    it("hands a member row's action to the module with its series, so a mixed series acts per member", async () => {
      const groupBooking = series(["requested", "confirmed"]);
      const wrapper = mountDetails(groupBooking);
      const start = vi
        .spyOn(wrapper.vm.$refs.transitions, "start")
        .mockImplementation(() => {});
      expect(actionLabels(wrapper)).toEqual([]);

      wrapper
        .findComponent({ name: "BookingTable" })
        .vm.$emit("transition", "cancel", "bk-2");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: groupBooking.bookings[1],
        groupBooking,
        bookings: groupBooking.bookings,
      });
    });

    it("asks the host to reload after a transition, and after a stale failure", () => {
      const wrapper = mountDetails(series(["requested", "requested"]));
      const transitions = wrapper.findComponent({ name: "BookingTransitions" });

      transitions.vm.$emit("transitioned", {
        action: "confirm",
        groupBookingId: "grp-1",
      });
      transitions.vm.$emit("failed", { action: "confirm", refetch: false });
      transitions.vm.$emit("failed", { action: "confirm", refetch: true });

      expect(wrapper.emitted("update")).toHaveLength(2);
    });
  });

  describe("the cancellation receipt", () => {
    it("offers the reprint once every member is cancelled or rejected", () => {
      expect(
        button(mountDetails(series(["cancelled", "rejected"])), REPRINT)
      ).toBeDefined();
      expect(
        button(mountDetails(series(["cancelled", "confirmed"])), REPRINT)
      ).toBeUndefined();
    });

    it("keeps the reprint from a reader without the reprint right", () => {
      BookingPermissionService.allowReprint.mockReturnValue(false);
      const wrapper = mountDetails(series(["cancelled", "cancelled"]));
      expect(button(wrapper, REPRINT)).toBeUndefined();
    });

    it("reprints over the series' route and asks the host to reload", async () => {
      ApiGroupBookingService.reprintGroupCancellationReceipt.mockResolvedValue({
        success: true,
        data: series(["cancelled", "cancelled"]),
        errors: [],
      });
      const wrapper = mountDetails(series(["cancelled", "cancelled"]));

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(
        ApiGroupBookingService.reprintGroupCancellationReceipt
      ).toHaveBeenCalledWith(undefined, "grp-1");
      expect(wrapper.emitted("update")).toHaveLength(1);
      expect(toastMessages(wrapper)).toContain(
        "Der Stornobeleg der Serie wurde erneut ausgestellt."
      );
    });

    it("shows the reader's message on a 409 and reloads", async () => {
      ApiGroupBookingService.reprintGroupCancellationReceipt.mockRejectedValue(
        lifecycleError(409, "not_cancelled", {
          groupBookingId: "grp-1",
          bookingId: "bk-2",
        })
      );
      const wrapper = mountDetails(series(["cancelled", "cancelled"]));

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Die Buchung ist nicht storniert.");
      expect(wrapper.emitted("update")).toHaveLength(1);
    });
  });
});
