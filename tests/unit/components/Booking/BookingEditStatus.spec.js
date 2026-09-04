import { describe, expect, it } from "vitest";
import BookingEditStatus from "@/components/Booking/BookingEditStatus.vue";
import { mountComponent } from "@tests/unit/support/mount";

const COMMITTED = "Freigegeben";
const PAID = "Bezahlt";
const REJECTED = "Storniert";

function mountStatus(booking, propsData = {}) {
  return mountComponent(BookingEditStatus, {
    propsData: { booking, ...propsData },
  });
}

function statusSwitches(wrapper) {
  return wrapper.findAllComponents({ name: "v-switch" }).wrappers;
}

function statusSwitch(wrapper, label) {
  return statusSwitches(wrapper)
    .find((control) => control.props("label") === label)
    .find("input[role='switch']");
}

function dialogButton(wrapper, label) {
  return wrapper
    .findAll(".v-dialog button")
    .wrappers.find((button) => button.text() === label);
}

/**
 * Characterisation of how the three switches reach the backend today. The
 * component holds no state of its own for them - it writes into the `booking`
 * object it was handed - but only two of the three end up in the admin PUT:
 *
 * - `isCommitted` and `isPayed` are written into `booking` directly, and
 *   `BookingEdit.submitChanges` PUTs that very object (after deleting `_id`).
 *   What the component leaves in `booking` is what the PUT carries.
 * - `isRejected` on a saved booking is never written here. The component only
 *   emits: `request-reject` opens the parent's cancellation dialog, which
 *   POSTs the separate reject endpoint (`ApiBookingService.rejectBooking`),
 *   and `confirm-unreject` makes the parent re-fetch the booking and PUT a
 *   rebuilt payload. Only on an unsaved booking does the component write
 *   `isRejected` and `rejectionReason` into the object the create request
 *   sends.
 *
 * Pinned before the booking strand moves the UI onto `booking.status` and
 * named transitions. Nothing here is an endorsement of the current behaviour.
 */
describe("BookingEditStatus", () => {
  it("renders the three status switches in German", () => {
    const wrapper = mountStatus({ id: "b1" });
    expect(
      statusSwitches(wrapper).map((control) => control.props("label"))
    ).toEqual([COMMITTED, PAID, REJECTED]);
  });

  describe("the commitment switch", () => {
    it("writes `isCommitted` straight into the booking", async () => {
      const booking = { id: "b1", isCommitted: false, isPayed: false };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, COMMITTED).trigger("click");
      expect(booking.isCommitted).toBe(true);

      await statusSwitch(wrapper, COMMITTED).trigger("click");
      expect(booking.isCommitted).toBe(false);
    });

    it("emits nothing - the parent only sees the mutated object", async () => {
      const booking = { id: "b1", isCommitted: false, isPayed: false };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, COMMITTED).trigger("click");
      expect(wrapper.emitted("request-reject")).toBeUndefined();
      expect(wrapper.emitted("confirm-unreject")).toBeUndefined();
    });
  });

  describe("the payment switch", () => {
    it("writes `isPayed` straight into the booking", async () => {
      const booking = { id: "b1", isCommitted: false, isPayed: false };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, PAID).trigger("click");
      expect(booking.isPayed).toBe(true);

      await statusSwitch(wrapper, PAID).trigger("click");
      expect(booking.isPayed).toBe(false);
    });

    it("does not care whether the booking is committed or free", async () => {
      const booking = { id: "b1", isCommitted: false, priceEur: 0 };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, PAID).trigger("click");
      expect(booking.isPayed).toBe(true);
    });
  });

  describe("the cancellation switch on a saved booking", () => {
    it("asks the parent instead of writing `isRejected` itself", async () => {
      const booking = { id: "b1", isCommitted: true, isPayed: true };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, REJECTED).trigger("click");

      expect(wrapper.emitted("request-reject")).toHaveLength(1);
      expect(booking.isRejected).toBeUndefined();
      expect(booking.rejectionReason).toBeUndefined();
    });

    it("confirms an undo through the parent, again without writing", async () => {
      const booking = {
        id: "b1",
        isCommitted: true,
        isRejected: true,
        rejectionReason: "No longer needed",
      };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, REJECTED).trigger("click");
      await dialogButton(wrapper, "Stornierung aufheben").trigger("click");

      expect(wrapper.emitted("confirm-unreject")).toHaveLength(1);
      expect(booking.isRejected).toBe(true);
      expect(booking.rejectionReason).toBe("No longer needed");
    });

    it("emits nothing when the undo is cancelled", async () => {
      const booking = { id: "b1", isCommitted: true, isRejected: true };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, REJECTED).trigger("click");
      await dialogButton(wrapper, "Abbrechen").trigger("click");

      expect(wrapper.emitted("confirm-unreject")).toBeUndefined();
      expect(booking.isRejected).toBe(true);
    });

    it("names the undo after the commitment flag", async () => {
      const wrapper = mountStatus({
        id: "b1",
        isCommitted: false,
        isRejected: true,
      });

      await statusSwitch(wrapper, REJECTED).trigger("click");

      expect(dialogButton(wrapper, "Ablehnung aufheben")).toBeDefined();
      expect(dialogButton(wrapper, "Stornierung aufheben")).toBeUndefined();
    });
  });

  describe("the cancellation switch on an unsaved booking", () => {
    it("writes `isRejected` and the reason once the dialog is confirmed", async () => {
      const booking = { isCommitted: false, isPayed: false };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, REJECTED).trigger("click");
      expect(booking.isRejected).toBeUndefined();

      await wrapper.find(".v-dialog textarea").setValue("  Double booking  ");
      await dialogButton(wrapper, "Bestätigen").trigger("click");

      expect(booking.isRejected).toBe(true);
      expect(booking.rejectionReason).toBe("Double booking");
      expect(wrapper.emitted("request-reject")).toBeUndefined();
    });

    it("keeps the confirm button disabled without a reason", async () => {
      const wrapper = mountStatus({ isCommitted: false });

      await statusSwitch(wrapper, REJECTED).trigger("click");
      expect(dialogButton(wrapper, "Bestätigen").element.disabled).toBe(true);

      await wrapper.find(".v-dialog textarea").setValue("   ");
      expect(dialogButton(wrapper, "Bestätigen").element.disabled).toBe(true);
    });

    it("resets `isRejected` to false when the dialog is cancelled", async () => {
      const booking = { isCommitted: false };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, REJECTED).trigger("click");
      await dialogButton(wrapper, "Abbrechen").trigger("click");

      expect(booking.isRejected).toBe(false);
      expect(booking.rejectionReason).toBeUndefined();
    });

    it("clears both fields when the switch is turned off again", async () => {
      const booking = {
        isCommitted: false,
        isRejected: true,
        rejectionReason: "Double booking",
      };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, REJECTED).trigger("click");

      expect(booking.isRejected).toBe(false);
      expect(booking.rejectionReason).toBeNull();
    });
  });

  describe("what the component leaves for the save request", () => {
    it("carries the two flags it owns and adds no `status` field", async () => {
      const booking = {
        id: "b1",
        isCommitted: false,
        isPayed: false,
        isRejected: false,
      };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, COMMITTED).trigger("click");
      await statusSwitch(wrapper, PAID).trigger("click");

      expect(booking).toEqual({
        id: "b1",
        isCommitted: true,
        isPayed: true,
        isRejected: false,
      });
      expect(booking.status).toBeUndefined();
    });

    it("leaves the booking untouched when the cancellation switch is used", async () => {
      const booking = {
        id: "b1",
        isCommitted: true,
        isPayed: true,
        isRejected: false,
      };
      const before = { ...booking };
      const wrapper = mountStatus(booking);

      await statusSwitch(wrapper, REJECTED).trigger("click");

      expect(booking).toEqual(before);
      expect(wrapper.emitted("request-reject")).toHaveLength(1);
    });
  });

  describe("the rejection reason field", () => {
    it("is only shown for a rejected booking and edits the booking in place", async () => {
      const booking = { id: "b1", isCommitted: true, isRejected: false };
      const wrapper = mountStatus(booking);
      expect(wrapper.find(".status-reason textarea").exists()).toBe(false);

      const rejected = { id: "b2", isCommitted: true, isRejected: true };
      const rejectedWrapper = mountStatus(rejected);
      await rejectedWrapper
        .find(".status-reason textarea")
        .setValue("Cancelled too late");

      expect(rejected.rejectionReason).toBe("Cancelled too late");
    });

    it("is labelled by the commitment flag", () => {
      expect(
        mountStatus({ id: "b1", isCommitted: true, isRejected: true })
          .find(".status-reason label")
          .text()
      ).toBe("Stornierungsgrund");
      expect(
        mountStatus({ id: "b2", isCommitted: false, isRejected: true })
          .find(".status-reason label")
          .text()
      ).toBe("Ablehnungsgrund");
    });
  });
});
