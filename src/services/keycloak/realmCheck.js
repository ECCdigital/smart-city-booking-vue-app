import i18n from "@/language/index";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

/**
 * „Realm prüfen“ in the tab „Single Sign-On“: the request built from the
 * Anleitung (`buildRealmGuide`) and the backend's answer read back onto the
 * steps of the checklist.
 *
 * Contract of `POST /api/instances/keycloak/check`: the body names the mode
 * and per Adresse the Rücksprungadressen the Anleitung shows; the answer is
 * `{ checkedAt, rows: [{ id, status, reason, details?, parts? }] }` with the
 * rows 1 to 10. The backend never sends prose: every sentence is formulated
 * here from `reason` and `details`.
 */

/** The values of a list of the Anleitung as plain strings. */
function texts(values) {
  return (values || []).map((value) => value.text);
}

/**
 * An Adresse whose Rücksprungadressen nobody here knows (the BFF did not
 * name them) carries placeholders; it is not sent.
 */
function isPlaceholder(address) {
  return [...address.redirectUris, ...address.postLogoutRedirectUris].some(
    (value) => value.missing
  );
}

/**
 * The body of `POST api/instances/keycloak/check`: one entry per Adresse of
 * the Anleitung (Admin UI, and the Storefront when there is a Portal-URL),
 * without the ones that are only placeholders. The entry for „Benutzer
 * wechseln“ keeps its `*`.
 *
 * @param {object} guide the Anleitung, from `buildRealmGuide`
 * @returns {{ mode: string, apps: Array<{ app, origin, redirectUris,
 *   postLogoutRedirectUris }> }}
 */
export function checkBody(guide) {
  return {
    mode: guide.mode,
    apps: guide.addresses
      .filter((address) => !isPlaceholder(address))
      .map((address) => ({
        app: address.app,
        origin: address.origin.text,
        redirectUris: texts(address.redirectUris),
        postLogoutRedirectUris: texts(address.postLogoutRedirectUris),
      })),
  };
}

const CHECK = "instance.edit.sso.check";

/**
 * The values „Realm prüfen“ needs, under the names of the Anleitung
 * (`guide.missing`) and of the instance (`400 keycloak_settings_missing`).
 */
const VALUE_NAMES = {
  serverUrl: "serverUrl",
  realm: "realm",
  webClient: "webClient",
  publicClient: "webClient",
  apiClient: "apiClient",
  privateClient: "apiClient",
  clientSecret: "clientSecret",
  privateClientSecret: "clientSecret",
};

/**
 * Missing values as they read in the form, as one German list:
 * „Keycloak-URL, Realm und Client Secret“.
 *
 * @param {string[]} keys names of the Anleitung or of the instance
 */
export function valueNames(keys) {
  const names = [...new Set(keys.map((key) => VALUE_NAMES[key] || key))].map(
    (key) =>
      i18n.te(`${CHECK}.values.${key}`) ? i18n.t(`${CHECK}.values.${key}`) : key
  );
  if (names.length < 2) return names.join("");
  return i18n.t(`${CHECK}.list`, {
    rest: names.slice(0, -1).join(", "),
    last: names[names.length - 1],
  });
}

/**
 * The Admin UI's own result for an Adresse it did not send: the BFF did not
 * name its Rücksprungadressen, so nobody could check them.
 */
export const ADDRESSES_UNKNOWN = "addressesUnknown";

/**
 * The answer of the check as the tab keeps it: the backend's rows plus,
 * per Adresse of the Anleitung that was not sent, a row of the Admin UI's
 * own, `nicht prüfbar` with reason `addresses_unknown`.
 *
 * @param {object} guide the Anleitung the body was built from
 * @param {{ checkedAt: string, rows: object[] }} answer the backend's answer
 */
export function checkResult(guide, answer) {
  const unknown = guide.addresses.filter(isPlaceholder).map((address) => ({
    id: ADDRESSES_UNKNOWN,
    status: "na",
    reason: "addresses_unknown",
    details: { origin: address.origin.text },
  }));
  return { ...answer, rows: [...((answer && answer.rows) || []), ...unknown] };
}

/** The states of a result, worst first. */
export const CHECK_STATUSES = Object.freeze(["fail", "na", "info", "ok"]);

/** The rows of the answer per step of the checklist, in the order shown. */
export const STEP_ROWS = Object.freeze({
  realm: [1],
  webClient: [2, 3],
  addresses: [4, 5, 6, ADDRESSES_UNKNOWN],
  audience: [8],
  apiClient: [7],
  roles: [9],
  portal: [10],
});

/** The worst of the given states, or `null` for none. */
export function worstStatus(statuses) {
  return CHECK_STATUSES.find((status) => statuses.includes(status)) || null;
}

/**
 * The result per step: its rows in the order of `STEP_ROWS` and the worst
 * state among them. A step without rows in the answer is left out, so it
 * keeps its number.
 *
 * @param {{ rows: object[] }} result the answer of the check
 * @returns {Object<string, { status: string, rows: object[] }>} by step key
 */
export function resultSteps(result) {
  const rows = (result && result.rows) || [];
  return Object.entries(STEP_ROWS).reduce((steps, [key, ids]) => {
    const own = ids.flatMap((id) => rows.filter((row) => row.id === id));
    if (own.length) {
      steps[key] = {
        status: worstStatus(own.map((row) => row.status)),
        rows: own,
      };
    }
    return steps;
  }, {});
}

/**
 * How many results the steps show per state, worst first, without the
 * states none has: `[{ status: "fail", count: 1 }, …]`.
 *
 * @param {Object<string, { rows: object[] }>} steps from `resultSteps`
 */
export function statusCounts(steps) {
  const rows = Object.values(steps).flatMap((step) => step.rows);
  return CHECK_STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  })).filter(({ count }) => count > 0);
}

/** The time of the check as it reads in the status card: „14:03:12“. */
export function checkTime(checkedAt) {
  return new Date(checkedAt).toLocaleTimeString("de-DE");
}

/** Day and time of the check, for the text: „01.10.2026, 14:03:12“. */
export function checkMoment(checkedAt) {
  return new Date(checkedAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

/** A result with parts names its reason per part, not as a whole. */
export function hasParts(row) {
  return Array.isArray(row.parts) && row.parts.length > 0;
}

/** `details` as parameters of a sentence; lists read as „a, b“. */
function params(details) {
  return Object.fromEntries(
    Object.entries(details || {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(", ") : value,
    ])
  );
}

/**
 * Details that are not always there; when they are, a sentence of their own
 * follows the reason (`check.extras.<detail>`).
 */
const EXTRAS = {
  unexpected_response: ["error", "location"],
  web_client_invalid: ["httpStatus", "error"],
  storefront_not_redirecting: ["location"],
};

function extras(reason, values) {
  return (EXTRAS[reason] || [])
    .filter((detail) => values[detail] != null && values[detail] !== "")
    .map((detail) => i18n.t(`${CHECK}.extras.${detail}`, values));
}

/**
 * Reasons that list something; an empty or absent list reads as a sentence
 * of its own (`<reason>_none`), e.g. a token without any Client-Rolle.
 */
const LISTS = {
  audience_missing: "aud",
  client_roles: "roles",
};

function variant(reason, details) {
  const list = LISTS[reason] && (details || {})[LISTS[reason]];
  if (!LISTS[reason] || (Array.isArray(list) && list.length)) return reason;
  return `${reason}_none`;
}

/**
 * The sentence for the reason of a row or a part, from `reason` and
 * `details`. A row may say it its own way
 * (`check.rowReasons.<row id>.<reason>`); an unknown reason reads as a
 * generic sentence with its code.
 *
 * @param {number|string} rowId the row the reason belongs to
 * @param {{ reason: string, details?: object }} item the row or a part of it
 */
export function reasonSentence(rowId, { reason, details }) {
  const sentence = variant(reason, details);
  const own = `${CHECK}.rowReasons.${rowId}.${sentence}`;
  const shared = `${CHECK}.reasons.${sentence}`;
  const values = params(details);
  const key = [own, shared].find((candidate) => i18n.te(candidate));
  if (!key) return i18n.t(`${CHECK}.unknownReason`, { reason });
  return [i18n.t(key, values), ...extras(reason, values)].join(" ");
}

/** What a state reads as: „erfüllt“, „nicht erfüllt“, … */
export function statusLabel(status) {
  return i18n.t(`${CHECK}.status.${status}`);
}

/** The title of a row, e.g. „Realm und Issuer“. */
export function rowTitle(row) {
  return i18n.t(`${CHECK}.rows.${row.id}`);
}

/** Rows whose parts are probes with a key of their own instead of a URI. */
const PROBE_ROWS = [2, 3];

/**
 * The label of a part: a probe of rows 2 and 3 in German
 * (`check.parts.<key>`), else as sent, a URI or an Adresse.
 */
export function partLabel(rowId, part) {
  const key = `${CHECK}.parts.${part.label}`;
  return PROBE_ROWS.includes(rowId) && i18n.te(key) ? i18n.t(key) : part.label;
}

/** How a state looks: the icon and the Vuetify colour of its badge. */
export const CHECK_LOOK = Object.freeze({
  ok: { icon: "mdi-check", color: "success" },
  fail: { icon: "mdi-close", color: "error" },
  na: { icon: "mdi-help", color: "grey" },
  info: { icon: "mdi-information-variant", color: "info" },
});

/**
 * What the status card says when „Realm prüfen“ got no result: the stored
 * values the backend misses (`400 keycloak_settings_missing`), the fields it
 * refused (`400 ValidationError`), a denial, or that the check failed.
 */
export function checkErrorMessage(error) {
  const response = (error && error.response) || {};
  const data = response.data || {};
  if (response.status === 400 && data.code === "keycloak_settings_missing") {
    const missing = (data.params && data.params.missing) || [];
    return i18n.t(`${CHECK}.errors.settingsMissing`, {
      values: valueNames(missing),
    });
  }
  const failed = i18n.t(`${CHECK}.errors.failed`);
  if (response.status === 400 && data.error === "ValidationError") {
    const fields = (data.details || []).map((detail) => detail.field);
    if (!fields.length) return failed;
    return i18n.t(`${CHECK}.errors.validation`, { fields: fields.join(", ") });
  }
  return getApiErrorMessage(error, failed);
}
