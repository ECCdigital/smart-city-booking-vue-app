import { describe, expect, it } from "vitest";
import FormatService from "@/services/FormatService";

/** The admin's stamp on a booking: date and time in one, German short form. */
describe("FormatService.dateTime", () => {
  const stamp = new Date(2023, 10, 15, 0, 13);

  it("reads a Date as „15.11.23, 00:13“", () => {
    expect(FormatService.dateTime(stamp)).toBe("15.11.23, 00:13");
  });

  it("reads a timestamp and an ISO string the same way", () => {
    expect(FormatService.dateTime(stamp.getTime())).toBe("15.11.23, 00:13");
    expect(FormatService.dateTime(stamp.toISOString())).toBe("15.11.23, 00:13");
  });

  it("reads nothing as an empty string", () => {
    expect(FormatService.dateTime(null)).toBe("");
    expect(FormatService.dateTime(undefined)).toBe("");
    expect(FormatService.dateTime("")).toBe("");
    expect(FormatService.dateTime(0)).toBe("");
  });
});
