import { describe, expect, it } from "vitest";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditConfirmation from "@/components/Bookable/Edit/BookableEditConfirmation.vue";

// The Bestätigung (`autoCommitBooking`), one component for the editing
// page's card and the guided flow's step (ECCdigital/tickets#361). It knows
// no mode, so this spec covers both.

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const mountConfirmation = (overrides) =>
  mountEditing(BookableEditConfirmation, { bookable: bookable(overrides) });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const checked = (wrapper, value) =>
  find(wrapper, `confirmation-${value}`).attributes("aria-checked") === "true";

describe("BookableEditConfirmation - Bestätigung", () => {
  it("asks how incoming bookings are confirmed, with two tiles", () => {
    const { wrapper } = mountConfirmation();

    expect(find(wrapper, "confirmation-question").text()).toBe(
      "Wie werden eingehende Buchungen bestätigt?"
    );
    expect(find(wrapper, "confirmation-auto").text()).toContain("Automatisch");
    expect(find(wrapper, "confirmation-manual").text()).toContain(
      "Manuell bestätigen"
    );
  });

  it("says what the backend does on „Automatisch“, without „freigegeben“", () => {
    const { wrapper } = mountConfirmation();
    const hint = find(wrapper, "confirmation-auto").text();

    expect(hint).toContain(
      "Passt alles, ist eine Buchung ohne Ihr Zutun angenommen."
    );
    expect(hint).toContain(
      "Kostet sie etwas, wartet sie nur noch auf die Zahlung."
    );
    expect(wrapper.text()).not.toMatch(/freigeg|Freigabe|prüfen/);
  });

  it("says on „Manuell bestätigen“ that each booking waits for the administration", () => {
    const { wrapper } = mountConfirmation();

    expect(find(wrapper, "confirmation-manual").text()).toContain(
      "Jede Buchung kommt als angefragt in Ihre Buchungsliste. Sie bestätigen sie oder lehnen sie ab."
    );
  });

  it.each([
    [true, "auto"],
    [false, "manual"],
  ])("shows autoCommitBooking %s as „%s“", (autoCommitBooking, value) => {
    const { wrapper } = mountConfirmation({ autoCommitBooking });

    expect(checked(wrapper, value)).toBe(true);
    expect(checked(wrapper, value === "auto" ? "manual" : "auto")).toBe(false);
  });

  it("reads a missing autoCommitBooking as „Manuell bestätigen“, as the backend does", () => {
    const { wrapper } = mountConfirmation({ autoCommitBooking: undefined });

    expect(checked(wrapper, "manual")).toBe(true);
  });

  it.each([
    [false, "auto", { autoCommitBooking: true }],
    [true, "manual", { autoCommitBooking: false }],
  ])(
    "hands on only autoCommitBooking (from %s, tile %s)",
    async (autoCommitBooking, value, patch) => {
      const {
        wrapper,
        patches,
        bookable: handedIn,
        stored,
      } = mountConfirmation({ autoCommitBooking });

      await find(wrapper, `confirmation-${value}`).trigger("click");

      expect(patches).toEqual([patch]);
      expect(checked(wrapper, value)).toBe(true);
      expect(handedIn).toEqual(stored);
    }
  );

  it("changes nothing when it mounts", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountConfirmation({ autoCommitBooking: undefined });
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });
});
