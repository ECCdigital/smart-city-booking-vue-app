import { describe, expect, it } from "vitest";
import BookingOwnerChangeDialog from "@/components/Booking/BookingOwnerChangeDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { activeDialogText, dialogButton } from "@tests/unit/support/dialog";

function mountDialog(props = {}) {
  return mountComponent(BookingOwnerChangeDialog, {
    propsData: {
      open: true,
      previousOwner: "max@exmaple.test",
      newOwner: "max@example.test",
      ...props,
    },
  });
}

/**
 * Saving a corrected first mail of a booking made by an admin hands the
 * booking to another account: the dialog names both and asks first.
 */
describe("BookingOwnerChangeDialog", () => {
  it("names the account that loses the booking and the one that gets it", () => {
    mountDialog();

    expect(activeDialogText()).toContain("max@exmaple.test");
    expect(activeDialogText()).toContain("max@example.test");
  });

  it("asks the question last, in plain text rather than as a warning", () => {
    mountDialog();

    const paragraphs = Array.from(
      document.querySelectorAll(".v-dialog--active p")
    ).map((p) => p.textContent.trim());
    expect(paragraphs[paragraphs.length - 1]).toBe(
      "Sind Sie sicher, dass Sie die Änderung vornehmen möchten?"
    );
    expect(document.querySelector(".v-dialog--active .v-alert")).toBeNull();
  });

  it("confirms", async () => {
    const wrapper = mountDialog();

    dialogButton("Änderung speichern").click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toBeUndefined();
  });

  it("cancels", async () => {
    const wrapper = mountDialog();

    dialogButton("Abbrechen").click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });
});
