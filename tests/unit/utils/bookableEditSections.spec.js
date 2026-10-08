import { describe, expect, it } from "vitest";
import {
  EXTERNAL_PROVIDER_SETTING,
  getVisibleBookableEditSections,
} from "@/utils/bookableEditSections";

function sectionIds(bookable) {
  return getVisibleBookableEditSections("pricing", { bookable }).map(
    (section) => section.id
  );
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

describe("bookableEditSections - expert options", () => {
  const generalIds = (shown) =>
    getVisibleBookableEditSections("general", { bookable: {}, shown }).map(
      (section) => section.id
    );

  it("offers the section of an expert option that shows", () => {
    expect(generalIds((option) => option === "tags")).toContain("general-tags");
  });

  it("leaves out the section of an expert option that does not show", () => {
    expect(generalIds(() => false)).toEqual([
      "general-info",
      "general-images",
      "general-booker-info",
    ]);
  });

  it("offers every section without a rule, as expert mode does", () => {
    expect(generalIds(undefined)).toContain("general-tags");
  });
});

describe("bookableEditSections - the Buchungsart tab", () => {
  const ids = (overrides) =>
    getVisibleBookableEditSections("bookingType", {
      bookable: { isScheduleRelated: true, ...overrides },
    }).map((section) => section.id);

  it("shows the Buchungsart above the sections of the chosen mode", () => {
    expect(ids()).toEqual([
      "bookingType-select",
      "bookingType-duration",
      "bookingType-lead-time",
      "bookingType-buffer",
    ]);
  });

  it("keeps only the Buchungsart, with its note, when a provider handles the availability", () => {
    expect(
      ids({
        externalProviders: [
          { provider: "ifbs", active: true, handles: ["availability"] },
        ],
      })
    ).toEqual(["bookingType-select"]);
  });
});

describe("EXTERNAL_PROVIDER_SETTING", () => {
  it("points at the section where the provider is set up", () => {
    expect(EXTERNAL_PROVIDER_SETTING).toEqual({
      tabKey: "pricing",
      sectionId: "pricing-external",
    });
  });
});
