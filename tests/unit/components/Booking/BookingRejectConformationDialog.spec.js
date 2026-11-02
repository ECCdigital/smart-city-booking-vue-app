import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { activeDialog, activeDialogText } from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: { getCancellationRefundPreview: vi.fn() },
}));

import BookingRejectConformationDialog from "@/components/Booking/BookingRejectConformationDialog.vue";
import ApiBookingService from "@/services/api/ApiBookingService";

/**
 * Mounted closed and then opened, the way `BookingTransitions` drives it, so
 * that the dialog's own opening loads the refund preview.
 */
async function openDialog(toReject) {
  const wrapper = mountComponent(BookingRejectConformationDialog, {
    propsData: { open: false, toReject },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

function title() {
  return activeDialog().querySelector(".v-card__title").textContent.trim();
}

function paymentText() {
  const alert = activeDialog().querySelector(".booking-reject-payment");
  return (
    Array.from(alert.querySelectorAll(".v-alert__content > div"))
      // Intl writes a no-break space before the currency sign.
      .map((line) => line.textContent.replace(/\u00a0/g, " ").trim())
      .join(" ")
  );
}

function preview(originalAmountEur, refundAmountEur, overrides = {}) {
  return {
    originalAmountEur,
    refundAmountEur,
    cancellationFeeEur: originalAmountEur - refundAmountEur,
    suggestedRefundPercentage: Math.round(
      (refundAmountEur / originalAmountEur) * 100
    ),
    daysBeforeStart: 3,
    ...overrides,
  };
}

/**
 * The dialog names a request's rejection as such ("Buchungsanfrage
 * ablehnen"): free of charge, without a refund preview. It tells the admin whether the customer has paid and what the
 * cancellation leaves them: money back, a fee still to pay, or nothing -
 * all settled.
 */
describe("BookingRejectConformationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a request: its own title and verb, free of charge, no refund preview", async () => {
    await openDialog({ id: "B-1", status: "requested", priceEur: 40 });

    expect(title()).toBe("Buchungsanfrage ablehnen");
    expect(activeDialogText()).toContain(
      "Sind Sie sicher, dass Sie die Buchungsanfrage B-1 ablehnen wollen?"
    );
    expect(activeDialogText()).toContain("Begründung der Ablehnung");
    expect(activeDialogText()).toContain("Ablehnen");
    expect(paymentText()).toBe(
      "Noch nicht bezahlt Die abgelehnte Buchungsanfrage ist für den Buchenden kostenfrei. Es steht somit keine Zahlung mehr aus."
    );
    expect(activeDialogText()).not.toContain("Erstattungsvorschau");
    expect(
      ApiBookingService.getCancellationRefundPreview
    ).not.toHaveBeenCalled();
  });

  it("offers no checkbox for the cancellation document of a request: the backend issues none", async () => {
    const wrapper = await openDialog({
      id: "B-1",
      status: "requested",
      priceEur: 40,
    });

    expect(activeDialogText()).not.toContain("Kein Stornobeleg erstellen");

    await wrapper.find("textarea").setValue("Kein Platz");
    await wrapper.vm.$nextTick();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("reject-booking")[0]).toEqual([
      "B-1",
      "Kein Platz",
      false,
      undefined,
      undefined,
    ]);
  });

  it("places the payment hint last, after the refund preview and the bank details", async () => {
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue(
      preview(40, 20)
    );
    await openDialog({ id: "B-1", status: "confirmed", priceEur: 40 });

    const form = activeDialog().querySelector("form");
    const hint = form.querySelector(".booking-reject-payment");
    const panel = form.querySelector(".cancellation-refund-panel");
    expect(panel).toBeTruthy();
    expect(
      panel.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(form.lastElementChild).toBe(hint);
  });

  it("cancels a paid booking: the amount paid and the refund to pay out", async () => {
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue(
      preview(40, 20)
    );

    await openDialog({ id: "B-1", status: "confirmed", priceEur: 40 });

    expect(title()).toBe("Buchung stornieren");
    expect(paymentText()).toContain("Bereits bezahlt: 40,00 €");
    expect(paymentText()).toContain("Der Buchende bekommt 20,00 € zurück.");
  });

  it("follows the admin's override of the refund", async () => {
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue(
      preview(40, 20)
    );
    const wrapper = await openDialog({
      id: "B-1",
      status: "confirmed",
      priceEur: 40,
    });

    wrapper.setData({ refundPercentage: 0 });
    await wrapper.vm.$nextTick();

    expect(paymentText()).toContain(
      "Der Buchende bekommt nichts zurück. Damit ist alles erledigt."
    );
  });

  it("cancels an unpaid booking with a fee: the fee still to pay", async () => {
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue(
      preview(40, 30)
    );

    await openDialog({ id: "B-1", status: "payment_due", priceEur: 40 });

    expect(paymentText()).toBe(
      "Noch nicht bezahlt Der Buchende muss noch den Einbehalt von 10,00 € zahlen."
    );
  });

  it("cancels a free booking: nothing to pay, all settled", async () => {
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue(
      preview(0, 0, { suggestedRefundPercentage: 100 })
    );

    await openDialog({ id: "B-1", status: "confirmed", priceEur: 0 });

    expect(paymentText()).toContain("Kostenfreie Buchung");
    expect(paymentText()).toContain("Damit ist alles erledigt.");
  });
});
