import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBookingStatus: vi.fn(),
    verifyBookingOwnership: vi.fn(),
    getPublicCancellationRefundPreview: vi.fn(),
    getHookCancellationRefundPreview: vi.fn(),
    requestRejectBooking: vi.fn(),
    releaseBookingHook: vi.fn(),
  },
}));

import RequestRejectBooking from "@/views/RequestRejectBooking.vue";
import VerifyRejectBooking from "@/views/VerifyRejectBooking.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import { rejectPaymentOutcome } from "@/utils/cancellationRefund";

const PREVIEW = {
  originalAmountEur: 40,
  refundAmountEur: 30,
  cancellationFeeEur: 10,
  suggestedRefundPercentage: 75,
  hoursBeforeStart: 290,
};

function statusEntry(status) {
  return {
    bookingId: "bk-1",
    priceEur: 40,
    status,
    cancellationPolicy: { userCancellable: true, contactHint: "" },
  };
}

/** The confirmation page of the mail's link: the hook id gates the preview. */
async function mountVerify(status) {
  ApiBookingService.getBookingStatus.mockResolvedValue({
    data: [statusEntry(status)],
  });
  ApiBookingService.getHookCancellationRefundPreview.mockResolvedValue(PREVIEW);
  const wrapper = mountComponent(VerifyRejectBooking, {
    propsData: { tenantId: "tenant-1" },
    mocks: { $route: { query: { id: "bk-1", hookId: "hook-1" } } },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/** The request page: the preview loads once the name is entered. */
async function mountRequest(status) {
  ApiBookingService.getBookingStatus.mockResolvedValue({
    data: [statusEntry(status)],
  });
  ApiBookingService.verifyBookingOwnership.mockResolvedValue({ status: 200 });
  ApiBookingService.getPublicCancellationRefundPreview.mockResolvedValue(
    PREVIEW
  );
  const wrapper = mountComponent(RequestRejectBooking, {
    propsData: { tenantId: "tenant-1" },
    mocks: { $route: { query: { id: "bk-1" } } },
  });
  await flushPromises();
  const name = wrapper.find("input[type='text']");
  await name.setValue("Erika Muster");
  await name.trigger("blur");
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * The pages of the cancellation link told the customer of a refund even when
 * nothing had been paid. They now say whether the booking is paid, and an
 * unpaid one speaks of what drops away and what is still due.
 */
describe.each([
  ["the confirmation page", mountVerify],
  ["the request page", mountRequest],
])("payment hint on %s", (_, mount) => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("tells a paid customer what comes back", async () => {
    const wrapper = await mount("confirmed");
    const text = wrapper.text();

    expect(text).toContain("Bereits bezahlt: 40,00");
    expect(text).toContain("Sie bekommen voraussichtlich 30,00");
    expect(text).toContain("Erwartete Erstattung");
    expect(text).toContain("Die Erstattung beträgt voraussichtlich 75 %.");
  });

  it("tells an unpaid customer what is still due, without a refund", async () => {
    const wrapper = await mount("payment_due");
    const text = wrapper.text();

    expect(text).toContain("Noch nicht bezahlt");
    expect(text).toContain("Ein Betrag von voraussichtlich 10,00");
    expect(text).toContain("bleibt noch zu zahlen.");
    expect(text).toContain("Voraussichtliche Abrechnung");
    expect(text).toContain("Entfällt");
    expect(text).toContain("Noch ausstehend");
    expect(text).toContain("Es entfallen voraussichtlich 75 % des Betrags.");
    expect(text).not.toContain("Erstattung");
    expect(text).not.toContain("zurück");
  });

  it("puts the note on the final amount last, right above the button", async () => {
    const wrapper = await mount("payment_due");
    const text = wrapper.text();
    const note = text.indexOf(
      "Der endgültige Betrag wird zum Zeitpunkt Ihrer Bestätigung berechnet."
    );

    expect(note).toBeGreaterThan(text.indexOf("bleibt noch zu zahlen."));
    expect(text.slice(note).trim().split("\n").length).toBeLessThanOrEqual(3);
  });
});

describe("rejectPaymentOutcome for the customer", () => {
  it("leaves out the admin's note on marking the refund", () => {
    expect(
      rejectPaymentOutcome({
        customer: true,
        paid: true,
        priceEur: 40,
        refundAmountEur: 30,
      }).text.replace(/\s/g, " ")
    ).toBe("Sie bekommen voraussichtlich 30,00 € zurück.");
  });

  it("keeps a free booking's hint without „voraussichtlich“", () => {
    expect(
      rejectPaymentOutcome({ customer: true, free: true, priceEur: 0 }).text
    ).toBe("Es fallen für Sie keine Kosten an.");
  });

  it("says an unpaid booking without a fee costs nothing", () => {
    expect(
      rejectPaymentOutcome({
        customer: true,
        paid: false,
        priceEur: 40,
        refundAmountEur: 40,
      })
    ).toEqual({
      type: "success",
      status: "Noch nicht bezahlt",
      text: "Es fallen für Sie voraussichtlich keine Kosten an.",
    });
  });
});
