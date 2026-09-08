import { describe, expect, it } from "vitest";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

function mountDialog(toDelete) {
  return mountComponent(BookingDeleteConformationDialog, {
    propsData: { open: true, toDelete },
  });
}

function yesButton(wrapper) {
  return wrapper
    .findAll(".v-dialog button")
    .wrappers.find((button) => button.text() === "Ja");
}

/**
 * A hard delete is offered only where nothing has been confirmed yet:
 * `requested` and `rejected` (spec E12). A free requested booking used to be
 * undeletable because the backend derives `isPayed` for it - reading the
 * state heals that.
 */
describe("BookingDeleteConformationDialog", () => {
  it.each(["requested", "rejected"])(
    "lets a %s booking be deleted",
    async (status) => {
      const wrapper = mountDialog({ id: "bk-1", status, priceEur: 0 });

      expect(yesButton(wrapper).attributes("disabled")).toBeUndefined();
      await yesButton(wrapper).trigger("click");
      expect(wrapper.emitted("delete-booking")).toEqual([["bk-1"]]);
    }
  );

  it.each(["payment_due", "confirmed", "cancelled"])(
    "blocks the delete of a %s booking and says why",
    async (status) => {
      const wrapper = mountDialog({ id: "bk-1", status });

      expect(yesButton(wrapper).attributes("disabled")).toBe("disabled");

      yesButton(wrapper).element.parentElement.dispatchEvent(
        new Event("mouseenter")
      );
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain(
        "Nur angefragte oder abgelehnte Buchungen können gelöscht werden"
      );
    }
  );
});
