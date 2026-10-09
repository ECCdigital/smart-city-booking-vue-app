import { describe, expect, it } from "vitest";
import {
  EXTERNAL_PROVIDER_SETTING,
  getVisibleBookableEditSections,
} from "@/utils/bookableEditSections";
import { IFBS_LOCKER, takenOverBy } from "@tests/unit/support/parkraumService";

function sectionIds(bookable, tabKey = "pricing", accessPoints = []) {
  return getVisibleBookableEditSections(tabKey, {
    bookable,
    accessPoints,
  }).map((section) => section.id);
}

function bookable(externalProviders) {
  return {
    id: "b1",
    accessPointDetails: {
      active: true,
      accessPointIds: [IFBS_LOCKER.id],
    },
    externalProviders,
  };
}

/**
 * „Preise & Kapazität“ is two cards, Preis and Anzahl. Both stay while
 * ParkraumService handles prices or Anzahl: they show its note then.
 */
describe("bookableEditSections - the pricing tab", () => {
  it("has the cards Preis and Anzahl", () => {
    expect(sectionIds(bookable([]))).toEqual([
      "pricing-price",
      "pricing-amount",
    ]);
  });

  it("keeps Preis while a provider handles the pricing", () => {
    expect(
      sectionIds(
        bookable([{ provider: "ifbs", active: true, handles: ["pricing"] }])
      )
    ).toEqual(["pricing-price", "pricing-amount"]);
  });
});

/**
 * The settings of ParkraumService belong to the assigned locker system: they
 * show where the tenant's access points name an assigned one, as the panel
 * in Schließsysteme does.
 */
describe("bookableEditSections - ParkraumService in Schließsysteme", () => {
  it("offers its settings once its locker system is assigned", () => {
    expect(sectionIds(bookable([]), "accessLocks", [IFBS_LOCKER])).toContain(
      "pricing-external"
    );
  });

  it("leaves them out without an assigned locker system", () => {
    expect(
      sectionIds(bookable([{ provider: "ifbs", handles: [] }]), "accessLocks")
    ).not.toContain("pricing-external");
    expect(
      sectionIds({ id: "b1" }, "accessLocks", [IFBS_LOCKER])
    ).not.toContain("pricing-external");
  });

  it("no longer offers them in the pricing tab", () => {
    expect(
      sectionIds(bookable([{ provider: "ifbs", handles: [] }]))
    ).not.toContain("pricing-external");
  });
});

describe("bookableEditSections - expert options", () => {
  const relatedIds = (shown) =>
    getVisibleBookableEditSections("relatedBookables", {
      bookable: {},
      shown,
    }).map((section) => section.id);

  it("offers the section of an expert option that shows", () => {
    expect(relatedIds((option) => option === "hierarchy")).toEqual([
      "related-hierarchy",
    ]);
  });

  it("leaves out the section of an expert option that does not show", () => {
    expect(relatedIds(() => false)).toEqual([]);
  });

  it("offers every section without a rule, as expert mode does", () => {
    expect(relatedIds(undefined)).toEqual([
      "related-checkout",
      "related-hierarchy",
    ]);
  });
});

describe("bookableEditSections - Grunddaten", () => {
  const generalIds = (shown) =>
    getVisibleBookableEditSections("general", { bookable: {}, shown }).map(
      (section) => section.id
    );

  it("has the two groups of the Grunddaten, with or without expert mode", () => {
    const groups = ["general-catalog", "general-admin"];
    expect(generalIds(() => false)).toEqual(groups);
    expect(generalIds(undefined)).toEqual(groups);
  });

  it("names them as the groups do", () => {
    expect(
      getVisibleBookableEditSections("general", { bookable: {} }).map(
        (section) => section.labelKey
      )
    ).toEqual(["bookable.identity.catalog", "bookable.identity.admin"]);
  });
});

describe("bookableEditSections - the Buchungsart tab", () => {
  const ids = (overrides) =>
    getVisibleBookableEditSections("bookingType", {
      bookable: { isScheduleRelated: true, ...overrides },
      accessPoints: [IFBS_LOCKER],
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
    expect(ids(takenOverBy(["availability"]))).toEqual(["bookingType-select"]);
  });

  it("keeps the sections of the mode while no locker system is assigned", () => {
    expect(
      ids({ ...takenOverBy(["availability"]), accessPointDetails: null })
    ).toContain("bookingType-duration");
  });
});

describe("EXTERNAL_PROVIDER_SETTING", () => {
  it("points at the section where the provider is set up", () => {
    expect(EXTERNAL_PROVIDER_SETTING).toEqual({
      tabKey: "accessLocks",
      sectionId: "pricing-external",
    });
  });
});
