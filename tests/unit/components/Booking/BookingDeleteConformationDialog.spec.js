import { describe, expect, it } from "vitest";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";

function mountDialog(toDelete) {
  return mountComponent(BookingDeleteConformationDialog, {
    propsData: { open: true, toDelete },
  });
}

function yesButton(wrapper) {
  return wrapper
    .findAll(".v-dialog button")
    .wrappers.find((button) => button.text() === "Löschen");
}

const CONFIRMED_HINT = "weder storniert noch widerrufen";
const PAYMENT_DUE_HINT = "Die Zahlung dieser Buchung ist noch offen";

/**
 * Whether the delete is offered is the host's call
 * (`BookingPermissionService.allowDelete`); the dialog warns about a
 * confirmed booking that was neither cancelled nor withdrawn, and about one
 * awaiting payment, which the booker already has as confirmed.
 */
describe("BookingDeleteConformationDialog", () => {
  it.each([
    "requested",
    "payment_due",
    "confirmed",
    "rejected",
    "cancelled",
    "withdrawn",
  ])("lets a %s booking be deleted", async (status) => {
    const wrapper = mountDialog({ id: "bk-1", status });

    expect(yesButton(wrapper).attributes("disabled")).toBeUndefined();
    await yesButton(wrapper).trigger("click");
    expect(wrapper.emitted("delete-booking")).toEqual([["bk-1"]]);
  });

  it("points out a confirmed booking", () => {
    const wrapper = mountDialog({ id: "bk-1", status: "confirmed" });

    expect(wrapper.find(".v-dialog").text()).toContain(CONFIRMED_HINT);
  });

  it("shows the hint before the question", () => {
    const text = mountDialog({ id: "bk-1", status: "confirmed" })
      .find(".v-dialog")
      .text();

    expect(text.indexOf(CONFIRMED_HINT)).toBeLessThan(
      text.indexOf("Sind Sie sicher")
    );
  });

  it("points out a booking awaiting payment as confirmed to the booker", () => {
    const text = mountDialog({ id: "bk-1", status: "payment_due" })
      .find(".v-dialog")
      .text();

    expect(text).toContain(PAYMENT_DUE_HINT);
    expect(text).not.toContain(CONFIRMED_HINT);
  });

  it.each(["requested", "rejected", "cancelled", "withdrawn"])(
    "says nothing more about a %s booking",
    (status) => {
      const text = mountDialog({ id: "bk-1", status }).find(".v-dialog").text();

      expect(text).not.toContain(CONFIRMED_HINT);
      expect(text).not.toContain(PAYMENT_DUE_HINT);
    }
  );
});
