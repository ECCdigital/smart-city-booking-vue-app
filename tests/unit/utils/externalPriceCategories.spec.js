import { describe, expect, it } from "vitest";
import {
  SERVICE_FEE_UNIT,
  externalPriceTiers,
  externalServiceFee,
  hasExternalPrices,
} from "@/utils/externalPriceCategories";

/**
 * Since 4.3.x a provider's prices arrive as a flat array of
 * `{ priceEur, unit, external }` entries - the same array the checkout
 * prices with. The object with the provider's own German keys
 * (`Preis_1h`, `Preis_Servicegebühr`) is gone.
 */
describe("externalPriceCategories", () => {
  const tier = (unit, priceEur) => ({ priceEur, unit, external: true });

  describe("externalPriceTiers", () => {
    it("reads the tiers of the array answer", () => {
      const tiers = externalPriceTiers([tier("hour", 1.5), tier("day", 9)]);

      expect(tiers).toEqual([
        expect.objectContaining({ unit: "hour", priceEur: 1.5 }),
        expect.objectContaining({ unit: "day", priceEur: 9 }),
      ]);
    });

    it("orders the tiers from the shortest to the longest", () => {
      const tiers = externalPriceTiers([
        tier("year", 300),
        tier("minute", 0.05),
        tier("week", 40),
        tier("hour", 1.5),
      ]);

      expect(tiers.map((row) => row.unit)).toEqual([
        "minute",
        "hour",
        "week",
        "year",
      ]);
    });

    it("names a label key and an icon for every tier", () => {
      const [row] = externalPriceTiers([tier("month", 120)]);

      expect(row.labelKey).toBe("bookable.externalPrice.units.month");
      expect(row.icon).toMatch(/^mdi-/);
    });

    it("keeps the service fee out of the tiers", () => {
      const tiers = externalPriceTiers([
        tier("hour", 1.5),
        tier(SERVICE_FEE_UNIT, 2),
      ]);

      expect(tiers.map((row) => row.unit)).toEqual(["hour"]);
    });

    // The same route answers the bookable's own `priceCategories` when no
    // provider handles its pricing. Those carry no `unit` and no `external`,
    // and they are not what this panel is about.
    it("ignores categories the provider did not answer", () => {
      const tiers = externalPriceTiers([
        { priceEur: 7, interval: { start: null, end: null } },
        { priceEur: 3, unit: "hour" },
        tier("day", 9),
      ]);

      expect(tiers.map((row) => row.unit)).toEqual(["day"]);
    });

    it("ignores a unit it has no name for", () => {
      expect(externalPriceTiers([tier("fortnight", 5)])).toEqual([]);
    });

    it("ignores an entry without a usable price", () => {
      const tiers = externalPriceTiers([
        tier("hour", null),
        tier("day", "nope"),
        tier("week", "40.50"),
      ]);

      expect(tiers).toEqual([
        expect.objectContaining({ unit: "week", priceEur: 40.5 }),
      ]);
    });

    it("keeps one tile per unit", () => {
      const tiers = externalPriceTiers([tier("hour", 1.5), tier("hour", 2)]);

      expect(tiers).toEqual([
        expect.objectContaining({ unit: "hour", priceEur: 1.5 }),
      ]);
    });

    it("answers nothing for anything that is not an array", () => {
      expect(externalPriceTiers(null)).toEqual([]);
      expect(externalPriceTiers(undefined)).toEqual([]);
      expect(externalPriceTiers({ Preis_1h: "1,50" })).toEqual([]);
    });
  });

  describe("externalServiceFee", () => {
    it("reads the service fee entry", () => {
      expect(
        externalServiceFee([tier("hour", 1.5), tier("service-fee", 2)])
      ).toBe(2);
    });

    it("answers null when the provider charges none", () => {
      expect(externalServiceFee([tier("hour", 1.5)])).toBeNull();
      expect(externalServiceFee(null)).toBeNull();
    });

    it("ignores a service fee the provider did not answer", () => {
      expect(
        externalServiceFee([{ priceEur: 2, unit: SERVICE_FEE_UNIT }])
      ).toBeNull();
    });
  });

  describe("hasExternalPrices", () => {
    it("is true as soon as one tier or the fee is there", () => {
      expect(hasExternalPrices([tier("hour", 1.5)])).toBe(true);
      expect(hasExternalPrices([tier(SERVICE_FEE_UNIT, 2)])).toBe(true);
    });

    it("is false for an answer with nothing external in it", () => {
      expect(hasExternalPrices([])).toBe(false);
      expect(hasExternalPrices([{ priceEur: 7 }])).toBe(false);
      expect(hasExternalPrices(null)).toBe(false);
    });
  });
});
