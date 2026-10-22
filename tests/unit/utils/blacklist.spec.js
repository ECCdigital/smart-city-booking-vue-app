import { describe, expect, it, vi } from "vitest";
import {
  addressesToCheck,
  blacklistedAmong,
  parseBlacklistValue,
} from "@/utils/blacklist";
import ApiBlacklistService from "@/services/api/ApiBlacklistService";

vi.mock("@/services/api/ApiBlacklistService", () => ({
  default: { isBlacklisted: vi.fn() },
}));

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

/** The warning of the administration's ways (ECCdigital/tickets#629). */
describe("addressesToCheck", () => {
  it("checks the mail of a new booking", () => {
    expect(addressesToCheck(" Max@firma.de ")).toEqual(["max@firma.de"]);
  });

  it("checks each address of a list for itself", () => {
    expect(
      addressesToCheck("max@firma.de, eva@firma.de\nmax@firma.de")
    ).toEqual(["max@firma.de", "eva@firma.de"]);
  });

  it("checks only the addresses a changed mail adds", () => {
    expect(
      addressesToCheck("max@firma.de, eva@firma.de", "MAX@firma.de")
    ).toEqual(["eva@firma.de"]);
  });

  it.each([
    ["max@firma.de", "max@firma.de"],
    [" MAX@firma.de", "max@firma.de "],
    ["max@firma.de", "eva@firma.de, max@firma.de"],
  ])("checks nothing of %j when it was %j", (mail, before) => {
    expect(addressesToCheck(mail, before)).toEqual([]);
  });

  it.each(["", "   ", " , ", null, undefined])(
    "checks nothing of %j",
    (mail) => {
      expect(addressesToCheck(mail)).toEqual([]);
    }
  );
});

describe("blacklistedAmong", () => {
  it("names the addresses the blacklist hits, asked for each by the way", async () => {
    ApiBlacklistService.isBlacklisted.mockImplementation(
      async (way, address) => address === "max@firma.de"
    );

    const hits = await blacklistedAmong(
      "tenantUser",
      ["anna@firma.de", "max@firma.de"],
      "t1"
    );

    expect(hits).toEqual(["max@firma.de"]);
    expect(ApiBlacklistService.isBlacklisted).toHaveBeenCalledWith(
      "tenantUser",
      "anna@firma.de",
      "t1"
    );
  });

  it("takes a failed question for no hit: a warning never stops a save", async () => {
    ApiBlacklistService.isBlacklisted.mockRejectedValue(new Error("403"));

    expect(
      await blacklistedAmong("bookingMail", ["max@firma.de"], "t1")
    ).toEqual([]);
  });
});
