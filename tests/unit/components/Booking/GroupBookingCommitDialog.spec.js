import { describe, expect, it } from "vitest";
import GroupBookingCommitDialog from "@/components/Booking/GroupBookingCommitDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { activeDialogText, dialogButton } from "@tests/unit/support/dialog";
import i18n from "@/language/index";

function member(id, status) {
  return { id, status, priceEur: 25 };
}

function mountDialog(groupBookings, props = {}) {
  return mountComponent(GroupBookingCommitDialog, {
    propsData: { open: true, bookingId: "bk-1", groupBookings, ...props },
  });
}

/**
 * The series confirm dialog shows the state of the series (spec E9): one
 * derived chip - the shared state or "Gemischt" - and each member's own. The
 * series-wide option is offered only while every member is Angefragt; a mixed
 * series says so and leaves only "Nur diese Buchung".
 */
describe("GroupBookingCommitDialog", () => {
  describe("with every member requested", () => {
    const members = [member("bk-1", "requested"), member("bk-2", "requested")];

    it("shows the shared state of the series and each member's own", () => {
      mountDialog(members);

      expect(activeDialogText()).toContain("Zustand der Serie");
      expect(
        document.querySelectorAll(".v-dialog--active .v-chip")
      ).toHaveLength(3);
      expect(activeDialogText()).toContain("bk-2");
      expect(activeDialogText()).not.toContain("Gemischt");
    });

    it("offers to confirm the whole series", async () => {
      const wrapper = mountDialog(members);

      dialogButton("Serie freigeben").click();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("commit-group-booking")).toHaveLength(1);
    });
  });

  describe("with members in mixed states", () => {
    const members = [member("bk-1", "requested"), member("bk-2", "confirmed")];

    it("says the series is mixed and shows the members' own states", () => {
      mountDialog(members);

      expect(activeDialogText()).toContain("Gemischt");
      expect(activeDialogText()).toContain(
        i18n.t("group-booking.transition.mixed.message")
      );
      expect(activeDialogText()).toContain("Angefragt");
      expect(activeDialogText()).toContain("Bestätigt");
    });

    it("offers only this one booking", async () => {
      const wrapper = mountDialog(members);

      expect(dialogButton("Serie freigeben")).toBeUndefined();
      dialogButton("Nur diese Buchung freigeben").click();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("commit-single-booking")).toHaveLength(1);
      expect(wrapper.emitted("commit-group-booking")).toBeUndefined();
    });
  });

  it("offers the series as before when it was not handed the members", () => {
    mountDialog([]);

    expect(activeDialogText()).not.toContain("Zustand der Serie");
    expect(dialogButton("Serie freigeben")).toBeDefined();
  });

  it("keeps the inline error where the route refused", () => {
    mountDialog([member("bk-1", "requested")], {
      error: "Betroffene Buchungen: bk-2",
    });

    expect(activeDialogText()).toContain("Betroffene Buchungen: bk-2");
  });
});
