import { describe, expect, it } from "vitest";
import {
  ALL_FORMATS,
  YES_NO,
  attendeesInRange,
  eventFilters,
} from "@/utils/eventFilters";
import { EVENT_FORMATS } from "@/utils/eventParticipationLink";

const filters = eventFilters((key) => key);
const byKey = (key) => filters.find((filter) => filter.key === key);

function event(attendees = {}, format) {
  return { attendees, format };
}

/** The filters of the event list. */
describe("eventFilters", () => {
  it("offers public, registration, free, format and attendees", () => {
    expect(filters.map((filter) => filter.key)).toEqual([
      "public",
      "registration",
      "free",
      "format",
      "attendees",
    ]);
  });

  it.each([
    ["public", "publicEvent"],
    ["registration", "needsRegistration"],
    ["free", "free"],
  ])("lets %s pick yes or no on attendees.%s", (key, field) => {
    const filter = byKey(key);
    expect(filter.empty).toBe(YES_NO.ALL);

    expect(filter.matches(event({ [field]: true }), YES_NO.YES)).toBe(true);
    expect(filter.matches(event({ [field]: false }), YES_NO.YES)).toBe(false);
    expect(filter.matches(event({ [field]: false }), YES_NO.NO)).toBe(true);
    expect(filter.matches(event({}), YES_NO.NO)).toBe(true);
  });

  it("matches the format picked, an event without one as presence", () => {
    const filter = byKey("format");
    expect(filter.empty).toBe(ALL_FORMATS);

    expect(
      filter.matches(event({}, EVENT_FORMATS.ONLINE), EVENT_FORMATS.ONLINE)
    ).toBe(true);
    expect(
      filter.matches(event({}, EVENT_FORMATS.HYBRID), EVENT_FORMATS.ONLINE)
    ).toBe(false);
    expect(filter.matches(event({}), EVENT_FORMATS.PRESENCE)).toBe(true);
  });

  it("filters the attendees on the maximum number", () => {
    const filter = byKey("attendees");

    expect(
      filter.matches(event({ maxAttendees: 30 }), { from: 20, to: 40 })
    ).toBe(true);
    expect(
      filter.matches(event({ maxAttendees: 10 }), { from: 20, to: 40 })
    ).toBe(false);
  });
});

describe("attendeesInRange", () => {
  it("reads von alone as at least and bis alone as at most", () => {
    expect(attendeesInRange(20, { from: 20, to: null })).toBe(true);
    expect(attendeesInRange(19, { from: 20, to: null })).toBe(false);
    expect(attendeesInRange(50, { from: null, to: 50 })).toBe(true);
    expect(attendeesInRange(51, { from: null, to: 50 })).toBe(false);
  });

  it("reads a number typed into the event form", () => {
    expect(attendeesInRange("25", { from: 20, to: 30 })).toBe(true);
  });

  it("leaves out an event without a maximum", () => {
    expect(attendeesInRange(null, { from: 0, to: null })).toBe(false);
    expect(attendeesInRange("", { from: null, to: 10 })).toBe(false);
  });
});
