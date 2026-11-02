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
});
