import { describe, expect, it } from "vitest";
import BookingDeleteConformationDialog from "@/components/Booking/BookingDeleteConformationDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";

function mountDialog(toDelete, props = {}) {
  return mountComponent(BookingDeleteConformationDialog, {
    propsData: { open: true, toDelete, ...props },
  });
}

function checkbox() {
  return document.querySelector(".v-dialog--active input[type=checkbox]");
}

function yesButton(wrapper) {
  return wrapper
    .findAll(".v-dialog button")
    .wrappers.find((button) => button.text() === "Löschen");
}

const CONFIRMED_HINT = "weder storniert noch widerrufen";
const REFUND_HINT =
  "Bitte stellen Sie sicher, dass der Buchende seine Rückzahlung erhalten hat";
/** „Diese Buchung ist bereits bezahlt (25,00 €).“ - the space before € is a no-break one. */
const PAID_HINT_25 = /Diese Buchung ist bereits bezahlt \(25,00\s€\)\./;
const PAYMENT_DUE_HINT = "Die Zahlung dieser Buchung ist noch offen";

/**
 * Whether the delete is offered is the host's call
 * (`BookingPermissionService.allowDelete`); the dialog warns about a
 * confirmed booking that was neither cancelled nor withdrawn, and about one
 * awaiting payment, which the booker already has as confirmed.
 */
describe("BookingDeleteConformationDialog", () => {
  it.each(["requested", "payment_due", "rejected", "cancelled", "withdrawn"])(
    "lets an unpaid %s booking be deleted at once, without the confirmation",
    async (status) => {
      const wrapper = mountDialog({ id: "bk-1", status });

      expect(checkbox()).toBeNull();
      expect(yesButton(wrapper).attributes("disabled")).toBeUndefined();
      await yesButton(wrapper).trigger("click");
      expect(wrapper.emitted("delete-booking")).toEqual([
        ["bk-1", { confirmed: false }],
      ]);
    }
  );

  it.each([
    ["confirmed", { status: "confirmed", priceEur: 25 }],
    [
      "paid and cancelled",
      {
        status: "cancelled",
        priceEur: 25,
        cancellationRefund: { cancelledFrom: "confirmed" },
      },
    ],
  ])(
    "keeps „Löschen“ locked for a %s booking until the checkbox, then sends the confirmation",
    async (_, booking) => {
      const wrapper = mountDialog({ id: "bk-1", ...booking });

      expect(checkbox()).not.toBeNull();
      expect(document.querySelector(".v-dialog--active").textContent).toContain(
        "Ich habe den Hinweis gelesen und will die Buchung trotzdem löschen."
      );
      expect(yesButton(wrapper).attributes("disabled")).toBe("disabled");

      checkbox().click();
      await wrapper.vm.$nextTick();

      expect(yesButton(wrapper).attributes("disabled")).toBeUndefined();
      await yesButton(wrapper).trigger("click");
      expect(wrapper.emitted("delete-booking")).toEqual([
        ["bk-1", { confirmed: true }],
      ]);
    }
  );

  it("asks for the checkbox once the backend required the confirmation", async () => {
    const wrapper = mountDialog(
      { id: "bk-1", status: "requested" },
      { confirmationRequired: true }
    );

    expect(yesButton(wrapper).attributes("disabled")).toBe("disabled");
    checkbox().click();
    await wrapper.vm.$nextTick();
    await yesButton(wrapper).trigger("click");
    expect(wrapper.emitted("delete-booking")).toEqual([
      ["bk-1", { confirmed: true }],
    ]);
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

  it("points out a paid booking that was cancelled", () => {
    const text = mountDialog({
      id: "bk-1",
      status: "cancelled",
      priceEur: 25,
      cancellationRefund: { cancelledFrom: "confirmed" },
    })
      .find(".v-dialog")
      .text();

    expect(text).toMatch(PAID_HINT_25);
    expect(text).not.toContain(CONFIRMED_HINT);
  });

  it("asks for the confirmation once the backend required it", () => {
    const text = mountDialog(
      { id: "bk-1", status: "requested" },
      { confirmationRequired: true }
    )
      .find(".v-dialog")
      .text();

    expect(text).toContain(
      "Das Löschen betrifft bestätigte oder bezahlte Buchungen"
    );
  });

  it("asks to make sure of the refund while it is still open", () => {
    const text = mountDialog({
      id: "bk-1",
      status: "cancelled",
      priceEur: 25,
      cancellationRefund: { cancelledFrom: "confirmed", refundState: "open" },
    })
      .find(".v-dialog")
      .text();

    expect(text).toMatch(PAID_HINT_25);
    expect(text).toContain(REFUND_HINT);
  });

  it("says nothing of the refund once it is completed", () => {
    const text = mountDialog({
      id: "bk-1",
      status: "cancelled",
      priceEur: 25,
      cancellationRefund: {
        cancelledFrom: "confirmed",
        refundState: "completed",
      },
    })
      .find(".v-dialog")
      .text();

    expect(text).toMatch(PAID_HINT_25);
    expect(text).not.toContain(REFUND_HINT);
  });

  it("says a confirmed paid booking in one block, with its amount and the refund to make sure of", () => {
    mountDialog({ id: "bk-1", status: "confirmed", priceEur: 25 });

    const alerts = Array.from(
      document.querySelectorAll(".v-dialog--active .v-alert")
    ).map((el) => el.textContent);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatch(
      /Diese Buchung wurde bestätigt und ist bereits bezahlt \(25,00\s€\)\. Sie wurde weder storniert noch widerrufen\./
    );
    expect(alerts[0]).toContain(REFUND_HINT);
  });

  it("says nothing of a payment for a confirmed booking without a price", () => {
    const text = mountDialog({ id: "bk-1", status: "confirmed" })
      .find(".v-dialog")
      .text();

    expect(text).toContain("Diese Buchung wurde bereits bestätigt.");
    expect(text).not.toContain("bezahlt");
  });

  it("says nothing of a payment for a free confirmed booking", () => {
    const text = mountDialog({ id: "bk-1", status: "confirmed", priceEur: 0 })
      .find(".v-dialog")
      .text();

    expect(text).toContain(CONFIRMED_HINT);
    expect(text).not.toContain("bereits bezahlt");
  });
});
