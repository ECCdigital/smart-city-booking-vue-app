import { describe, expect, it } from "vitest";
import {
  formatCheckoutValidationError,
  getCheckoutErrorToastKey,
} from "@/utils/checkoutErrors";

const REASON = "checkout.max_amount_per_booking_exceeded";

/**
 * A refused Höchstmenge je Buchung reaches the legacy checkout as the
 * backend's German sentence (`validateItem` answers `{ error: message }`),
 * elsewhere as its reason code. Either way the customer reads German.
 */
describe("checkoutErrors - the Höchstmenge je Buchung", () => {
  it("shows the backend's sentence of the legacy validateItem", () => {
    const message =
      "Von Beamer können höchstens 3 Stück je Buchung gebucht werden.";

    expect(
      formatCheckoutValidationError({ error: message, checkoutId: "c1" })
    ).toBe(message);
  });

  it("names the reason code in German", () => {
    const expected =
      "Die gewählte Anzahl übersteigt die Höchstmenge je Buchung für dieses Objekt.";

    expect(formatCheckoutValidationError({ reason: REASON })).toBe(expected);
    expect(formatCheckoutValidationError({ error: REASON })).toBe(expected);
  });

  it("toasts the reason code with its own title and message", () => {
    expect(getCheckoutErrorToastKey({ reason: REASON })).toBe(REASON);
  });
});
