import { describe, expect, it, vi } from "vitest";
import BookingTable from "@/components/Booking/BookingTable.vue";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowUpdate: vi.fn(() => true), allowDelete: vi.fn(() => true) },
}));

function booking(overrides = {}) {
  return {
    id: "bk-1",
    name: "Erika Muster",
    timeCreated: 1_700_000_000_000,
    bookableItems: [{ _bookableUsed: { title: "Raum 1" } }],
    priceEur: 25,
    status: "requested",
    ...overrides,
  };
}

function mountTable(bookings) {
  return mountComponent(BookingTable, { propsData: { bookings } });
}

function statusCell(wrapper) {
  return wrapper.find("td.status-cell");
}

/** Opens the first row's menu and reads its entries as { title: disabled }. */
async function openRowMenu(wrapper) {
  await wrapper.find("td.controls-cell button").trigger("click");
  await wrapper.vm.$nextTick();
  const entries = {};
  document.querySelectorAll(".v-menu__content .v-list-item").forEach((el) => {
    const title = el.querySelector(".v-list-item__title")?.textContent.trim();
    entries[title] = el.classList.contains("v-list-item--disabled");
  });
  return entries;
}

/**
 * The list reads `booking.status` - one chip with the glossary's word, the
 * "Kostenfrei" marker beside it, and the row menu offering exactly the
 * transitions of that state (spec E4, E12).
 */
describe("BookingTable", () => {
  describe("the status column", () => {
    it.each([
      ["requested", "Angefragt"],
      ["payment_due", "Zahlung offen"],
      ["confirmed", "Bestätigt"],
      ["rejected", "Abgelehnt"],
      ["cancelled", "Storniert"],
    ])("shows a %s booking as %s", (status, label) => {
      const wrapper = mountTable([booking({ status })]);

      expect(statusCell(wrapper).text()).toContain(label);
    });

    it("marks a free booking as Kostenfrei beside its state", () => {
      const wrapper = mountTable([booking({ priceEur: 0 })]);

      expect(statusCell(wrapper).text()).toContain("Angefragt");
      expect(statusCell(wrapper).text()).toContain("Kostenfrei");
    });

    it("does not show a payment chip for a priced booking", () => {
      const wrapper = mountTable([booking({ status: "confirmed" })]);

      expect(statusCell(wrapper).text()).not.toContain("Kostenfrei");
      expect(wrapper.text()).not.toContain("Bezahlt");
      expect(wrapper.text()).not.toContain("Offen");
    });

    it("sorts by the state's rank, not alphabetically", async () => {
      const wrapper = mountTable([
        booking({ id: "b-rejected", status: "rejected" }),
        booking({ id: "b-confirmed", status: "confirmed" }),
        booking({ id: "b-cancelled", status: "cancelled" }),
        booking({ id: "b-requested", status: "requested" }),
        booking({ id: "b-due", status: "payment_due" }),
      ]);

      const header = wrapper
        .findAll("th")
        .wrappers.find((th) => th.text().trim() === "Status");
      await header.trigger("click");
      await wrapper.vm.$nextTick();

      const ids = wrapper
        .findAll("tbody tr")
        .wrappers.map((row) => row.find("td").text().trim());
      expect(ids).toEqual([
        "b-requested",
        "b-due",
        "b-confirmed",
        "b-cancelled",
        "b-rejected",
      ]);
    });
  });

  describe("the row menu", () => {
    it("offers confirm, reject and delete on a requested booking", async () => {
      const wrapper = mountTable([booking({ status: "requested" })]);

      const menu = await openRowMenu(wrapper);
      expect(menu["Freigeben"]).toBe(false);
      expect(menu["Als bezahlt markieren"]).toBe(true);
      expect(menu["Ablehnen"]).toBe(false);
      expect(menu["Löschen"]).toBe(false);
    });

    it("offers pay and cancel on a booking whose payment is due", async () => {
      const wrapper = mountTable([booking({ status: "payment_due" })]);

      const menu = await openRowMenu(wrapper);
      expect(menu["Freigeben"]).toBe(true);
      expect(menu["Als bezahlt markieren"]).toBe(false);
      expect(menu["Stornieren"]).toBe(false);
      expect(menu["Löschen"]).toBe(true);
    });

    it("offers only cancel on a confirmed booking", async () => {
      const wrapper = mountTable([booking({ status: "confirmed" })]);

      const menu = await openRowMenu(wrapper);
      expect(menu["Freigeben"]).toBe(true);
      expect(menu["Als bezahlt markieren"]).toBe(true);
      expect(menu["Stornieren"]).toBe(false);
      expect(menu["Löschen"]).toBe(true);
    });

    it("lets a rejected booking be deleted, nothing else", async () => {
      const menu = await openRowMenu(
        mountTable([booking({ status: "rejected" })])
      );

      expect(menu["Löschen"]).toBe(false);
      expect(menu["Freigeben"]).toBe(true);
      expect(menu["Stornieren"]).toBe(true);
    });

    it("offers no transition on a cancelled booking", async () => {
      const menu = await openRowMenu(
        mountTable([booking({ status: "cancelled" })])
      );

      expect(menu["Löschen"]).toBe(true);
      expect(menu["Freigeben"]).toBe(true);
      expect(menu["Als bezahlt markieren"]).toBe(true);
      expect(menu["Stornieren"]).toBe(true);
    });
  });
});
