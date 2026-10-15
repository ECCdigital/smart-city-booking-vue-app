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
