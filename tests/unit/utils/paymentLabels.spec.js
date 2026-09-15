import { describe, expect, it } from "vitest";
import {
  paymentMethodLabel,
  paymentProviderLabel,
} from "@/utils/paymentLabels";

/** The Zahlung block's words for a booking's method and provider codes. */
describe("paymentMethodLabel", () => {
  it.each([
    ["CASH", "Bar"],
    ["TRANSFER", "Überweisung"],
    ["PAYPAL", "PayPal"],
  ])("reads %s as %s", (code, label) => {
    expect(paymentMethodLabel(code)).toBe(label);
  });

  it.each([["SOMETHING_NEW"], [null], [undefined], [""]])(
    "reads „Unbekannt“ for %s",
    (code) => {
      expect(paymentMethodLabel(code)).toBe("Unbekannt");
    }
  );
});

describe("paymentProviderLabel", () => {
  it.each([
    ["giroCockpit", "GiroCockpit (Online bezahlen)"],
    ["invoice", "Rechnung"],
    ["manual", "Manuelle Zahlung"],
  ])("reads %s as %s", (code, label) => {
    expect(paymentProviderLabel(code)).toBe(label);
  });

  it.each([["stripe"], [null], [undefined]])(
    "reads „Unbekannt“ for %s",
    (code) => {
      expect(paymentProviderLabel(code)).toBe("Unbekannt");
    }
  );
});
