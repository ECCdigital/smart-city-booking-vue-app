import i18n from "@/language/index";

/**
 * i18n table for the `code` field of a 403 body. The 4.3.x backend answers 26
 * of its 32 denials with the generic `forbidden`; the five specific codes
 * belong to strands that land later and add their entry here. An unknown code
 * falls back to the generic entry rather than inventing a message.
 */
const FORBIDDEN_CODE_PREFIX = "errors.forbidden-codes";
const GENERIC_FORBIDDEN_KEY = `${FORBIDDEN_CODE_PREFIX}.forbidden`;
const SESSION_EXPIRED_KEY = "errors.session-expired.message";

/**
 * The status the Admin BFF answers a failed CSRF check with (`bff/src/csrf.js`).
 * It is not a backend `ForbiddenError`: the request never reached the backend,
 * and the user is not lacking a permission - the browser sent a mutating
 * request whose `Origin`/`Referer` no longer matches the served origin, which
 * a reload fixes. 419 is unassigned in the IANA registry, so it cannot
 * contradict a registered meaning the way 428 (Precondition Required) would.
 */
export const CSRF_FAILED_STATUS = 419;

/**
 * The `code` of a 4.3.x error body (`BaseError.toJSON`):
 * `{ error, code, statusCode, params }`. Anything that does not carry both
 * `code` and `statusCode` is not that shape and is read as a generic denial -
 * which is what a deployment still running an older BFF needs, because that
 * BFF answered a stale CSRF token with a 403 of its own.
 */
function getForbiddenCode(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  if (data.statusCode !== 403 || typeof data.code !== "string" || !data.code) {
    return null;
  }
  return data.code;
}

/**
 * `params` are empty on every 403 the backend sends today. They are handed to
 * the translation for interpolation, but nothing is read out of them.
 */
function getForbiddenParams(data) {
  const params = data?.params;
  return params && typeof params === "object" ? params : {};
}

function getForbiddenMessage(data) {
  const code = getForbiddenCode(data);
  const key = code ? `${FORBIDDEN_CODE_PREFIX}.${code}` : null;
  const params = getForbiddenParams(data);

  if (key && i18n.te(key)) {
    return i18n.t(key, params);
  }
  return i18n.t(GENERIC_FORBIDDEN_KEY, params);
}

/**
 * Extrahiert eine anzeigbare Fehlermeldung aus einer axios-Fehlerantwort.
 * Bei 400-Antworten mit Klartext-Body (z. B. serverseitige PDF-Template-
 * Validierung von PUT /api/tenants) wird dieser Text zurückgegeben,
 * bei 403-Antworten die über `code` übersetzte Meldung,
 * bei 419-Antworten (CSRF-Prüfung der BFF) den Hinweis auf die abgelaufene
 * Sitzung, sonst der Fallback.
 */
export function getApiErrorMessage(error, fallback) {
  if (error?.response?.status === 400) {
    const data = error.response.data;
    if (typeof data === "string" && data.trim()) {
      return data.trim();
    }
    if (data && typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
  }
  if (error?.response?.status === 403) {
    return getForbiddenMessage(error.response.data);
  }
  // The BFF is the only source of this status and sends it for exactly one
  // reason, so the body is not read.
  if (error?.response?.status === CSRF_FAILED_STATUS) {
    return i18n.t(SESSION_EXPIRED_KEY);
  }
  return fallback;
}

async function parseBlobBody(blob) {
  let text;
  try {
    text = await blob.text();
  } catch (_) {
    return null;
  }

  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    return trimmed;
  }
}

/**
 * Unpack an axios error whose body arrived as a Blob because the request asked
 * for one (`responseType: "blob"`). Returns an error of the same shape with
 * `response.data` replaced by the parsed JSON body, its text when the body is
 * not JSON, or `null` when there is nothing readable. Every other error is
 * handed back untouched, so any error may be passed in.
 *
 * A Blob body hides the status-carrying fields from `getApiErrorMessage`, so
 * it has to be unpacked before the message can be read - never instead of
 * looking at the status.
 */
export async function unpackBlobErrorBody(error) {
  const response = error?.response;
  if (typeof Blob === "undefined" || !(response?.data instanceof Blob)) {
    return error;
  }

  return {
    ...error,
    // `message` is not enumerable on an Error instance, so spreading loses it.
    message: error.message,
    response: { ...response, data: await parseBlobBody(response.data) },
  };
}
