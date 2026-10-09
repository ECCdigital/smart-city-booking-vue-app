import { describe, expect, it } from "vitest";
import { criterionColor, isCriterionMissing } from "@/utils/tenantReadiness";

describe("isCriterionMissing", () => {
  const readiness = {
    criteria: [
      { key: "payment", state: "missing" },
      { key: "legal", state: "fulfilled" },
    ],
  };

  it("finds a criterion the check reports as missing", () => {
    expect(isCriterionMissing(readiness, "payment")).toBe(true);
    expect(isCriterionMissing(readiness, "legal")).toBe(false);
  });

  it("reads an absent criterion or answer as not missing", () => {
    expect(isCriterionMissing(readiness, "contact")).toBe(false);
    expect(isCriterionMissing({}, "payment")).toBe(false);
    expect(isCriterionMissing(null, "payment")).toBe(false);
  });
});

describe("criterionColor", () => {
  it("colours a criterion by its state, an unknown one grey", () => {
    expect(criterionColor("fulfilled")).toBe("success");
    expect(criterionColor("missing")).toBe("warning");
    expect(criterionColor("unknown")).toBe("grey");
  });
});
