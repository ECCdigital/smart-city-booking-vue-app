import { describe, expect, it } from "vitest";
import { getVisibleBookableEditSections } from "@/utils/bookableEditSections";

function sectionIds(bookable) {
  return getVisibleBookableEditSections("pricing", {
    bookable,
    expertMode: true,
  }).map((section) => section.id);
}

function bookable(externalProviders) {
  return {
    id: "b1",
    accessPointDetails: {
      active: true,
      accessPointIds: ["ap-ifbs"],
    },
    externalProviders,
  };
}

/**
 * Since the locker fold the bookable no longer says which of its access points
 * is a locker system - that needs the tenant's access point list, which this
 * module cannot load. What it can read is the external provider the pricing
 * section configures, so that is what the anchor keys on.
 */
describe("bookableEditSections - the pricing tab", () => {
  it("offers the external source once a provider is declared", () => {
    expect(sectionIds(bookable([{ provider: "ifbs", handles: [] }]))).toContain(
      "pricing-external"
    );
  });

  it("leaves it out for a bookable with no provider at all", () => {
    expect(sectionIds(bookable([]))).not.toContain("pricing-external");
    expect(sectionIds({ id: "b1" })).not.toContain("pricing-external");
  });

  it("shows the own price tiers while no provider handles the pricing", () => {
    expect(
      sectionIds(
        bookable([{ provider: "ifbs", active: true, handles: ["maxAmount"] }])
      )
    ).toContain("pricing-tiers");
  });

  it("hides the own price tiers when a provider handles the pricing", () => {
    expect(
      sectionIds(
        bookable([{ provider: "ifbs", active: true, handles: ["pricing"] }])
      )
    ).not.toContain("pricing-tiers");
  });

  it("keeps the own price tiers while the provider is switched off", () => {
    expect(
      sectionIds(
        bookable([{ provider: "ifbs", active: false, handles: ["pricing"] }])
      )
    ).toContain("pricing-tiers");
  });
});
