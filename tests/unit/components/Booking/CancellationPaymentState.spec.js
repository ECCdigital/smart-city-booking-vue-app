import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, lifecycleError } from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: { setRefundState: vi.fn(), setPaymentState: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: {
    allowRead: vi.fn(() => true),
    allowUpdate: vi.fn(() => true),
    allowTransition: vi.fn(() => true),
    allowDelete: vi.fn(() => true),
  },
}));

import BookingTable from "@/components/Booking/BookingTable.vue";
import CancellationRefundAudit from "@/components/Booking/CancellationRefundAudit.vue";
import CancellationRefundState from "@/components/Booking/CancellationRefundState.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const COMPLETED_AT = Date.UTC(2026, 9, 2, 7, 30);

function booking(refund = {}) {
  return {
    id: "bk-1",
    name: "Erika Muster",
    timeCreated: 1_700_000_000_000,
    bookableItems: [{ _bookableUsed: { title: "Raum 1" } }],
    priceEur: 40,
    status: "cancelled",
    cancellationRefund: {
      cancelledFrom: "payment_due",
      originalAmountEur: 40,
      refundAmountEur: 30,
      cancellationFeeEur: 10,
      paymentState: "open",
      ...refund,
    },
  };
}

function mountState(propsBooking = booking()) {
  const store = new Vuex.Store({ modules: { toasts } });
  return mountComponent(CancellationRefundState, {
    store,
    propsData: { booking: propsBooking, kind: "payment" },
  });
}

const text = (wrapper) => wrapper.text().replace(/\s+/g, " ");

/**
 * The fee a booking cancelled before it was paid still owes: marked in the
 * list beside Storniert and on the Buchungsseite, where whoever may edit the
 * booking ticks it off („Restzahlung erhalten“), as with the refund.
 */
describe("the remaining payment of a booking cancelled unpaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowUpdate.mockReturnValue(true);
    ApiBookingService.setPaymentState.mockResolvedValue({ status: 200 });
  });

  describe("in the booking list", () => {
    it.each([
      ["open", "Restzahlung offen"],
      ["completed", "Restzahlung erhalten"],
    ])("marks a %s payment as %s beside Storniert", (paymentState, label) => {
      const wrapper = mountComponent(BookingTable, {
        propsData: { bookings: [booking({ paymentState })] },
      });
      const cell = wrapper.find("td.status-cell").text();

      expect(cell).toContain("Storniert");
      expect(cell).toContain(label);
    });

    it("marks nothing without a payment state", () => {
      const wrapper = mountComponent(BookingTable, {
        propsData: { bookings: [booking({ paymentState: undefined })] },
      });

      expect(wrapper.find("td.status-cell").text()).not.toContain(
        "Restzahlung"
      );
    });
  });

  describe("on the booking page", () => {
    it("says what is owed and ticks it off", async () => {
      const wrapper = mountState();

      expect(text(wrapper)).toContain("Restzahlung offen");
      expect(text(wrapper)).toContain("Der Buchende muss noch 10,00");

      const box = wrapper.find(".cancellation-refund-state__mark input");
      expect(box.element.checked).toBe(false);
      expect(text(wrapper)).toContain("Restzahlung erhalten");
      await box.trigger("click");
      await flushPromises();

      expect(ApiBookingService.setPaymentState).toHaveBeenCalledWith(
        "bk-1",
        "completed"
      );
      expect(wrapper.emitted("reload")).toHaveLength(1);
    });

    it("names who ticked it, and unticks it", async () => {
      const wrapper = mountState(
        booking({
          paymentState: "completed",
          paymentCompletedAt: COMPLETED_AT,
          paymentCompletedByUserId: "admin@example.test",
        })
      );

      expect(text(wrapper)).toContain("Restzahlung erhalten");
      expect(text(wrapper)).toContain("Abgehakt am");
      expect(text(wrapper)).toContain("admin@example.test");
      expect(text(wrapper)).not.toContain("muss noch");

      const box = wrapper.find(".cancellation-refund-state__mark input");
      expect(box.element.checked).toBe(true);
      await box.trigger("click");
      await flushPromises();

      expect(ApiBookingService.setPaymentState).toHaveBeenCalledWith(
        "bk-1",
        "open"
      );
    });

    it("offers no mark to whoever may not edit the booking", () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const wrapper = mountState();

      expect(text(wrapper)).toContain("Restzahlung offen");
      expect(wrapper.find(".cancellation-refund-state__mark").exists()).toBe(
        false
      );
    });

    it("tells of a refused mark and reloads", async () => {
      ApiBookingService.setPaymentState.mockRejectedValue(lifecycleError(409));
      const wrapper = mountState();

      await wrapper
        .find(".cancellation-refund-state__mark input")
        .trigger("click");
      await flushPromises();

      expect(wrapper.emitted("reload")).toHaveLength(1);
    });

    it("words the audit of an unpaid cancellation without a refund", () => {
      const wrapper = mountComponent(CancellationRefundAudit, {
        propsData: { audit: booking().cancellationRefund },
      });

      expect(text(wrapper)).toContain("Abrechnung der Stornierung");
      expect(text(wrapper)).toContain("Entfällt");
      expect(text(wrapper)).toContain("Noch ausstehend");
      expect(text(wrapper)).not.toContain("Erstattung");
    });
  });
});
