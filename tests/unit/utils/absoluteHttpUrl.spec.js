import { describe, expect, it } from "vitest";
import { isAbsoluteHttpUrl } from "@/utils/absoluteHttpUrl";

describe("isAbsoluteHttpUrl", () => {
  it("takes an http or https address with a host", () => {
    expect(isAbsoluteHttpUrl("https://portal.example.org/start")).toBe(true);
    expect(isAbsoluteHttpUrl("http://localhost:3000")).toBe(true);
  });

  it("refuses a bare host, a relative path, another scheme and nothing", () => {
    for (const value of [
      "portal.example.org",
      "/start",
      "javascript:alert(1)",
      "mailto:info@example.org",
      "",
      null,
    ]) {
      expect(isAbsoluteHttpUrl(value)).toBe(false);
    }
  });
});
