import { describe, expect, it } from "vitest";
import {
  formatGermanDate,
  parseGermanDate,
  parseTime,
} from "@/utils/dateInput";

describe("formatGermanDate", () => {
  it("writes a stored date the German way", () => {
    expect(formatGermanDate("2026-11-21")).toBe("21.11.2026");
  });

  it("is empty without a date", () => {
    expect(formatGermanDate(null)).toBe("");
  });
});

describe("parseGermanDate", () => {
  it.each([
    ["21.11.2026", "2026-11-21"],
    ["29.02.2028", "2028-02-29"],
    ["31.11.2026", null],
    ["29.02.2027", null],
    ["21.11.26", null],
    ["21.11.", null],
    ["", null],
  ])("reads %s as %s", (text, expected) => {
    expect(parseGermanDate(text)).toBe(expected);
  });
});

describe("parseTime", () => {
  it.each([
    ["10:30", "10:30"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
    ["24:00", null],
    ["12:60", null],
    ["9:30", null],
    ["", null],
  ])("reads %s as %s", (text, expected) => {
    expect(parseTime(text)).toBe(expected);
  });
});
