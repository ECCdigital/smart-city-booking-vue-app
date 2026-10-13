import { describe, expect, it } from "vitest";
import { bookedViaLabel, bookedViaTitle } from "@/utils/bookedVia";

/** The Buchungsweg: how a booking was made, in the list, detail and XLSX. */
describe("bookedViaTitle", () => {
  it("reads Buchungsweg", () => {
    expect(bookedViaTitle()).toBe("Buchungsweg");
  });
});

describe("bookedViaLabel", () => {
  it.each([
    ["user", "Angemeldet"],
    ["guest", "Gast"],
    ["admin", "Admin"],
  ])("reads %s as %s", (code, label) => {
    expect(bookedViaLabel(code)).toBe(label);
  });

  it.each([["kiosk"], [null], [undefined], [""]])(
    "reads „Unbekannt“ for %s",
    (code) => {
      expect(bookedViaLabel(code)).toBe("Unbekannt");
    }
  );
});
