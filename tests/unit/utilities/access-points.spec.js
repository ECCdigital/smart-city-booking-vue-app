import { describe, expect, it } from "vitest";
import { providerIdFields } from "@/utilities/access-points";

/**
 * The id fields the dialog shows follow the provider, not the type: a locker
 * system of iFBS knows one location, one of Pareva one product size, and the
 * second field - `providerLocationId` - is read by no provider. A door keeps
 * both fields, and so does a locker system of a provider this UI has no table
 * row for.
 */
describe("the id fields of a provider's access point", () => {
  it.each([
    ["nuki", "externalId", null, true],
    ["salto-ks", "externalId", null, true],
    ["ifbs", "locationId", "locationIdHint", false],
    ["pareva", "productSize", "productSizeHint", false],
    ["some-new-provider", "externalId", null, true],
    ["", "externalId", null, true],
    [undefined, "externalId", null, true],
  ])(
    "shows %s the field %s with hint %s, the location field: %s",
    (provider, label, hint, locationField) => {
      expect(providerIdFields(provider)).toEqual({
        label,
        hint,
        locationField,
      });
    }
  );
});
