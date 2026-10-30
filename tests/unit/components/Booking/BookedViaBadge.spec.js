import { describe, expect, it } from "vitest";
import BookedViaBadge from "@/components/Booking/BookedViaBadge.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

function mountBadge(bookedVia) {
  return mountComponent(BookedViaBadge, { propsData: { bookedVia } });
}

/** The badge of the Buchungsweg, at the name in the list and on the Buchungsseite. */
describe("BookedViaBadge", () => {
  it.each([
    [
      "user",
      "Benutzer",
      "Diese Buchung wurde erstellt von einem angemeldeten User.",
    ],
    ["guest", "Gast", "Diese Buchung wurde erstellt von einem Gast."],
    ["admin", "Admin", "Diese Buchung wurde erstellt von einem Admin."],
    [
      undefined,
      "Unbekannt",
      "Es ist nicht bekannt, über welchen Weg diese Buchung erstellt wurde.",
    ],
  ])(
    "reads %s as %s and explains it in a tooltip",
    async (bookedVia, label, hint) => {
      const wrapper = mountBadge(bookedVia);
      const badge = wrapper.find(".booked-via-badge");

      expect(badge.text()).toBe(label);

      badge.element.dispatchEvent(new Event("mouseenter"));
      await flushPromises();
      await wrapper.vm.$nextTick();
      expect(document.body.textContent).toContain(hint);
    }
  );
});
