import { describe, expect, it } from "vitest";
import {
  accessPointTypeLabel,
  canListAccessPoints,
  providerAccessPointDefaults,
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
