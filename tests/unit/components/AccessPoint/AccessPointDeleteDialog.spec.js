import { describe, expect, it } from "vitest";
import AccessPointDeleteDialog from "@/components/AccessPoint/AccessPointDeleteDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";

const LOCKER = {
  id: "ap-1",
  type: "locker",
  provider: "ifbs",
  label: "Fahrradboxen Bahnhof",
};

/**
 * `v-dialog` detaches its content into the `data-app` container, so the
 * wrapper's own element stays empty - the card is read through the component
 * tree.
 */
function dialogText(wrapper) {
  return wrapper.findComponent({ name: "v-card" }).text();
}

function mountDialog(propsData = {}) {
  return mountComponent(AccessPointDeleteDialog, {
    propsData: {
      open: true,
      accessPoint: LOCKER,
      affectedBookables: [],
      runningBookings: [],
      ...propsData,
    },
  });
}

/**
 * Deleting stays deleting - in the backend a door and a locker system are one
 * row in `accesspoints`. What the dialog owes the admin on top of the affected
 * bookables are the bookings that hold a granted, unrevoked access right now:
 * the delete detaches the access point from the bookables and drops the row
 * (`access-point-controller.js` `removeAccessPoint`), but it revokes nothing
 * at the provider. Without naming them, one click tears live access apart
 * unseen.
 */
describe("AccessPointDeleteDialog", () => {
  it("names the running bookings that hold access at this access point", () => {
    const wrapper = mountDialog({
      runningBookings: [
        { id: "booking-7", name: "Erika Mustermann" },
        { id: "booking-8", mail: "max@example.org" },
      ],
    });

    const text = dialogText(wrapper);
    expect(text).toContain("Laufende Buchungen");
    expect(text).toContain("booking-7");
    expect(text).toContain("Erika Mustermann");
    expect(text).toContain("booking-8");
    expect(text).toContain("max@example.org");
  });

  it("names the first ten and counts the rest", () => {
    const wrapper = mountDialog({
      runningBookings: Array.from({ length: 12 }, (_, index) => ({
        id: `booking-${index}`,
      })),
    });

    expect(wrapper.findAll("li")).toHaveLength(10);
    expect(dialogText(wrapper)).toContain("und 2 weitere");
  });

  it("says the access is not revoked by the deletion", () => {
    const wrapper = mountDialog({
      runningBookings: [{ id: "booking-7" }],
    });

    expect(dialogText(wrapper)).toContain("nicht widerrufen");
  });

  it("states that no booking holds access when the bookings were readable", () => {
    const wrapper = mountDialog();

    expect(dialogText(wrapper)).toContain("Keine laufende Buchung");
  });

  /**
   * "No booking holds access" is a claim about data. A caller who may not read
   * the bookings has not been told that - the dialog says so instead of
   * promising the deletion is harmless.
   */
  it("does not claim there is none when the bookings could not be read", () => {
    const wrapper = mountDialog({ bookingsUnreadable: true });

    expect(dialogText(wrapper)).not.toContain("Keine laufende Buchung");
    expect(dialogText(wrapper)).toContain("nicht abrufbar");
  });

  /**
   * Confirming before the check has answered is the unnoticed click the
   * warning exists to prevent, so the button waits for it.
   */
  it("waits with the verdict while the bookings are still loading", () => {
    const wrapper = mountDialog({ loadingBookings: true });

    expect(dialogText(wrapper)).not.toContain("Keine laufende Buchung");
    expect(dialogText(wrapper)).toContain("werden geprüft");
    expect(wrapper.find(".confirm-delete").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("confirms once the check has answered", async () => {
    const wrapper = mountDialog();

    await wrapper.find(".confirm-delete").trigger("click");

    expect(wrapper.emitted("confirm")).toHaveLength(1);
  });
});
