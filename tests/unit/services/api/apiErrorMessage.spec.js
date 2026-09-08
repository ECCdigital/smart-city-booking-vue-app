import { describe, expect, it, vi } from "vitest";
import i18n from "@/language/index";
import { lifecycleError } from "@tests/unit/support/api";
import {
  getApiErrorMessage,
  isForbiddenError,
  isOutOfReach,
  shouldRefetch,
  unpackBlobErrorBody,
} from "@/services/api/apiErrorMessage";

const FALLBACK = "Fallback";
const FORBIDDEN = i18n.t("errors.forbidden-codes.forbidden");
const SESSION_EXPIRED = i18n.t("errors.session-expired");
const CONFLICT = "Der Vorgang ist in diesem Zustand nicht möglich.";

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

    it("reads `invalid_status_change` - unreachable once the PUT carries no flags, still named", () => {
      const error = lifecycleError(400, "invalid_status_change", {
        status: "confirmed",
        requested: "requested",
      });
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "Dieser Statuswechsel ist nicht möglich."
      );
    });

    it("names the payment a booking born paid is missing (spec E10)", () => {
      const error = lifecycleError(400, "missing_payment_details", {
        status: "confirmed",
        missing: ["paymentMethod", "timePaid"],
      });
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "Eine als bezahlt angelegte Buchung braucht Zahlungsart und Zahldatum."
      );
    });

    it("says a booking cannot be born in the state the create PUT named", () => {
      const error = lifecycleError(400, "invalid_status", {
        status: "cancelled",
      });
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "In diesem Zustand kann keine Buchung angelegt werden."
      );
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

    it("reads the customer route's `{ code, message }` form", () => {
      const error = {
        response: {
          status: 403,
          data: {
            code: "booking_user_cancellation_disabled",
            message: "User cancellation is disabled",
          },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "Diese Buchung kann nicht vom Buchenden storniert werden."
      );
    });
  });

  /**
   * The booking lifecycle answers a transition that no longer fits the stored
   * state with 409 (spec E5). The body comes in three forms: the full
   * `{ error, code, statusCode, params }`, the customer route's
   * `{ code, message }`, or nothing at all - and the reader has to name the
   * conflict in every one of them.
   */
  describe("on a 409 response", () => {
    it("names the state the booking is in now on `invalid_transition`", () => {
      const error = lifecycleError(409, "invalid_transition", {
        bookingId: "b1",
        status: "confirmed",
        transition: "confirm",
      });
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "Die Buchung ist inzwischen in einem anderen Zustand (Bestätigt)."
      );
    });

    it("omits the parenthesis when `params.status` is missing", () => {
      const error = lifecycleError(409, "invalid_transition", {
        bookingId: "b1",
      });
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "Die Buchung ist inzwischen in einem anderen Zustand."
      );
    });

    it("lists the diverging members of a group transition", () => {
      const error = lifecycleError(409, "invalid_transition", {
        bookingIds: ["b2", "b3"],
      });
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "Die Buchung ist inzwischen in einem anderen Zustand. Betroffene Buchungen: b2, b3"
      );
    });

    it("reads `not_cancelled`", () => {
      expect(
        getApiErrorMessage(lifecycleError(409, "not_cancelled"), FALLBACK)
      ).toBe("Die Buchung ist nicht storniert.");
    });

    it.each([
      ["a code without an entry", lifecycleError(409, "some_new_code")],
      [
        "the `{ code, message }` form with an unknown code",
        {
          response: {
            status: 409,
            data: { code: "booking_already_rejected", message: "Rejected" },
          },
        },
      ],
      ["an empty body", { response: { status: 409, data: "" } }],
      ["no body at all", { response: { status: 409 } }],
    ])("falls back to the generic conflict on %s", (_, error) => {
      expect(getApiErrorMessage(error, FALLBACK)).toBe(CONFLICT);
    });

    it("returns a readable string body as it is, like the 400 branch", () => {
      // Routes outside the lifecycle answer a 409 with a bare sentence; the
      // lifecycle's own 409s always carry a code.
      expect(
        getApiErrorMessage(
          { response: { status: 409, data: "  Konflikt  " } },
          FALLBACK
        )
      ).toBe("Konflikt");
    });

    it("reads the `{ code, message }` form when the code has an entry", () => {
      const error = {
        response: {
          status: 409,
          data: { code: "not_cancelled", message: "Booking is not cancelled" },
        },
      };
      expect(getApiErrorMessage(error, FALLBACK)).toBe(
        "Die Buchung ist nicht storniert."
      );
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

  describe("on a 404 response", () => {
    it("reads `booking_not_found` as a booking that is gone", () => {
      expect(
        getApiErrorMessage(lifecycleError(404, "booking_not_found"), FALLBACK)
      ).toBe("Die Buchung existiert nicht mehr.");
    });

    it("keeps the fallback for every other 404", () => {
      expect(
        getApiErrorMessage(lifecycleError(404, "some_other_code"), FALLBACK)
      ).toBe(FALLBACK);
      expect(getApiErrorMessage({ response: { status: 404 } }, FALLBACK)).toBe(
        FALLBACK
      );
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

/**
 * The predicate the list screens read. It answers one question - "was this
 * refused?" - and deliberately says nothing about an empty result: a 200 with
 * `[]` means "nothing there", a 403 means "no access", and the two must stay
 * tellable apart.
 *
 * Reading the status alone means the BFF's own CSRF 403 matches too. That is
 * pinned as the current imprecision, not endorsed: spec §E3 moves CSRF off 403
 * because a stale session is not a denial. No caller of this predicate can hit
 * it - the CSRF guard fires on writes only.
 */
describe("isForbiddenError", () => {
  it("is true for a 403, whatever the body looks like", () => {
    expect(
      isForbiddenError({
        response: {
          status: 403,
          data: {
            error: "ForbiddenError",
            code: "forbidden",
            statusCode: 403,
            params: {},
          },
        },
      })
    ).toBe(true);
    expect(isForbiddenError({ response: { status: 403 } })).toBe(true);
    // Known imprecision, see the block comment above.
    expect(
      isForbiddenError({
        response: { status: 403, data: { message: "CSRF check failed" } },
      })
    ).toBe(true);
  });

  it("is false for every other status", () => {
    expect(isForbiddenError({ response: { status: 401 } })).toBe(false);
    expect(isForbiddenError({ response: { status: 404 } })).toBe(false);
    expect(isForbiddenError({ response: { status: 500 } })).toBe(false);
  });

  it("is false when there is no response at all", () => {
    expect(isForbiddenError(new Error("Network Error"))).toBe(false);
    expect(isForbiddenError(undefined)).toBe(false);
    expect(isForbiddenError(null)).toBe(false);
  });
});

/**
 * Since 4.3.x a record the caller may not see answers 404 rather than 403, so
 * that its existence stays hidden. Wherever the UI only asks "may this be
 * shown at all?", the two statuses are one question.
 */
describe("isOutOfReach", () => {
  it("reads a denial as out of reach", () => {
    expect(isOutOfReach({ response: { status: 403 } })).toBe(true);
  });

  it("reads a 404 as out of reach too", () => {
    expect(isOutOfReach({ response: { status: 404 } })).toBe(true);
  });

  it("does not read any other status as out of reach", () => {
    expect(isOutOfReach({ response: { status: 401 } })).toBe(false);
    expect(isOutOfReach({ response: { status: 500 } })).toBe(false);
  });

  it("does not read an error without a response as out of reach", () => {
    expect(isOutOfReach(new Error("Network Error"))).toBe(false);
    expect(isOutOfReach(undefined)).toBe(false);
  });
});

/**
 * The refetch rule of spec E5: after every 409 and 404 the host reloads the
 * booking or the list, so that the screen shows the server's state again. The
 * predicate answers that one question; the message is `getApiErrorMessage`'s.
 */
describe("shouldRefetch", () => {
  it("is true after a 409, whatever the body", () => {
    expect(shouldRefetch(lifecycleError(409, "invalid_transition"))).toBe(true);
    expect(shouldRefetch({ response: { status: 409 } })).toBe(true);
  });

  it("is true after a 404", () => {
    expect(shouldRefetch(lifecycleError(404, "booking_not_found"))).toBe(true);
  });

  it("is false for every other status", () => {
    expect(shouldRefetch({ response: { status: 400 } })).toBe(false);
    expect(shouldRefetch({ response: { status: 403 } })).toBe(false);
    expect(shouldRefetch({ response: { status: 500 } })).toBe(false);
  });

  it("is false when there is no response at all", () => {
    expect(shouldRefetch(new Error("Network Error"))).toBe(false);
    expect(shouldRefetch(undefined)).toBe(false);
  });
});
