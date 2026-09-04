import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

const FALLBACK = "Fallback";

/**
 * Characterisation: today `getApiErrorMessage` only looks at the response body
 * when the status is exactly 400. Every other status - 403 included - returns
 * the fallback untouched. Pinned here before the permissions strand changes it.
 */
describe("getApiErrorMessage", () => {
  describe("on a 400 response", () => {
    it("returns a trimmed plain-text body", () => {
      const error = {
        response: { status: 400, data: "  Invalid template  " },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe("Invalid template");
    });

    it("returns a trimmed `message` field", () => {
      const error = {
        response: { status: 400, data: { message: "  Field missing  " } },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe("Field missing");
    });

    it("falls back on a blank body", () => {
      expect(
        getApiErrorMessage({ response: { status: 400, data: "   " } }, FALLBACK)
      ).toBe(FALLBACK);
      expect(
        getApiErrorMessage(
          { response: { status: 400, data: { message: "   " } } },
          FALLBACK
        )
      ).toBe(FALLBACK);
    });

    it("falls back on a body that is neither string nor `message`", () => {
      const error = {
        response: { status: 400, data: { error: "ValidationError" } },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
    });
  });

  describe("on any other status", () => {
    it("ignores a 403 body entirely", () => {
      const error = {
        response: {
          status: 403,
          data: {
            error: "ForbiddenError",
            code: "forbidden",
            statusCode: 403,
            message: "Not permitted",
          },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
    });

    it("ignores a 404 and a 500 body", () => {
      expect(
        getApiErrorMessage(
          { response: { status: 404, data: "Not found" } },
          FALLBACK
        )
      ).toBe(FALLBACK);
      expect(
        getApiErrorMessage(
          { response: { status: 500, data: { message: "Server error" } } },
          FALLBACK
        )
      ).toBe(FALLBACK);
    });
  });

  it("falls back when there is no response at all", () => {
    expect(getApiErrorMessage(new Error("Network Error"), FALLBACK)).toBe(
      FALLBACK
    );
    expect(getApiErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(getApiErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });

  it("passes the fallback through unchanged, whatever it is", () => {
    expect(getApiErrorMessage(undefined, undefined)).toBeUndefined();
  });
});
