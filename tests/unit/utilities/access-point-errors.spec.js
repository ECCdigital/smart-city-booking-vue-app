import { describe, expect, it } from "vitest";
import i18n from "@/language/index";
import {
  formatAccessPointErrorMessage,
  splitAccessPointFieldError,
} from "@/utilities/access-point-errors";

const GENERIC = i18n.t("accessPoint.management.errors.generic");
const NOT_FOUND_OR_FORBIDDEN = i18n.t(
  "accessPoint.management.errors.notFoundOrForbidden"
);
const CENTRAL_FORBIDDEN = i18n.t("errors.forbidden-codes.forbidden");

function apiError(status, data) {
  return { response: { status, data } };
}

/**
 * The one real 403/404 switch in the UI, shared by six callers (access point
 * list, delete, save, rotate, QR download, location prefill, bookable save).
 *
 * Since 4.3.x the backend answers a record outside the caller's reach with a
 * 404 instead of a 403, so that the existence of a foreign record stays
 * hidden. A 404 therefore means either "gone" or "not yours", and the helper
 * may claim neither.
 */
describe("formatAccessPointErrorMessage", () => {
  describe("on a 400 detail list", () => {
    /**
     * The mode check of the PUT: a lock that cannot be put into the requested
     * mode answers a 400 detail on `mode`, read through the `fieldInvalid`
     * form like every other detail.
     */
    it("says a lock does not support the chosen mode", () => {
      const error = apiError(400, {
        error: "ValidationError",
        message: "validation_failed",
        statusCode: 400,
        details: [
          {
            field: "mode",
            code: "unsupported_mode",
            params: { mode: "remote", supportedModes: ["local"] },
          },
        ],
      });
      expect(formatAccessPointErrorMessage(error)).toBe(
        "Modus: Dieses Schloss unterstützt den gewählten Modus nicht."
      );
    });

    /**
     * The Öffnungsart check of the PUT faults `config.openAction` twice over:
     * a value outside the vocabulary reads through the same `fieldInvalid`
     * form as every other detail, while one the lock cannot carry out gets a
     * formatter of its own - the raw code names neither what was asked for
     * nor what the lock can do.
     */
    it("names the field of an Öffnungsart outside the vocabulary", () => {
      const error = apiError(400, {
        error: "ValidationError",
        message: "validation_failed",
        statusCode: 400,
        details: [{ field: "config.openAction", code: "unknown_open_action" }],
      });
      expect(formatAccessPointErrorMessage(error)).toBe(
        "Öffnungsart: Unzulässiger Wert"
      );
    });

    it("says which Öffnungsarten the lock does support", () => {
      const error = apiError(400, {
        error: "ValidationError",
        message: "validation_failed",
        statusCode: 400,
        details: [
          {
            field: "config.openAction",
            code: "unsupported_open_action",
            params: {
              openAction: "lock_n_go",
              deviceType: 1,
              supportedOpenActions: ["auto", "unlock"],
            },
          },
        ],
      });
      expect(formatAccessPointErrorMessage(error)).toBe(
        "Die Öffnungsart „Lock'n'Go“ unterstützt dieses Schloss nicht. " +
          "Möglich sind: Automatisch, Aufschließen."
      );
    });

    /**
     * An older backend may name an Öffnungsart this UI has no label for; the
     * raw value is still something the admin can quote.
     */
    it("falls back to the raw values it has no label for", () => {
      const error = apiError(400, {
        error: "ValidationError",
        message: "validation_failed",
        statusCode: 400,
        details: [
          {
            field: "config.openAction",
            code: "unsupported_open_action",
            params: {
              openAction: "hyperspace",
              supportedOpenActions: ["auto", "warp"],
            },
          },
        ],
      });
      expect(formatAccessPointErrorMessage(error)).toBe(
        "Die Öffnungsart „hyperspace“ unterstützt dieses Schloss nicht. " +
          "Möglich sind: Automatisch, warp."
      );
    });

    it("leaves out the list when the backend names no alternative", () => {
      const error = apiError(400, {
        error: "ValidationError",
        message: "validation_failed",
        statusCode: 400,
        details: [
          {
            field: "config.openAction",
            code: "unsupported_open_action",
            params: { openAction: "unlatch" },
          },
        ],
      });
      expect(formatAccessPointErrorMessage(error)).toBe(
        "Die Öffnungsart „Falle ziehen“ unterstützt dieses Schloss nicht."
      );
    });
  });

  describe("on a 404 response", () => {
    it("stays neutral between a deleted and an out-of-reach record", () => {
      expect(formatAccessPointErrorMessage(apiError(404, {}))).toBe(
        NOT_FOUND_OR_FORBIDDEN
      );
    });

    it("does not tell the admin to reload the list", () => {
      expect(formatAccessPointErrorMessage(apiError(404, {}))).not.toMatch(
        /neu ?laden/i
      );
    });

    it("keeps its neutral wording for every caller's fallback key", () => {
      expect(
        formatAccessPointErrorMessage(apiError(404, {}), {
          fallbackKey: "accessPoint.management.qr.error",
        })
      ).toBe(NOT_FOUND_OR_FORBIDDEN);
    });

    it("still prefers a detail list the API sent along", () => {
      const error = apiError(404, {
        details: [
          { code: "unknown_access_point", params: { accessPointId: "ap-1" } },
        ],
      });
      expect(formatAccessPointErrorMessage(error)).toContain("ap-1");
    });
  });

  describe("on a 403 response", () => {
    it("uses the caller's own sentence when it has one", () => {
      expect(
        formatAccessPointErrorMessage(apiError(403, {}), {
          forbiddenKey: "accessPoint.bookable.readForbidden",
        })
      ).toBe(i18n.t("accessPoint.bookable.readForbidden"));
    });

    it("falls back to the access point denial for callers without one", () => {
      expect(formatAccessPointErrorMessage(apiError(403, {}))).toBe(
        i18n.t("accessPoint.management.errors.forbidden")
      );
    });
  });

  /**
   * The helper hands everything it does not decide itself to
   * `getApiErrorMessage`, so a status the central reader learns later - the
   * BFF's own status for a stale CSRF token - arrives here without a third
   * status check being added.
   */
  describe("statuses it does not decide itself", () => {
    it("keeps its own reading of a bad request", () => {
      expect(formatAccessPointErrorMessage(apiError(400, "Kaputt"))).toBe(
        "Kaputt"
      );
    });

    /**
     * `validation_failed` is a token, not a sentence. The helper drops it in
     * favour of the caller's own message, and handing a 400 to the central
     * reader first would put the token back on the screen.
     */
    it("still drops the bare validation token of a bad request", () => {
      const error = apiError(400, { message: "validation_failed" });
      expect(formatAccessPointErrorMessage(error)).toBe(GENERIC);
    });

    it("inherits any status the central reader translates", () => {
      const error = apiError(403, {
        error: "ForbiddenError",
        code: "forbidden",
        statusCode: 403,
        params: {},
      });
      expect(formatAccessPointErrorMessage(error, { forbiddenKey: null })).toBe(
        CENTRAL_FORBIDDEN
      );
    });
  });

  describe("on anything else", () => {
    it("returns a bare string body", () => {
      expect(formatAccessPointErrorMessage(apiError(409, "Konflikt"))).toBe(
        "Konflikt"
      );
    });

    it("returns the fallback for an error without a response", () => {
      expect(formatAccessPointErrorMessage(new Error("Network Error"))).toBe(
        GENERIC
      );
    });
  });
});

/**
 * A form that edits one field in a control of its own asks where a failed save
 * belongs: at that control, or in the alert under the form.
 */
describe("splitAccessPointFieldError", () => {
  const FIELD = "config.openAction";

  function badRequest(details) {
    return apiError(400, {
      error: "ValidationError",
      message: "validation_failed",
      statusCode: 400,
      details,
    });
  }

  it("puts a fault of the field at the field and leaves the alert empty", () => {
    const split = splitAccessPointFieldError(
      badRequest([{ field: FIELD, code: "unknown_open_action" }]),
      FIELD
    );

    expect(split).toEqual({
      fieldMessage: "Öffnungsart: Unzulässiger Wert",
      message: "",
    });
  });

  it("keeps a fault of another field in the alert", () => {
    const split = splitAccessPointFieldError(
      badRequest([{ field: "mode", code: "unsupported_mode" }]),
      FIELD
    );

    expect(split.fieldMessage).toBe("");
    expect(split.message).toBe(
      "Modus: Dieses Schloss unterstützt den gewählten Modus nicht."
    );
  });

  it("splits a bad request that faults both", () => {
    const split = splitAccessPointFieldError(
      badRequest([
        { field: FIELD, code: "unknown_open_action" },
        { field: "mode", code: "unsupported_mode" },
      ]),
      FIELD
    );

    expect(split.fieldMessage).toBe("Öffnungsart: Unzulässiger Wert");
    expect(split.message).toBe(
      "Modus: Dieses Schloss unterstützt den gewählten Modus nicht."
    );
  });

  /**
   * A failure without a detail list is not about any one field: the provider
   * did not answer, the record is gone. It reads as it does everywhere else.
   */
  it("reads a failure without a detail list the way every caller does", () => {
    const split = splitAccessPointFieldError(apiError(404, {}), FIELD);

    expect(split.fieldMessage).toBe("");
    expect(split.message).toBe(NOT_FOUND_OR_FORBIDDEN);
  });

  it("uses the caller's fallback when there is nothing to read", () => {
    const split = splitAccessPointFieldError(
      new Error("Network Error"),
      FIELD,
      {
        fallbackKey: "accessPoint.management.errors.saveFailed",
      }
    );

    expect(split.message).toBe(
      i18n.t("accessPoint.management.errors.saveFailed")
    );
  });
});
