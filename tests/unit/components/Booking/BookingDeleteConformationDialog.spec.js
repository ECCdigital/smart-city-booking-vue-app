import { describe, expect, it } from "vitest";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

function mountDialog(toDelete, deleteDisabled = false) {
  return mountComponent(BookingDeleteConformationDialog, {
    propsData: { open: true, toDelete, deleteDisabled },
  });
}

function yesButton(wrapper) {
  return wrapper
    .findAll(".v-dialog button")
    .wrappers.find((button) => button.text() === "Löschen");
}

const CONFIRMED_HINT = "Diese Buchung wurde bereits bestätigt";

/**
 * Whether the delete is allowed is the host's call
 * (`BookingPermissionService.allowHardDelete`); the dialog says why it is
 * blocked, and points out a confirmed booking that was neither cancelled
 * nor withdrawn.
 */
describe("BookingDeleteConformationDialog", () => {
  it("lets the booking be deleted", async () => {
    const wrapper = mountDialog({ id: "bk-1", status: "requested" });

    expect(yesButton(wrapper).attributes("disabled")).toBeUndefined();
    await yesButton(wrapper).trigger("click");
    expect(wrapper.emitted("delete-booking")).toEqual([["bk-1"]]);
  });

  it("blocks the delete where the host says so and says why", async () => {
    const wrapper = mountDialog({ id: "bk-1", status: "confirmed" }, true);

    expect(yesButton(wrapper).attributes("disabled")).toBe("disabled");

    yesButton(wrapper).element.parentElement.dispatchEvent(
      new Event("mouseenter")
    );
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(document.body.textContent).toContain(
      "Nur angefragte oder abgelehnte Buchungen können gelöscht werden"
    );
  });

  it("points out a confirmed booking", () => {
    const wrapper = mountDialog({ id: "bk-1", status: "confirmed" });

    expect(wrapper.find(".v-dialog").text()).toContain(CONFIRMED_HINT);
  });

  it.each(["requested", "payment_due", "rejected", "cancelled", "withdrawn"])(
    "says nothing more about a %s booking",
    (status) => {
      const wrapper = mountDialog({ id: "bk-1", status });

      expect(wrapper.find(".v-dialog").text()).not.toContain(CONFIRMED_HINT);
    }
  );
});
