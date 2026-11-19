import { describe, expect, it } from "vitest";
import { isAbsoluteHttpUrl, toAbsoluteHttpUrl } from "@/utils/absoluteHttpUrl";

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

describe("toAbsoluteHttpUrl", () => {
  it("anchors a path on the current origin", () => {
    expect(toAbsoluteHttpUrl("/admin/api/x")).toBe(
      `${window.location.origin}/admin/api/x`
    );
  });

  it("gives a protocol-relative address the current scheme", () => {
    expect(toAbsoluteHttpUrl("//api.example.org/x")).toBe(
      `${window.location.protocol}//api.example.org/x`
    );
  });

  it("leaves an absolute address unchanged", () => {
    expect(toAbsoluteHttpUrl("https://api.example.org/x")).toBe(
      "https://api.example.org/x"
    );
  });
});
