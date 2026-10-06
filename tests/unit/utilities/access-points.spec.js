import { describe, expect, it } from "vitest";
import {
  canListAccessPoints,
  providerIdFields,
} from "@/utilities/access-points";

/**
 * The id fields the dialog shows follow the provider, not the type: a locker
 * system of iFBS knows one location, one of Pareva one product, and the
 * second field - `providerLocationId` - is read by no provider. A door keeps
 * both fields, and so does a locker system of a provider this UI has no table
 * row for. Only the Pareva product id carries a placeholder, because the
 * 24-hex id is nothing an admin would guess the shape of.
 */
describe("the id fields of a provider's access point", () => {
  it.each([
    ["nuki", "externalId", null, null, true],
    ["salto-ks", "externalId", null, null, true],
    ["ifbs", "locationId", "locationIdHint", null, false],
    ["pareva", "productId", "productIdHint", "productIdPlaceholder", false],
    ["some-new-provider", "externalId", null, null, true],
    ["", "externalId", null, null, true],
    [undefined, "externalId", null, null, true],
  ])(
    "shows %s the field %s with hint %s, placeholder %s, the location field: %s",
    (provider, label, hint, placeholder, locationField) => {
      expect(providerIdFields(provider)).toEqual({
        label,
        hint,
        placeholder,
        locationField,
      });
    }
  );
});

/**
 * Whether a provider lists access points to take over is the provider's
 * `listAccessPoints` capability, as the backend reports it - not the provider
 * id. Pareva lists size codes, not products, so the backend drops the
 * capability there and the picker stops offering it.
 */
describe("whether a provider lists access points", () => {
  it("is true for a provider that reports the capability", () => {
    expect(
      canListAccessPoints({
        id: "nuki",
        providerCapabilities: ["listAccessPoints", "getLocation"],
      })
    ).toBe(true);
  });

  it("is false for a provider without it", () => {
    expect(
      canListAccessPoints({ id: "pareva", providerCapabilities: ["open"] })
    ).toBe(false);
  });

  it("is false for a provider that reports no capabilities at all", () => {
    expect(canListAccessPoints({ id: "pareva" })).toBe(false);
    expect(canListAccessPoints(null)).toBe(false);
  });
});
