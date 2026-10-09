import { describe, expect, it } from "vitest";
import { providerTakesOver } from "@/utils/bookableExternalProviders";

const LOCKER = { id: "ap1", provider: "ifbs", externalId: "loc1" };
const DOOR = { id: "ap2", provider: "nuki" };

const bookable = ({ handles = ["pricing"], active = true, assigned } = {}) => ({
  externalProviders: [{ provider: "ifbs", active, handles }],
  accessPointDetails: assigned
    ? { active: true, accessPointIds: assigned }
    : { active: false, accessPointIds: [] },
});

describe("providerTakesOver", () => {
  it("takes over what the provider handles once its locker system is assigned", () => {
    expect(
      providerTakesOver(bookable({ assigned: ["ap1"] }), "pricing", [LOCKER])
    ).toBe(true);
  });

  it("takes over nothing it does not handle", () => {
    expect(
      providerTakesOver(bookable({ assigned: ["ap1"] }), "maxAmount", [LOCKER])
    ).toBe(false);
  });

  it("takes over nothing while switched off", () => {
    expect(
      providerTakesOver(
        bookable({ active: false, assigned: ["ap1"] }),
        "pricing",
        [LOCKER]
      )
    ).toBe(false);
  });

  // Its setting lives with the assigned locker system: a declaration
  // without one leaves the field to the bookable.
  it("takes over nothing without an assigned locker system of the provider", () => {
    expect(providerTakesOver(bookable(), "pricing", [LOCKER])).toBe(false);
    expect(
      providerTakesOver(bookable({ assigned: ["ap2"] }), "pricing", [
        LOCKER,
        DOOR,
      ])
    ).toBe(false);
  });

  it("takes over nothing while Schließsysteme is switched off", () => {
    const off = bookable({ assigned: ["ap1"] });
    off.accessPointDetails.active = false;

    expect(providerTakesOver(off, "pricing", [LOCKER])).toBe(false);
  });

  it("takes over nothing before the access points are known", () => {
    expect(providerTakesOver(bookable({ assigned: ["ap1"] }), "pricing")).toBe(
      false
    );
  });
});
