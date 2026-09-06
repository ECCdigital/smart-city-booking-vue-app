import { describe, expect, it } from "vitest";
import BookingPayDialog from "@/components/Booking/BookingPayDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { activeDialogText, dialogButton } from "@tests/unit/support/dialog";
import i18n from "@/language/index";

function member(id, status) {
  return { id, status, priceEur: 25 };
}

function mountGroupDialog(groupBookings, props = {}) {
  return mountComponent(BookingPayDialog, {
    propsData: {
      open: true,
      bookingId: "bk-1",
      hasGroupBooking: true,
      groupBookings,
      ...props,
    },
  });
}

/**
 * The pay dialog's series mode shows the state of the series (spec E9) and
 * offers "Serie als bezahlt markieren" only while every member awaits
 * payment; a mixed series says so and leaves only "Nur diese Buchung".
 */
describe("BookingPayDialog for a member of a series", () => {
  describe("with every member awaiting payment", () => {
    const members = [
      member("bk-1", "payment_due"),
      member("bk-2", "payment_due"),
    ];

    it("shows the shared state of the series and asks about the whole series", () => {
      mountGroupDialog(members);

      expect(activeDialogText()).toContain("Zustand der Serie");
      expect(activeDialogText()).toContain("Zahlung offen");
      expect(activeDialogText()).toContain(
        "gesamte Serie als bezahlt markieren"
      );
      expect(activeDialogText()).not.toContain("Gemischt");
    });

    it("offers to mark the whole series as paid", async () => {
      const wrapper = mountGroupDialog(members);

      dialogButton("Serie als bezahlt markieren").click();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("pay-group-booking")).toEqual([
        [{ paymentMethod: null, timePaid: null }],
      ]);
    });
  });

  describe("with members in mixed states", () => {
    const members = [
      member("bk-1", "payment_due"),
      member("bk-2", "confirmed"),
    ];

    it("says the series is mixed and shows the members' own states", () => {
      mountGroupDialog(members);

      expect(activeDialogText()).toContain("Gemischt");
      expect(activeDialogText()).toContain(
        i18n.t("group-booking.transition.mixed.message")
      );
      expect(activeDialogText()).toContain("Bestätigt");
    });

    it("offers only this one booking", async () => {
      const wrapper = mountGroupDialog(members);

      expect(dialogButton("Serie als bezahlt markieren")).toBeUndefined();
      dialogButton("Nur diese Buchung als bezahlt markieren").click();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("pay-single-booking")).toEqual([
        [{ id: "bk-1", paymentMethod: null, timePaid: null }],
      ]);
      expect(wrapper.emitted("pay-group-booking")).toBeUndefined();
    });
  });

  it("offers the series as before when it was not handed the members", () => {
    mountGroupDialog([]);

    expect(activeDialogText()).not.toContain("Zustand der Serie");
    expect(dialogButton("Serie als bezahlt markieren")).toBeDefined();
  });

  it("shows no series state for a booking outside a series", () => {
    mountComponent(BookingPayDialog, {
      propsData: { open: true, bookingId: "bk-1" },
    });

    expect(activeDialogText()).not.toContain("Zustand der Serie");
  });
});
