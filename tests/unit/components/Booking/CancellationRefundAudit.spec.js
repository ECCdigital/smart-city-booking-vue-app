import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";

import CancellationRefundAudit from "@/components/Booking/CancellationRefundAudit.vue";

function policyOf(audit) {
  const wrapper = mountComponent(CancellationRefundAudit, {
    propsData: { audit },
  });
  const policy = wrapper.find(".cancellation-refund-panel__policy");
  return policy.exists() ? policy.text() : "";
}

/**
 * The refund was fixed at the cancellation, so the audit's policy line names
 * no tier: a rejected request says it was free of charge, an override names
 * both percentages, anything else has no line.
 */
describe("CancellationRefundAudit", () => {
  it("says a rejected request was free of charge", () => {
    expect(
      policyOf({
        rejection: true,
        originalAmountEur: 25,
        refundAmountEur: 25,
        cancellationFeeEur: 0,
      })
    ).toBe(
      "Die Anfrage wurde abgelehnt. Das Ablehnen war für den Buchenden kostenfrei: Es wurde kein Betrag einbehalten."
    );
  });

  it("names the suggested and the applied percentage of an override", () => {
    expect(
      policyOf({
        adminOverride: true,
        suggestedRefundPercentage: 50,
        appliedRefundPercentage: 80,
        originalAmountEur: 25,
        refundAmountEur: 20,
      })
    ).toBe(
      "Die Mandantenregel schlug 50 % vor. Angewendet wurden 80 % (Admin-Überschreibung)."
    );
  });

  it("has no policy line without an override", () => {
    expect(
      policyOf({
        appliedRefundPercentage: 50,
        originalAmountEur: 25,
        refundAmountEur: 12.5,
      })
    ).toBe("");
  });
});
