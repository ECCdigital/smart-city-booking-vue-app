import { describe, expect, it } from "vitest";
import {
  capacityMismatch,
  compartmentsAt,
  isCompartmentAmount,
  prunedAmounts,
  withCompartmentsAt,
} from "@/utilities/access-point-amounts";

function details(overrides = {}) {
  return {
    active: true,
    accessBuffer: { before: 0, after: 0 },
    accessPointIds: [],
    accessPointAmounts: {},
    ...overrides,
  };
}

/**
 * `accessPointDetails.accessPointAmounts` distributes the bookable's `amount`
 * over its locker systems: the number is owed once in total, not at every
 * system again. The field sits beside the flat `accessPointIds` rather than
 * replacing it, because a door carries no amount and must not notice the
 * change (locker spec §L2.1).
 */
describe("access point amounts", () => {
  describe("isCompartmentAmount", () => {
    it("accepts whole, non-negative numbers - zero included", () => {
      expect(isCompartmentAmount(0)).toBe(true);
      expect(isCompartmentAmount(4)).toBe(true);
      expect(isCompartmentAmount("4")).toBe(true);
    });

    it("rejects everything that is no number of compartments", () => {
      expect(isCompartmentAmount(undefined)).toBe(false);
      expect(isCompartmentAmount(null)).toBe(false);
      expect(isCompartmentAmount("")).toBe(false);
      expect(isCompartmentAmount(-1)).toBe(false);
      expect(isCompartmentAmount(2.5)).toBe(false);
      expect(isCompartmentAmount("zwei")).toBe(false);
    });
  });

  describe("compartmentsAt", () => {
    it("reads the amount distributed to one access point", () => {
      const value = compartmentsAt(
        details({ accessPointAmounts: { "ap-1": 3 } }),
        "ap-1"
      );

      expect(value).toBe(3);
    });

    /**
     * Nothing distributed is not zero: the backend falls back to what the
     * booking's item books, so an empty cell means "as before", not "no
     * compartment".
     */
    it("answers null where nothing is distributed", () => {
      expect(compartmentsAt(details(), "ap-1")).toBeNull();
      expect(compartmentsAt(undefined, "ap-1")).toBeNull();
      expect(
        compartmentsAt(details({ accessPointAmounts: { "ap-1": "" } }), "ap-1")
      ).toBeNull();
    });
  });

  describe("withCompartmentsAt", () => {
    it("sets a whole amount and leaves the other entries alone", () => {
      const amounts = withCompartmentsAt(
        details({ accessPointAmounts: { "ap-1": 3 } }),
        "ap-2",
        "5"
      );

      expect(amounts).toEqual({ "ap-1": 3, "ap-2": 5 });
    });

    it("drops the entry when the field is cleared", () => {
      const amounts = withCompartmentsAt(
        details({ accessPointAmounts: { "ap-1": 3, "ap-2": 5 } }),
        "ap-2",
        ""
      );

      expect(amounts).toEqual({ "ap-1": 3 });
    });

    /**
     * The buffer fields of the same tab normalize on input rather than
     * refusing; the amount follows them, so nothing the backend answers
     * `invalid_amount` for can leave this screen.
     */
    it("normalizes a fractional or negative entry the way the buffers do", () => {
      const fractional = withCompartmentsAt(details(), "ap-1", "2.7");
      expect(fractional).toEqual({ "ap-1": 2 });

      const negative = withCompartmentsAt(details(), "ap-1", "-3");
      expect(negative).toEqual({ "ap-1": 0 });
    });

    it("drops the entry for a value that is no number at all", () => {
      const amounts = withCompartmentsAt(
        details({ accessPointAmounts: { "ap-1": 3 } }),
        "ap-1",
        "zwei"
      );

      expect(amounts).toEqual({});
    });

    it("does not write into the stored map", () => {
      const stored = details({ accessPointAmounts: { "ap-1": 3 } });

      withCompartmentsAt(stored, "ap-2", "5");

      expect(stored.accessPointAmounts).toEqual({ "ap-1": 3 });
    });
  });

  describe("prunedAmounts", () => {
    it("keeps only the entries the bookable still references", () => {
      const amounts = prunedAmounts({ "ap-1": 3, "ap-2": 5 }, ["ap-1"]);

      expect(amounts).toEqual({ "ap-1": 3 });
    });

    it("drops entries that are no number of compartments", () => {
      const amounts = prunedAmounts({ "ap-1": 3, "ap-2": "zwei" }, [
        "ap-1",
        "ap-2",
      ]);

      expect(amounts).toEqual({ "ap-1": 3 });
    });

    it("answers an empty map for anything that is no amounts map", () => {
      expect(prunedAmounts(undefined, ["ap-1"])).toEqual({});
      expect(prunedAmounts([3, 5], ["ap-1"])).toEqual({});
      expect(prunedAmounts({ "ap-1": 3 }, undefined)).toEqual({});
    });

    it("leaves the given map alone", () => {
      const stored = { "ap-1": 3, "ap-2": 5 };

      prunedAmounts(stored, ["ap-1"]);

      expect(stored).toEqual({ "ap-1": 3, "ap-2": 5 });
    });
  });

  describe("capacityMismatch", () => {
    const bookable = (amount, accessPointAmounts) => ({
      amount,
      accessPointDetails: details({
        accessPointIds: Object.keys(accessPointAmounts),
        accessPointAmounts,
      }),
    });

    it("is silent while the distribution adds up to the capacity", () => {
      expect(
        capacityMismatch(bookable(12, { "ap-1": 5, "ap-2": 7 }), [
          "ap-1",
          "ap-2",
        ])
      ).toBeNull();
    });

    it("names both numbers when they disagree", () => {
      expect(
        capacityMismatch(bookable(12, { "ap-1": 3, "ap-2": 4 }), [
          "ap-1",
          "ap-2",
        ])
      ).toEqual({ distributed: 7, capacity: 12 });
    });

    /**
     * A bookable saved before the field existed distributes nothing; the
     * backend then hands every system what the booking's item books, exactly
     * as it did before. Warning about that would be a false alarm.
     */
    it("is silent while nothing is distributed at all", () => {
      expect(capacityMismatch(bookable(12, {}), ["ap-1"])).toBeNull();
    });

    /**
     * A partly filled distribution is worth the warning: the systems left
     * empty fall back to the booking's item, which is not what the sum says.
     */
    it("counts only what is distributed, and warns while that is short", () => {
      expect(
        capacityMismatch(bookable(12, { "ap-1": 5 }), ["ap-1", "ap-2"])
      ).toEqual({ distributed: 5, capacity: 12 });
    });

    it("ignores amounts of access points that are no longer assigned", () => {
      expect(
        capacityMismatch(bookable(5, { "ap-1": 5, "ap-2": 7 }), ["ap-1"])
      ).toBeNull();
    });

    /**
     * An empty capacity means unlimited - there is no number to compare the
     * distribution against, so the UI says nothing rather than inventing one.
     */
    it("is silent without a capacity to compare against", () => {
      expect(
        capacityMismatch(bookable(null, { "ap-1": 5 }), ["ap-1"])
      ).toBeNull();
    });
  });
});
