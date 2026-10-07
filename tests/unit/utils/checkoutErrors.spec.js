import { describe, expect, it } from "vitest";
import {
  formatCheckoutValidationError,
  getCheckoutErrorToastKey,
} from "@/utils/checkoutErrors";
import ToastService from "@/services/ToastService";

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

const NOT_FOUND = "checkout.bookable_not_found";
const NO_LONGER_AVAILABLE =
  "Dieses Angebot ist nicht mehr verfügbar und kann nicht gebucht werden.";

/**
 * ECCdigital/tickets#262: an offer that is no longer reachable - withdrawn,
 * never existed or hidden by the tenant supervision - is refused with
 * `checkout.bookable_not_found`, deliberately without a cause. `validateItem`
 * answers `{ error: reason, checkoutId }`, the checkout the bare reason. Both
 * used to end in the generic text for unexpected errors.
 */
describe("checkoutErrors - an offer that is no longer available", () => {
  it("says so for the refusal of validateItem", () => {
    expect(
      formatCheckoutValidationError({ error: NOT_FOUND, checkoutId: "c1" })
    ).toBe(NO_LONGER_AVAILABLE);
  });

  it("says so in the toast of the refused checkout", () => {
    const toast = ToastService.createToast(
      getCheckoutErrorToastKey(NOT_FOUND),
      "error"
    );

    expect(toast.message).toBe(NO_LONGER_AVAILABLE);
    expect(toast.title).not.toBe(
      ToastService.createToast("checkout.error.unexpected", "error").title
    );
  });
});
