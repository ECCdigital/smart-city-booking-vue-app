import { describe, expect, it } from "vitest";
import BookingOwnerChangeDialog from "@/components/Booking/BookingOwnerChangeDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { activeDialogText } from "@tests/unit/support/dialog";

/**
 * Correcting the first mail to one's own address with `deleteOwn` alone
 * does not hand the booking over (the backend's `ownerAfterEdit`): the
 * dialog says that it stays with the previous account, and why it cannot
 * be deleted then.
 */
describe("BookingOwnerChangeDialog where the owner stays", () => {
  function mountKept() {
    return mountComponent(BookingOwnerChangeDialog, {
      propsData: {
        open: true,
        previousOwner: "erika@example.test",
        newOwner: "erika@example.test",
        kept: true,
      },
    });
  }

  it("says that the mail is saved, the booking stays with the previous account and cannot be deleted", () => {
    mountKept();

    const text = activeDialogText();
    expect(text).toContain("E-Mail-Adresse ändern, Konto bleibt");
    expect(text).toContain(
      "Sie wird an der Buchung gespeichert, die Buchung bleibt aber dem bisherigen Konto zugeordnet"
    );
    expect(text).toContain("können Sie diese Buchung deshalb nicht löschen");
    expect(text).not.toContain("Buchung einem anderen Konto zuordnen?");
    expect(text).not.toContain("verschwindet ggf. aus dem Konto");
  });

  it("names the previous account as the future one", () => {
    mountKept();

    const titles = Array.from(
      document.querySelectorAll(".v-dialog--active .v-list-item__title")
    ).map((el) => el.textContent.trim());
    expect(titles).toEqual(["erika@example.test", "erika@example.test"]);
  });
});
