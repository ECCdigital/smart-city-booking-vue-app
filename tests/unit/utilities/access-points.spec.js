import { describe, expect, it } from "vitest";
import {
  accessPointTypeLabel,
  canListAccessPoints,
  providerAccessPointDefaults,
  providerIdFields,
  providerModes,
  providerRequiresScanByDefault,
  providerTypes,
  requiresQrScan,
} from "@/utilities/access-points";

/**
 * What each provider hands out. Open Locker hands out both a
 * Schließfachanlage, whose Fächer the platform assigns, and a fixed Fach, a
 * door - both opened remotely, and a new one starts as the Anlage
 * (ECCdigital/tickets#1037).
 */
describe("what a provider's access points are", () => {
  it.each([
    ["nuki", { type: "door" }],
    ["salto-ks", { type: "door" }],
    ["open-locker", { type: "locker", mode: "remote" }],
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
 * The types an admin chooses between for a provider's access point: Open
 * Locker offers the Schließfachanlage first and the fixed Fach next; every
 * other provider hands out one type, and one this UI does not know none it
 * could name.
 */
describe("the types a provider offers", () => {
  it.each([
    ["open-locker", ["locker", "door"]],
    ["nuki", ["door"]],
    ["salto-ks", ["door"]],
    ["ifbs", ["locker"]],
    ["pareva", ["locker"]],
    ["some-new-provider", []],
    ["", []],
  ])("%s offers %o", (provider, types) => {
    expect(providerTypes(provider)).toEqual(types);
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
 * rules - the backend's `requiresScanByDefault`. An Open Locker Fach or
 * Anlage is opened from the list, so it starts without one; every other provider,
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
 * Whether an access point demands a QR scan, by its `qrScan` rule. An Open
 * Locker Anlage carries the rule for all its Fächer
 * (ECCdigital/tickets#1060); an iFBS or Pareva Anlage carries none.
 */
describe("whether an access point demands a QR scan", () => {
  const ANLAGE = {
    type: "locker",
    provider: "open-locker",
    config: { compartments: [] },
  };

  it.each([
    [
      "a door with the rule",
      { type: "door", validationRules: [{ type: "qrScan" }] },
      true,
    ],
    ["a door without", { type: "door", validationRules: [] }, false],
    [
      "an Open Locker Anlage with the rule",
      { ...ANLAGE, validationRules: [{ type: "qrScan" }] },
      true,
    ],
    [
      "an Open Locker Anlage without",
      { ...ANLAGE, validationRules: [] },
      false,
    ],
    [
      "an iFBS Anlage",
      { type: "locker", provider: "ifbs", validationRules: [] },
      false,
    ],
    ["nothing", null, false],
  ])("%s", (_, accessPoint, scan) => {
    expect(requiresQrScan(accessPoint)).toBe(scan);
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
      expect(providerIdFields(provider, "door")).toEqual({
        idField: true,
        label,
        hint,
        placeholder,
        locationField,
      });
    }
  );

  // An Open Locker Schließfachanlage carries its Fächer, not an id of its
  // own (ECCdigital/tickets#1037): it shows no id field at all.
  it("shows an Open Locker Schließfachanlage no id field", () => {
    expect(providerIdFields("open-locker", "locker")).toMatchObject({
      idField: false,
      locationField: false,
    });
  });

  it("goes by the provider alone where the type changes nothing", () => {
    expect(providerIdFields("ifbs", "locker")).toEqual(
      providerIdFields("ifbs")
    );
  });
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
    ["open-locker", "locker", "Schließfachanlage"],
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
