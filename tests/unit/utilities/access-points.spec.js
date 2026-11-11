import { describe, expect, it } from "vitest";
import {
  accessPointTypeLabel,
  canListAccessPoints,
  providerAccessPointDefaults,
  providerIdFields,
  providerModes,
  providerRequiresScanByDefault,
} from "@/utilities/access-points";

/**
 * What each provider hands out. Open Locker (ECCdigital/tickets#970) hands
 * out compartments, each a door opened remotely - not an Anlage, because
 * every compartment is one access point of its own.
 */
describe("what a provider's access points are", () => {
  it.each([
    ["nuki", { type: "door" }],
    ["salto-ks", { type: "door" }],
    ["open-locker", { type: "door", mode: "remote" }],
    ["ifbs", { type: "locker", mode: "remote" }],
    ["pareva", { type: "locker", mode: "authorization" }],
  ])("%s hands out %o", (provider, defaults) => {
    expect(providerAccessPointDefaults(provider)).toEqual(defaults);
  });

  it("says nothing for a provider it does not know", () => {
    expect(providerAccessPointDefaults("some-new-provider")).toBeNull();
  });
});

/**
 * The modes a door of the provider can be set to. Salto KS and Open Locker
 * open remotely or not at all; the other providers leave the choice open.
 */
describe("the modes of a provider's door", () => {
  it.each([
    ["salto-ks", ["remote"]],
    ["open-locker", ["remote"]],
    ["nuki", null],
    ["some-new-provider", null],
  ])("%s offers %o", (provider, modes) => {
    expect(providerModes(provider)).toEqual(modes);
  });
});

/**
 * Whether a new access point demands a QR scan when it is created without
 * rules - the backend's `requiresScanByDefault`. An Open Locker compartment
 * is opened from the list, so it starts without one; every other provider,
 * and one this UI does not know, starts with the scan the server sets.
 */
describe("whether a provider's access point starts with a QR scan", () => {
  it.each([
    ["nuki", true],
    ["salto-ks", true],
    ["ifbs", true],
    ["pareva", true],
    ["open-locker", false],
    ["some-new-provider", true],
    ["", true],
    [undefined, true],
  ])("%s: %s", (provider, scan) => {
    expect(providerRequiresScanByDefault(provider)).toBe(scan);
  });
});

/**
 * The id fields the dialog shows follow the provider, not the type: a locker
 * system of iFBS knows one location, one of Pareva one product, and the
 * second field - `providerLocationId` - is read by no provider. A door keeps
 * both fields, and so does a locker system of a provider this UI has no table
 * row for. Only the Pareva product id carries a placeholder, because the
 * 24-hex id is nothing an admin would guess the shape of. An Open Locker
 * compartment is a door, but Open Locker knows it by its UUID alone, so it
 * shows that one field.
 */
describe("the id fields of a provider's access point", () => {
  it.each([
    ["nuki", "externalId", null, null, true],
    ["salto-ks", "externalId", null, null, true],
    ["ifbs", "locationId", "locationIdHint", null, false],
    ["pareva", "productId", "productIdHint", "productIdPlaceholder", false],
    ["open-locker", "compartmentUuid", "compartmentUuidHint", null, false],
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

/**
 * What the type of an access point is called follows provider and type
 * (ECCdigital/tickets#1036): an Open Locker door is a compartment on site, so
 * it reads „Fach“, never „Tür“ - the doors of Nuki and Salto KS stay „Tür“,
 * the Anlagen of iFBS and Pareva stay „Anlage“. A compartment stored before
 * reads „Fach“ as it is, without a migration.
 */
describe("what the type of a provider's access point is called", () => {
  it.each([
    ["nuki", "door", "Tür"],
    ["salto-ks", "door", "Tür"],
    ["open-locker", "door", "Fach"],
    ["ifbs", "locker", "Anlage"],
    ["pareva", "locker", "Anlage"],
  ])("%s %s reads %s", (provider, type, name) => {
    expect(accessPointTypeLabel({ provider, type })).toBe(name);
  });

  it("goes by the type alone for a provider it does not know", () => {
    expect(
      accessPointTypeLabel({ provider: "some-new-provider", type: "door" })
    ).toBe("Tür");
    expect(accessPointTypeLabel({ type: "locker" })).toBe("Anlage");
  });

  it("names no type it does not know", () => {
    expect(accessPointTypeLabel({ provider: "open-locker", type: "x" })).toBe(
      ""
    );
    expect(accessPointTypeLabel(null)).toBe("");
  });
});
