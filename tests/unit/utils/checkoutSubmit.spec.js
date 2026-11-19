import { describe, expect, it } from "vitest";
import { checkoutSubmitLabel, isFreeCheckout } from "@/utils/checkoutSubmit";

/**
 * ECCdigital/tickets#1303: the legacy checkout completes with „Verbindlich
 * buchen“ only when every item is valid, every price is known and they add
 * up to 0 EUR. Anything less certain asks for payment (§ 312j Abs. 3 BGB).
 */
describe("isFreeCheckout", () => {
  it("is free when every item is valid at 0 EUR", () => {
    expect(isFreeCheckout({ allItemsValid: true, grossPrices: [0, 0] })).toBe(
      true
    );
  });

  it("is not free when one price is missing", () => {
    expect(
      isFreeCheckout({ allItemsValid: true, grossPrices: [0, null] })
    ).toBe(false);
  });

  it("is not free when one item is invalid or not checked yet", () => {
    expect(isFreeCheckout({ allItemsValid: false, grossPrices: [0] })).toBe(
      false
    );
    expect(isFreeCheckout({ allItemsValid: null, grossPrices: [0] })).toBe(
      false
    );
  });

  it("is not free when something costs money", () => {
    expect(
      isFreeCheckout({ allItemsValid: true, grossPrices: [0, 0.01] })
    ).toBe(false);
  });

  it("is not free without any item", () => {
    expect(isFreeCheckout({ allItemsValid: true, grossPrices: [] })).toBe(
      false
    );
  });
});

describe("checkoutSubmitLabel", () => {
  it("books bindingly when the checkout is free", () => {
    expect(checkoutSubmitLabel({ allItemsValid: true, grossPrices: [0] })).toBe(
      "Verbindlich buchen"
    );
  });

  it("asks for payment otherwise", () => {
    expect(
      checkoutSubmitLabel({ allItemsValid: true, grossPrices: [null] })
    ).toBe("Zahlungspflichtig buchen");
  });
});
