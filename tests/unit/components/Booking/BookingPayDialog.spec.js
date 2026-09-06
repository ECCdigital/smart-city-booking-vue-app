import { describe, expect, it } from "vitest";
import BookingPayDialog from "@/components/Booking/BookingPayDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";
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

function dialogText() {
  return document.querySelector(".v-dialog--active").textContent;
}

function dialogButton(label) {
  return Array.from(document.querySelectorAll(".v-dialog--active button")).find(
    (el) => el.textContent.trim() === label
  );
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

      expect(dialogText()).toContain("Zustand der Serie");
      expect(dialogText()).toContain("Zahlung offen");
      expect(dialogText()).toContain("gesamte Serie als bezahlt markieren");
      expect(dialogText()).not.toContain("Gemischt");
    });

    it("offers to mark the whole series as paid", async () => {
      const wrapper = mountGroupDialog(members);
      wrapper.vm.selectedPaymentMethod = "CASH";
      await wrapper.vm.$nextTick();

      dialogButton("Serie als bezahlt markieren").click();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("pay-group-booking")).toEqual([
        [{ paymentMethod: "CASH", timePaid: null }],
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

      expect(dialogText()).toContain("Gemischt");
      expect(dialogText()).toContain(
        i18n.t("group-booking.transition.mixed.message")
      );
      expect(dialogText()).toContain("Bestätigt");
    });

    it("offers only this one booking", async () => {
      const wrapper = mountGroupDialog(members);
      wrapper.vm.selectedPaymentMethod = "CASH";
      await wrapper.vm.$nextTick();

      expect(dialogButton("Serie als bezahlt markieren")).toBeUndefined();
      dialogButton("Nur diese Buchung als bezahlt markieren").click();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("pay-single-booking")).toEqual([
        [{ id: "bk-1", paymentMethod: "CASH", timePaid: null }],
      ]);
      expect(wrapper.emitted("pay-group-booking")).toBeUndefined();
    });
  });

  it("shows no series state for a booking outside a series", () => {
    mountComponent(BookingPayDialog, {
      propsData: { open: true, bookingId: "bk-1" },
    });

    expect(dialogText()).not.toContain("Zustand der Serie");
  });
});
