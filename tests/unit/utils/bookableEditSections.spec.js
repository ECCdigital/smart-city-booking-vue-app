import { describe, expect, it } from "vitest";
import { getVisibleBookableEditSections } from "@/utils/bookableEditSections";

function sectionIds(bookable, tabKey = "pricing") {
  return getVisibleBookableEditSections(tabKey, { bookable }).map(
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
 * The settings of ParkraumService belong to the assigned locker system.
 * Since the locker fold the bookable no longer says which of its access
 * points is a locker system - that needs the tenant's access point list,
 * which this module cannot load. What it can read is the provider the
 * settings declare, so that is what the anchor keys on.
 */
describe("bookableEditSections - ParkraumService in Schließsysteme", () => {
  it("offers its settings once a provider is declared", () => {
    expect(
      sectionIds(bookable([{ provider: "ifbs", handles: [] }]), "accessLocks")
    ).toContain("pricing-external");
  });

  it("leaves them out for a bookable with no provider at all", () => {
    expect(sectionIds(bookable([]), "accessLocks")).not.toContain(
      "pricing-external"
    );
    expect(sectionIds({ id: "b1" }, "accessLocks")).not.toContain(
      "pricing-external"
    );
  });

  it("no longer offers them in the pricing tab", () => {
    expect(
      sectionIds(bookable([{ provider: "ifbs", handles: [] }]))
    ).not.toContain("pricing-external");
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
