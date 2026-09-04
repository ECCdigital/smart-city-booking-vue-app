import { describe, expect, it, vi } from "vitest";
import i18n from "@/language/index";
import {
  getApiErrorMessage,
  unpackBlobErrorBody,
} from "@/services/api/apiErrorMessage";

const FALLBACK = "Fallback";
const FORBIDDEN = i18n.t("errors.forbidden-codes.forbidden");
const SESSION_EXPIRED = i18n.t("errors.session-expired");

/**
 * Characterisation: the 400 branch is unchanged by the permissions strand and
 * pinned here. The 403 branch was added for the 4.3.x error shape
 * `{ error, code, statusCode, params }`; the test that used to pin "a 403 body
 * is ignored" was rewritten in the same commit, deliberately.
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

  describe("on a 403 response", () => {
    it("translates the generic `forbidden` code", () => {
      const error = {
        response: {
          status: 403,
          data: {
            error: "ForbiddenError",
            code: "forbidden",
            statusCode: 403,
            params: {},
          },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(FORBIDDEN);
    });

    it("uses the generic message for a code without an entry", () => {
      const error = {
        response: {
          status: 403,
          data: {
            error: "ForbiddenError",
            code: "booking_already_rejected",
            statusCode: 403,
            params: {},
          },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(FORBIDDEN);
    });

    it("hands `params` to the translation", () => {
      const spy = vi.spyOn(i18n, "t");
      const params = { bookingId: "42" };
      getApiErrorMessage(
        {
          response: {
            status: 403,
            data: {
              error: "ForbiddenError",
              code: "forbidden",
              statusCode: 403,
              params,
            },
          },
        },
        FALLBACK
      );
      expect(spy).toHaveBeenCalledWith(
        "errors.forbidden-codes.forbidden",
        params
      );
    });

    it("survives `params` that are not an object", () => {
      const error = {
        response: {
          status: 403,
          data: {
            error: "ForbiddenError",
            code: "forbidden",
            statusCode: 403,
            params: "nonsense",
          },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(FORBIDDEN);
    });

    it("treats a 403 without the new shape as a generic denial", () => {
      // Kept as the fallback for a deployment still running an older BFF,
      // which answered a stale CSRF token with a 403 of its own. A current
      // BFF sends 419 for that — see the 419 block below.
      expect(
        getApiErrorMessage(
          {
            response: {
              status: 403,
              data: { success: false, message: "CSRF check failed" },
            },
          },
          FALLBACK
        )
      ).toBe(FORBIDDEN);
      expect(
        getApiErrorMessage(
          { response: { status: 403, data: "Forbidden" } },
          FALLBACK
        )
      ).toBe(FORBIDDEN);
      expect(getApiErrorMessage({ response: { status: 403 } }, FALLBACK)).toBe(
        FORBIDDEN
      );
    });

    it("ignores a `code` that does not come with `statusCode` 403", () => {
      const error = {
        response: {
          status: 403,
          data: { code: "some_other_code", statusCode: 400 },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(FORBIDDEN);
    });
  });

  describe("on a 419 response", () => {
    it("reads the BFF's stale-CSRF answer as an expired session", () => {
      const error = {
        response: {
          status: 419,
          data: { success: false, message: "CSRF check failed" },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(SESSION_EXPIRED);
      expect(getApiErrorMessage(error, FALLBACK)).not.toBe(FORBIDDEN);
    });

    it("ignores the body — every 419 means the same thing", () => {
      expect(getApiErrorMessage({ response: { status: 419 } }, FALLBACK)).toBe(
        SESSION_EXPIRED
      );
      expect(
        getApiErrorMessage(
          { response: { status: 419, data: "Page Expired" } },
          FALLBACK
        )
      ).toBe(SESSION_EXPIRED);
    });
  });

  describe("on any other status", () => {
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

function blobError(body, { status = 403, type = "application/json" } = {}) {
  const error = new Error("Request failed with status code " + status);
  error.response = { status, data: new Blob([body], { type }) };
  return error;
}

describe("unpackBlobErrorBody", () => {
  it("returns the error untouched when the body is not a Blob", async () => {
    const error = { response: { status: 403, data: { code: "forbidden" } } };
    await expect(unpackBlobErrorBody(error)).resolves.toBe(error);
  });

  it("returns errors without a response untouched", async () => {
    const error = new Error("Network Error");
    await expect(unpackBlobErrorBody(error)).resolves.toBe(error);
    await expect(unpackBlobErrorBody(undefined)).resolves.toBeUndefined();
  });

  it("parses a JSON body", async () => {
    const unpacked = await unpackBlobErrorBody(
      blobError(JSON.stringify({ error: "ForbiddenError", code: "forbidden" }))
    );
    expect(unpacked.response.data).toEqual({
      error: "ForbiddenError",
      code: "forbidden",
    });
    expect(unpacked.response.status).toBe(403);
  });

  it("returns a non-JSON body as trimmed text", async () => {
    const unpacked = await unpackBlobErrorBody(
      blobError("  Template is invalid  ", {
        status: 400,
        type: "text/plain",
      })
    );
    expect(unpacked.response.data).toBe("Template is invalid");
  });

  it("returns null for an empty body", async () => {
    const unpacked = await unpackBlobErrorBody(blobError("   "));
    expect(unpacked.response.data).toBeNull();
  });

  it("returns null when the Blob cannot be read", async () => {
    const error = new Error("boom");
    const blob = new Blob(["{}"]);
    vi.spyOn(blob, "text").mockRejectedValue(new Error("unreadable"));
    error.response = { status: 403, data: blob };
    const unpacked = await unpackBlobErrorBody(error);
    expect(unpacked.response.data).toBeNull();
  });

  it("keeps the axios message reachable", async () => {
    const unpacked = await unpackBlobErrorBody(blobError("{}"));
    expect(unpacked.message).toBe("Request failed with status code 403");
  });

  it("makes a blob 419 readable for getApiErrorMessage", async () => {
    const unpacked = await unpackBlobErrorBody(
      blobError(
        JSON.stringify({ success: false, message: "CSRF check failed" }),
        {
          status: 419,
        }
      )
    );
    expect(getApiErrorMessage(unpacked, FALLBACK)).toBe(SESSION_EXPIRED);
  });

  it("makes a blob 403 readable for getApiErrorMessage", async () => {
    const unpacked = await unpackBlobErrorBody(
      blobError(
        JSON.stringify({
          error: "ForbiddenError",
          code: "forbidden",
          statusCode: 403,
          params: {},
        })
      )
    );
    expect(getApiErrorMessage(unpacked, FALLBACK)).toBe(FORBIDDEN);
  });
});
