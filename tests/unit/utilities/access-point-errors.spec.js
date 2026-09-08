import { describe, expect, it } from "vitest";
import i18n from "@/language/index";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";

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
