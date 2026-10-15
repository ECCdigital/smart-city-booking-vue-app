import { describe, expect, it } from "vitest";
import { contrastOf } from "@/utils/brandingContrast";

/**
 * The copy of the storefront's contrast rule (Theme-CSS, map #510): luma
 * above 180 gives black, otherwise white, computed only from `#rgb` and
 * `#rrggbb`. The cases are those of the storefront's `themeCss.test.ts`.
 */
describe("contrastOf", () => {
  it.each([
    ["#ffffff", "#000000"],
    ["#FFD54F", "#000000"],
    ["#f59e0b", "#ffffff"],
    ["#1976d2", "#ffffff"],
    ["#000000", "#ffffff"],
    ["#FF8B00", "#ffffff"],
  ])("reads %s in #rrggbb as %s", (color, expected) => {
    expect(contrastOf(color)).toBe(expected);
  });

  it.each([
    ["#fff", "#000000"],
    ["#FE0", "#000000"],
    ["#000", "#ffffff"],
    ["#36c", "#ffffff"],
  ])("reads %s in #rgb as %s", (color, expected) => {
    expect(contrastOf(color)).toBe(expected);
  });

  it("puts black on a colour just above the threshold and white on one at it", () => {
    // luma 181 and 180, grey values give luma = value
    expect(contrastOf("#b5b5b5")).toBe("#000000");
    expect(contrastOf("#b4b4b4")).toBe("#ffffff");
  });

  it.each([
    ["white"],
    ["yellow"],
    ["rgb(255, 255, 255)"],
    ["#ffffffff"],
    ["#ffff"],
    ["ffffff"],
    [""],
    [null],
    [undefined],
  ])("gives white for %j, which is no #rgb or #rrggbb", (color) => {
    expect(contrastOf(color)).toBe("#ffffff");
  });
});
