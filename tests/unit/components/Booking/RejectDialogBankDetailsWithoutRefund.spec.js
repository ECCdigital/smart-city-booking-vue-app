import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { activeDialogText } from "@tests/unit/support/dialog";
import i18n from "@/language/index";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: { getCancellationRefundPreview: vi.fn() },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: { getCancellationRefundPreview: vi.fn() },
}));

import BookingRejectConformationDialog from "@/components/Booking/BookingRejectConformationDialog.vue";
import GroupBookingRejectConformationDialog from "@/components/Booking/GroupBookingRejectConformationDialog.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import { refundsNothing } from "@/utils/cancellationRefund";

const BANK_DETAILS_SINGLE = "Bankverbindung des Kunden";
const BANK_DETAILS_GROUP = i18n.t(
  "booking.cancellationRefund.bankDetailsTitle"
);

function preview(refundAmountEur) {
  return {
    originalAmountEur: 40,
    refundAmountEur,
    cancellationFeeEur: 40 - refundAmountEur,
    suggestedRefundPercentage: (refundAmountEur / 40) * 100,
    hoursBeforeStart: 2,
  };
}

const confirmed = { id: "bk-1", status: "confirmed", priceEur: 40 };

/** Mounted closed and opened, so the dialog loads its preview. */
async function open(component, propsData) {
  const wrapper = mountComponent(component, {
    propsData: { open: false, ...propsData },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * A paid booking whose cancellation keeps everything gets nothing back: the
 * administration's dialogs no longer ask for the customer's account (data
 * economy). The customer's own request keeps asking, the administration
 * deciding later.
 */
describe("bank details of a cancellation that refunds nothing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("single booking", () => {
    it("asks for them where something comes back", async () => {
      ApiBookingService.getCancellationRefundPreview.mockResolvedValue(
        preview(30)
      );
      await open(BookingRejectConformationDialog, { toReject: confirmed });

      expect(activeDialogText()).toContain(BANK_DETAILS_SINGLE);
    });

    it("leaves them out where everything is kept", async () => {
      ApiBookingService.getCancellationRefundPreview.mockResolvedValue(
        preview(0)
      );
      await open(BookingRejectConformationDialog, { toReject: confirmed });

      expect(activeDialogText()).not.toContain(BANK_DETAILS_SINGLE);
    });
  });

  describe("series", () => {
    const members = [confirmed, { ...confirmed, id: "bk-2" }];

    it("leaves them out where no member gets anything back", async () => {
      ApiGroupBookingService.getCancellationRefundPreview.mockResolvedValue({
        originalAmountEur: 80,
        bookings: [
          { ...preview(0), bookingId: "bk-1" },
          { ...preview(0), bookingId: "bk-2" },
        ],
      });
      await open(GroupBookingRejectConformationDialog, {
        toReject: members[0],
        groupBookingId: "grp-1",
        groupBookings: members,
      });

      expect(activeDialogText()).not.toContain(BANK_DETAILS_GROUP);
    });

    it("asks for them where one member gets something back", async () => {
      ApiGroupBookingService.getCancellationRefundPreview.mockResolvedValue({
        originalAmountEur: 80,
        bookings: [
          { ...preview(0), bookingId: "bk-1" },
          { ...preview(30), bookingId: "bk-2" },
        ],
      });
      await open(GroupBookingRejectConformationDialog, {
        toReject: members[0],
        groupBookingId: "grp-1",
        groupBookings: members,
      });

      expect(activeDialogText()).toContain(BANK_DETAILS_GROUP);
    });
  });
});

describe("refundsNothing", () => {
  it("follows an override of the administration", () => {
    expect(refundsNothing(preview(30), 0)).toBe(true);
    expect(refundsNothing(preview(0), 50)).toBe(false);
  });

  it("does not know it while the preview is missing or has no amounts", () => {
    expect(refundsNothing(null)).toBe(false);
    expect(refundsNothing({ originalAmountEur: 40 })).toBe(false);
    expect(refundsNothing({ bookings: [] })).toBe(false);
  });
});
