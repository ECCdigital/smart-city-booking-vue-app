import { describe, expect, it } from "vitest";
import {
  EVENT_FORMATS,
  hasValidParticipationLink,
  isHttpsUrl,
  needsParticipationLink,
} from "@/utils/eventParticipationLink";

const event = (format, url) => ({ format, eventLocation: { url } });

describe("needsParticipationLink", () => {
  it.each([
    [EVENT_FORMATS.PRESENCE, false],
    [EVENT_FORMATS.HYBRID, true],
    [EVENT_FORMATS.ONLINE, true],
    [undefined, false],
  ])("format %s needs a link: %s", (format, expected) => {
    expect(needsParticipationLink(format)).toBe(expected);
  });
});

describe("isHttpsUrl", () => {
  it.each([
    "https://meet.example/abc",
    "https://meet.example.com/j/123?pwd=x",
    "https://sub.meet.example:8443/room",
  ])("takes %s", (value) => {
    expect(isHttpsUrl(value)).toBe(true);
  });

  it.each([
    ["an http address", "http://meet.example/abc"],
    ["an address without scheme", "meet.example/abc"],
    ["a scheme alone", "https://"],
    ["a host without a domain", "https://meet"],
    ["a blank inside", "https://meet.example/a b"],
    ["a blank around", " https://meet.example/abc"],
    ["another scheme", "ftp://meet.example/abc"],
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("refuses %s", (_label, value) => {
    expect(isHttpsUrl(value)).toBe(false);
  });
});

describe("hasValidParticipationLink", () => {
  it("lets a presence event go without a link", () => {
    expect(hasValidParticipationLink(event(EVENT_FORMATS.PRESENCE, ""))).toBe(
      true
    );
  });

  it.each([EVENT_FORMATS.HYBRID, EVENT_FORMATS.ONLINE])(
    "holds format %s back without a valid link",
    (format) => {
      expect(hasValidParticipationLink(event(format, ""))).toBe(false);
      expect(hasValidParticipationLink(event(format, undefined))).toBe(false);
      expect(
        hasValidParticipationLink(event(format, "http://meet.example/abc"))
      ).toBe(false);
      expect(
        hasValidParticipationLink(event(format, "https://meet.example/abc"))
      ).toBe(true);
    }
  );

  it("reads a stored event without eventLocation as missing the link", () => {
    expect(hasValidParticipationLink({ format: EVENT_FORMATS.ONLINE })).toBe(
      false
    );
  });
});
