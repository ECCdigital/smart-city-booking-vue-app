import { describe, expect, it } from "vitest";
import {
  rateLimitMessage,
  rateLimitOf,
  retryAfterText,
} from "@/utils/rateLimit";

const refused = (status, data = {}, headers = {}) => ({
  response: { status, data, headers },
});

describe("rateLimitOf", () => {
  it("reads the wait from the Retry-After header", () => {
    expect(rateLimitOf(refused(429, {}, { "retry-after": "5400" }))).toEqual({
      wait: "1 Std. 30 Min.",
    });
  });

  it("falls back on the envelope's retryAfterSeconds", () => {
    expect(
      rateLimitOf(
        refused(429, {
          code: "too_many_requests",
          params: { retryAfterSeconds: 60 },
        })
      )
    ).toEqual({ wait: "1 Min." });
  });

  it("reads the envelope the BFF wraps into its own error", () => {
    expect(
      rateLimitOf(
        refused(429, {
          success: false,
          data: { params: { retryAfterSeconds: 120 } },
        })
      )
    ).toEqual({ wait: "2 Min." });
  });

  it("names no wait when the answer carries none", () => {
    expect(rateLimitOf(refused(429))).toEqual({ wait: "" });
    expect(rateLimitOf(refused(429, "Too many requests"))).toEqual({
      wait: "",
    });
  });

  it("is null for every other refusal", () => {
    expect(rateLimitOf(refused(403))).toBeNull();
    expect(rateLimitOf(new Error("offline"))).toBeNull();
    expect(rateLimitOf(undefined)).toBeNull();
  });
});

describe("rateLimitMessage", () => {
  it("names the wait, or says later without one", () => {
    expect(rateLimitMessage({ wait: "2 Min." })).toEqual({
      key: "auth.rate-limit.wait",
      params: { wait: "2 Min." },
    });
    expect(rateLimitMessage({ wait: "" })).toEqual({
      key: "auth.rate-limit.unknown",
      params: {},
    });
  });
});

describe("retryAfterText", () => {
  it("names hours and minutes until the next attempt", () => {
    expect(retryAfterText(2 * 3600 + 5 * 60)).toBe("2 Std. 5 Min.");
    expect(retryAfterText(90)).toBe("2 Min.");
    expect(retryAfterText(3600)).toBe("1 Std.");
    expect(retryAfterText(30)).toBe("1 Min.");
  });

  it("answers an empty text without a usable value", () => {
    expect(retryAfterText(undefined)).toBe("");
    expect(retryAfterText("abc")).toBe("");
    expect(retryAfterText(0)).toBe("");
  });
});
