import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  clickMenuEntry,
  offeredActions,
  primaryButton,
} from "@tests/unit/support/statusPath";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";
import ProcessingService from "@/services/ProcessingService";

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
    generateReceipt: vi.fn(),
    reprintCancellationReceipt: vi.fn(),
    getCancellationReceipt: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    generateGroupReceipt: vi.fn(),
  },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowUpdate: vi.fn(() => true), allowReprint: vi.fn(() => true) },
}));
// The access section loads its projection on mount; it is the Locker strand's.
vi.mock("@/components/Booking/BookingAccessPoints.vue", () => ({
  default: {
    name: "BookingAccessPoints",
    render(h) {
      return h("div", { class: "booking-access-points-double" });
    },
  },
}));

import BookingDetails from "@/components/Booking/BookingDetails.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const REPRINT = "Stornobeleg erneut ausstellen";
const CREATE_RECEIPT = "Beleg erstellen";

function booking(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    timeCreated: 1_700_000_000_000,
    timeBegin: 1_700_003_600_000,
    timeEnd: 1_700_007_200_000,
    priceEur: 25,
    status: "requested",
    paymentMethod: "CASH",
    paymentProvider: "manual",
    bookableItems: {},
    attachments: [],
    ...overrides,
  };
}

function mountDetails(propsData = {}) {
  const store = new Vuex.Store({
    modules: {
      toasts,
      loading: { namespaced: true, actions: { start() {}, stop() {} } },
    },
  });
  return mountComponent(BookingDetails, {
    store,
    propsData: { booking: booking(), groupBooking: null, ...propsData },
  });
}

function button(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((button) => button.text() === label);
}

function toastMessages(wrapper) {
  return wrapper.vm.$store.getters["toasts/all"].map((toast) => toast.message);
}

const RECEIPT = {
  type: "cancellation",
  title: "storno-1.pdf",
  timeCreated: 1_700_000_000_000,
};

function infoCard(wrapper) {
  return wrapper
    .findAll(".section-card")
    .wrappers.find((card) => card.text().includes("Buchungsinformationen"));
}

/** Spies on the mounted transition module, so that no route is called. */
function spyOnStart(wrapper) {
  return vi
    .spyOn(wrapper.vm.$refs.transitions, "start")
    .mockImplementation(() => {});
}

/**
 * The detail drawer reads `booking.status` (spec E4) and offers the state's
 * transitions (spec E3) and the receipts by state (spec E8): the state word
 * in the headline beside the Kostenfrei marker, the path under it with the
 * paid date at Bestätigt, the primary transition as a button and the side
 * way in the menu (spec N3, N4), the reason block at Abgelehnt / Storniert,
 * "Beleg erstellen" only at Bestätigt, and the cancellation receipt's
 * reprint only at Abgelehnt / Storniert for whoever holds `booking.reprint`.
 */
describe("BookingDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowUpdate.mockReturnValue(true);
    BookingPermissionService.allowReprint.mockReturnValue(true);
  });

  describe("the state", () => {
    it.each([
      ["requested", "Angefragt"],
      ["payment_due", "Zahlung offen"],
      ["confirmed", "Bestätigt"],
      ["rejected", "Abgelehnt"],
      ["cancelled", "Storniert"],
    ])(
      "shows %s as %s in the headline, and nothing else as a payment state",
      (status, word) => {
        const wrapper = mountDetails({ booking: booking({ status }) });

        expect(wrapper.find(".booking-status-word").text()).toBe(word);
        expect(wrapper.text()).not.toContain("Status der Zahlung");
        expect(wrapper.text()).not.toContain("Offen");
      }
    );

    it("draws the path under the headline, cut where the booking ended", () => {
      const onPath = mountDetails({
        booking: booking({ status: "payment_due" }),
      });
      expect(
        onPath
          .findAll(".booking-status-segment-label")
          .wrappers.map((label) => label.text())
      ).toEqual(["Angefragt", "Zahlung offen", "Bestätigt"]);

      const cancelled = mountDetails({
        booking: booking({
          status: "cancelled",
          cancellationRefund: { cancelledFrom: "payment_due" },
        }),
      });
      expect(
        cancelled
          .findAll(".booking-status-segment-label")
          .wrappers.map((label) => label.text())
      ).toEqual(["Angefragt", "Zahlung offen", "Bestätigt", "Storniert"]);
      expect(cancelled.find(".booking-status-segment--void").text()).toBe(
        "Bestätigt"
      );
    });

    it("marks a free booking as Kostenfrei beside the state", () => {
      const free = mountDetails({ booking: booking({ priceEur: 0 }) });
      expect(free.find(".booking-status-free").text()).toBe("Kostenfrei");

      const priced = mountDetails();
      expect(priced.find(".booking-status-free").exists()).toBe(false);
    });

    it("names the paid date under Bestätigt where the booking carries one", () => {
      const paid = mountDetails({
        booking: booking({
          status: "confirmed",
          timePaid: new Date(2026, 2, 5, 14, 30).getTime(),
        }),
      });
      expect(paid.text()).toContain("bezahlt 05.03.2026, 14:30");

      const unpaid = mountDetails({
        booking: booking({ status: "payment_due", timePaid: 1 }),
      });
      const dates = unpaid
        .findAll(".booking-status-segment-date")
        .wrappers.map((date) => date.text());
      expect(dates).toHaveLength(1);
      expect(dates[0]).not.toContain("bezahlt");
    });

    it.each([
      ["rejected", "Ablehnungsgrund"],
      ["cancelled", "Stornierungsgrund"],
    ])(
      "shows the reason of a %s booking as %s under the path, and nowhere else",
      (status, caption) => {
        const wrapper = mountDetails({
          booking: booking({ status, rejectionReason: "Zu spät" }),
        });

        const block = wrapper.find(".booking-status-reason");
        expect(block.text()).toContain(caption);
        expect(block.text()).toContain("Zu spät");
        expect(infoCard(wrapper).text()).not.toContain("grund");
      }
    );

    it("shows no reason block without a reason, or on the path", () => {
      const noReason = mountDetails({
        booking: booking({ status: "rejected" }),
      });
      expect(noReason.find(".booking-status-reason").exists()).toBe(false);

      const onPath = mountDetails({
        booking: booking({ status: "requested", rejectionReason: "alt" }),
      });
      expect(onPath.find(".booking-status-reason").exists()).toBe(false);
    });
  });

  describe("the actions", () => {
    it.each([
      ["requested", "Freigeben", ["Ablehnen"]],
      ["payment_due", "Als bezahlt markieren", ["Stornieren"]],
      ["confirmed", null, ["Stornieren"]],
      ["rejected", "Wiederherstellen", null],
      ["cancelled", "Wiederherstellen", null],
    ])(
      "offers at %s the button %s and the menu %j",
      async (status, button, menu) => {
        const wrapper = mountDetails({ booking: booking({ status }) });
        expect(await offeredActions(wrapper)).toEqual({ button, menu });
      }
    );

    it("offers nothing to a reader without the update right", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const wrapper = mountDetails();
      expect(await offeredActions(wrapper)).toEqual({
        button: null,
        menu: null,
      });
    });

    it("hands a single booking to the transition module", async () => {
      const wrapper = mountDetails();
      const start = spyOnStart(wrapper);

      await primaryButton(wrapper).trigger("click");

      expect(start).toHaveBeenCalledWith("confirm", { booking: booking() });
    });

    it("hands a series member with its series and members", async () => {
      const members = [
        booking({ status: "confirmed" }),
        booking({ id: "bk-2", status: "confirmed" }),
      ];
      const groupBooking = {
        id: "grp-1",
        bookingIds: ["bk-1", "bk-2"],
        bookings: members,
      };
      const wrapper = mountDetails({ booking: members[0], groupBooking });
      const start = spyOnStart(wrapper);

      await clickMenuEntry(wrapper, "Stornieren");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: members[0],
        groupBooking,
        bookings: members,
      });
    });

    it("acts on a member alone when the series' members are not at hand", async () => {
      const wrapper = mountDetails({
        booking: booking({ status: "rejected" }),
        groupBooking: { id: "grp-1", bookingIds: ["bk-1", "bk-2"] },
      });
      const start = spyOnStart(wrapper);

      await primaryButton(wrapper).trigger("click");

      expect(start).toHaveBeenCalledWith("reinstate", {
        booking: booking({ status: "rejected" }),
      });
    });

    it("asks the host to reload the booking after a transition, and after a stale failure", () => {
      const wrapper = mountDetails();
      const transitions = wrapper.findComponent({ name: "BookingTransitions" });

      transitions.vm.$emit("transitioned", {
        action: "confirm",
        bookingId: "bk-1",
      });
      expect(wrapper.emitted("update")).toEqual([["bk-1"]]);

      transitions.vm.$emit("failed", {
        action: "confirm",
        error: null,
        message: "Nein",
        refetch: false,
      });
      expect(wrapper.emitted("update")).toHaveLength(1);

      transitions.vm.$emit("failed", {
        action: "confirm",
        error: null,
        message: "Weg",
        refetch: true,
      });
      expect(wrapper.emitted("update")).toEqual([["bk-1"], ["bk-1"]]);
    });
  });

  describe("the receipts", () => {
    it.each([
      ["requested", false],
      ["payment_due", false],
      ["confirmed", true],
      ["rejected", false],
      ["cancelled", false],
    ])("offers Beleg erstellen at %s: %s", (status, offered) => {
      const wrapper = mountDetails({ booking: booking({ status }) });
      expect(!!button(wrapper, CREATE_RECEIPT)).toBe(offered);
    });

    it.each([
      ["requested", false],
      ["payment_due", false],
      ["confirmed", false],
      ["rejected", true],
      ["cancelled", true],
    ])(
      "offers the cancellation receipt's reprint at %s: %s",
      (status, offered) => {
        const wrapper = mountDetails({ booking: booking({ status }) });
        expect(!!button(wrapper, REPRINT)).toBe(offered);
      }
    );

    it("keeps the reprint from a reader without the reprint right", () => {
      BookingPermissionService.allowReprint.mockReturnValue(false);
      const wrapper = mountDetails({
        booking: booking({ status: "cancelled" }),
      });
      expect(button(wrapper, REPRINT)).toBeUndefined();
    });

    it("lists the receipts already issued beside the reprint", () => {
      const wrapper = mountDetails({
        booking: booking({ status: "cancelled", attachments: [RECEIPT] }),
      });
      expect(wrapper.text()).toContain("storno-1.pdf");
      expect(button(wrapper, REPRINT)).toBeDefined();
    });

    it("reprints over the route and asks the host to reload the booking", async () => {
      ApiBookingService.reprintCancellationReceipt.mockResolvedValue({
        success: true,
        data: booking({ status: "cancelled", attachments: [RECEIPT] }),
        errors: [],
      });
      const wrapper = mountDetails({
        booking: booking({ status: "cancelled" }),
      });

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(ApiBookingService.reprintCancellationReceipt).toHaveBeenCalledWith(
        "bk-1"
      );
      expect(wrapper.emitted("update")).toEqual([["bk-1"]]);
      expect(toastMessages(wrapper)).toContain(
        "Der Stornobeleg wurde erneut ausgestellt."
      );
    });

    it("shows the reader's message on a 409 and reloads", async () => {
      ApiBookingService.reprintCancellationReceipt.mockRejectedValue(
        lifecycleError(409, "not_cancelled", { bookingId: "bk-1" })
      );
      const wrapper = mountDetails({
        booking: booking({ status: "cancelled" }),
      });

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(toastMessages(wrapper)).toContain(
        "Die Buchung ist nicht storniert."
      );
      expect(wrapper.text()).toContain("Die Buchung ist nicht storniert.");
      expect(wrapper.emitted("update")).toEqual([["bk-1"]]);
    });

    it("says so when a download fails, instead of hanging", async () => {
      ApiBookingService.getCancellationReceipt.mockRejectedValue(serverError());
      const wrapper = mountDetails({
        booking: booking({ status: "cancelled", attachments: [RECEIPT] }),
      });

      await wrapper.find(".cancellation-receipt-download").trigger("click");
      await flushPromises();

      expect(toastMessages(wrapper)).toContain(
        "Der Stornobeleg konnte nicht heruntergeladen werden."
      );
      expect(ProcessingService.operations.size).toBe(0);
    });

    describe("for a member of a series", () => {
      const confirmed = booking({ status: "confirmed" });
      const series = (other) => ({
        id: "grp-1",
        bookingIds: ["bk-1", "bk-2"],
        bookings: [confirmed, booking({ id: "bk-2", status: other })],
      });

      it.each([
        ["confirmed", true],
        ["payment_due", false],
        ["cancelled", false],
      ])(
        "offers Beleg erstellen to a confirmed member beside a %s one: %s",
        (other, offered) => {
          const wrapper = mountDetails({
            booking: confirmed,
            groupBooking: series(other),
          });
          expect(!!button(wrapper, CREATE_RECEIPT)).toBe(offered);
        }
      );

      it("asks single or series once every member is confirmed", async () => {
        const wrapper = mountDetails({
          booking: confirmed,
          groupBooking: series("confirmed"),
        });

        await button(wrapper, CREATE_RECEIPT).trigger("click");

        expect(wrapper.vm.openCreateAggregatedReceipt).toBe(true);
        expect(ApiBookingService.generateReceipt).not.toHaveBeenCalled();
      });
    });
  });
});
