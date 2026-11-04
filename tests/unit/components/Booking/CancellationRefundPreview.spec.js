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
 * The policy line of a single booking's refund preview names the time before
 * the start, in days from one day on and in hours below; a booking without a
 * time span has none (`hoursBeforeStart: null`), and the line says so
 * instead.
 */
describe("CancellationRefundPreview", () => {
  it("names the days before the start", () => {
    expect(
      policyOf({
        originalAmountEur: 25,
        refundAmountEur: 20,
        suggestedRefundPercentage: 80,
        hoursBeforeStart: 75,
      })
    ).toBe(
      "Bei Stornierung 3 Tage vor Beginn schlägt die Mandantenregel 80 % Erstattung vor."
    );
  });

  it("names the tier that applied beside the time before the start", () => {
    expect(
      policyOf({
        originalAmountEur: 25,
        refundAmountEur: 2.75,
        suggestedRefundPercentage: 11,
        hoursBeforeStart: 30,
        appliedTierHours: 26,
      })
    ).toBe(
      "Die Buchung beginnt in 1 Tag und 6 Stunden. Es gilt die Erstattungsstufe „bis 26 Stunden vor Beginn“: Die Mandantenregel schlägt 11 % Erstattung vor."
    );
  });

  it("names only whole days of the start from three days on", () => {
    expect(
      policyOf({
        originalAmountEur: 25,
        refundAmountEur: 12.5,
        suggestedRefundPercentage: 50,
        hoursBeforeStart: 77,
        appliedTierHours: 168,
      })
    ).toBe(
      "Die Buchung beginnt in 3 Tagen. Es gilt die Erstattungsstufe „bis 7 Tage vor Beginn“: Die Mandantenregel schlägt 50 % Erstattung vor."
    );
  });

  it("names the hours before the start below one day", () => {
    expect(
      policyOf({
        originalAmountEur: 25,
        refundAmountEur: 20,
        suggestedRefundPercentage: 80,
        hoursBeforeStart: 11,
      })
    ).toBe(
      "Bei Stornierung 11 Stunden vor Beginn schlägt die Mandantenregel 80 % Erstattung vor."
    );
  });

  it("names no days for a booking without a time span", () => {
    expect(
      policyOf({
        originalAmountEur: 25,
        refundAmountEur: 25,
        suggestedRefundPercentage: 100,
        hoursBeforeStart: null,
      })
    ).toBe(
      "Die Buchung hat keinen Zeitraum. Die Mandantenregel schlägt 100 % Erstattung vor."
    );
  });
});
