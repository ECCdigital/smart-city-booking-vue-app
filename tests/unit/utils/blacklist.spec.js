import { describe, expect, it } from "vitest";
import { parseBlacklistValue } from "@/utils/blacklist";

/** The blacklist of the instance (glossary „Blacklist“, ECCdigital/tickets#625). */
describe("parseBlacklistValue", () => {
  it.each([
    ["max@firma.de", { value: "max@firma.de", kind: "address" }],
    ["  Max@FIRMA.de ", { value: "max@firma.de", kind: "address" }],
    ["max+news@firma.de", { value: "max+news@firma.de", kind: "address" }],
    ["@Wegwerf.de", { value: "@wegwerf.de", kind: "domain" }],
  ])("reads %j as the backend stores it", (input, parsed) => {
    expect(parseBlacklistValue(input)).toEqual(parsed);
  });

  it.each(["", "   ", "max", "wegwerf.de", "max@", "@", "a@b@c.de", null])(
    "takes %j for no address or domain",
    (input) => {
      expect(parseBlacklistValue(input)).toBe(null);
    }
  );
});
