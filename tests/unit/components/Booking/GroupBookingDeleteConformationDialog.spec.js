import { describe, expect, it } from "vitest";
import GroupBookingDeleteConformationDialog from "@/components/Booking/GroupBookingDeleteConformationDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";

function alertsOf(props) {
  mountComponent(GroupBookingDeleteConformationDialog, {
    propsData: { open: true, bookingId: "bk-1", ...props },
  });
  return Array.from(
    document.querySelectorAll(".v-dialog--active .v-alert")
  ).map((el) => el.textContent.replace(/\s+/g, " ").trim());
}

const REFUND =
  "Bitte stellen Sie sicher, dass der Buchende seine Rückzahlung erhalten hat, bevor Sie die Serie löschen.";

/**
 * The warning of a series is one block, the most urgent: how many members
 * are paid and the refund to make sure of; else the confirmed members;
 * else those awaiting payment.
 */
describe("GroupBookingDeleteConformationDialog", () => {
  it("counts the paid members and asks for the refund, alone", () => {
    const alerts = alertsOf({
      paidCount: 2,
      containsConfirmed: true,
      containsPaymentDue: true,
    });

    expect(alerts).toEqual([
      `Diese Serie enthält 2 bereits bezahlte Buchungen. ${REFUND}`,
    ]);
  });

  it("says one paid member in the singular", () => {
    expect(alertsOf({ paidCount: 1 })).toEqual([
      `Diese Serie enthält eine bereits bezahlte Buchung. ${REFUND}`,
    ]);
  });

  it("names confirmed members where none is paid", () => {
    const alerts = alertsOf({
      containsConfirmed: true,
      containsPaymentDue: true,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toContain(
      "Diese Serie enthält bereits bestätigte Buchungen"
    );
  });

  it("names members awaiting payment where nothing else is", () => {
    const alerts = alertsOf({ containsPaymentDue: true });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toContain("Buchungen mit offener Zahlung");
  });
});
