import { describe, expect, it } from "vitest";
import Tenant from "@/entities/tenant";

describe("Tenant — the short description", () => {
  it("carries the short description", () => {
    expect(new Tenant({ name: "Verein", description: "Sport." })).toMatchObject(
      { description: "Sport." }
    );
  });

  it("defaults to an empty text", () => {
    expect(new Tenant({ name: "Verein" }).description).toBe("");
  });
});

describe("Tenant — the refund of a booking without a time span", () => {
  it("carries the configured percentage", () => {
    expect(
      new Tenant({ cancellationRefundPercentageWithoutTimeSpan: 0 })
        .cancellationRefundPercentageWithoutTimeSpan
    ).toBe(0);
  });

  it("defaults to a full refund", () => {
    expect(
      new Tenant({ name: "Verein" }).cancellationRefundPercentageWithoutTimeSpan
    ).toBe(100);
  });
});
