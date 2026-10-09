import { describe, expect, it } from "vitest";
import {
  bookingModeOf,
  usesLeadTime,
  usesOpeningHours,
} from "@/utils/bookableBookingMode";

const schedule = { isScheduleRelated: true };
const timePeriod = { isTimePeriodRelated: true };
const blockPeriod = { isBlockPeriodRelated: true };
const week = { isLongRange: true, longRangeOptions: { type: "week" } };

describe("bookingModeOf", () => {
  it("reads the Buchungsart from the flags", () => {
    expect(
      [schedule, timePeriod, blockPeriod, week, {}].map(bookingModeOf)
    ).toEqual(["schedule", "timePeriod", "blockPeriod", "week", "independent"]);
  });
});

describe("the rules of the Buchungsart", () => {
  it("offers opening hours where a time is picked within a day", () => {
    expect(
      [schedule, timePeriod, blockPeriod, week].map(usesOpeningHours)
    ).toEqual([true, true, false, false]);
  });

  it("takes a Vorlaufzeit where a booking starts at a known time", () => {
    expect(
      [schedule, timePeriod, blockPeriod, week, {}].map(usesLeadTime)
    ).toEqual([true, true, true, false, false]);
  });
});
