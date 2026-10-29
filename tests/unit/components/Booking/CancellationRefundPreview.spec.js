import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";

import CancellationRefundPreview from "@/components/Booking/CancellationRefundPreview.vue";

function policyOf(preview) {
  const wrapper = mountComponent(CancellationRefundPreview, {
    propsData: { preview },
  });
  return wrapper.find(".cancellation-refund-panel__policy").text();
}

/**
 * The policy line of a single booking's refund preview names the calendar
 * days before the start; a booking without a time span has none
 * (`daysBeforeStart: null`), and the line says so instead.
 */
describe("CancellationRefundPreview", () => {
  it("names the calendar days before the start", () => {
    expect(
      policyOf({
        originalAmountEur: 25,
        refundAmountEur: 20,
        suggestedRefundPercentage: 80,
        daysBeforeStart: 3,
      })
    ).toBe(
      "Bei 3 Kalendertagen bis zum Beginn schlägt die Mandantenregel 80 % Erstattung vor."
    );
  });

  it("names no days for a booking without a time span", () => {
    expect(
      policyOf({
        originalAmountEur: 25,
        refundAmountEur: 25,
        suggestedRefundPercentage: 100,
        daysBeforeStart: null,
      })
    ).toBe(
      "Die Buchung hat keinen Zeitraum. Die Mandantenregel schlägt 100 % Erstattung vor."
    );
  });

  it("offers no override for a rejection and says it is free of charge", () => {
    const wrapper = mountComponent(CancellationRefundPreview, {
      propsData: {
        preview: {
          originalAmountEur: 25,
          refundAmountEur: 25,
          cancellationFeeEur: 0,
          suggestedRefundPercentage: 100,
          daysBeforeStart: 3,
          rejection: true,
        },
      },
    });

    expect(wrapper.find(".cancellation-refund-panel__policy").text()).toBe(
      "Die Buchung ist angefragt. Das Ablehnen ist für den Buchenden kostenfrei: Es wird kein Betrag einbehalten."
    );
    expect(wrapper.find("input[type=checkbox]").exists()).toBe(false);
  });

  it("offers no override for a series of requests", () => {
    const wrapper = mountComponent(CancellationRefundPreview, {
      propsData: {
        preview: {
          bookings: [
            {
              bookingId: "B-1",
              originalAmountEur: 10,
              refundAmountEur: 10,
              suggestedRefundPercentage: 100,
              rejection: true,
            },
            {
              bookingId: "B-2",
              originalAmountEur: 10,
              refundAmountEur: 10,
              suggestedRefundPercentage: 100,
              rejection: true,
            },
          ],
        },
      },
    });

    expect(wrapper.find("input[type=checkbox]").exists()).toBe(false);
  });
});
