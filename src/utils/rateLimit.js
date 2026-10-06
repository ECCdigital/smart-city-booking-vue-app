/**
 * Reading a hit time limit (backend: `429 too_many_requests` with a
 * `Retry-After` header and `params.retryAfterSeconds`). Pure, shared by the
 * authentication views and the tenant creation.
 */

/** The wait a `Retry-After` of seconds asks for, in German. */
export function retryAfterText(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return "";

  const minutes = Math.ceil(total / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} Std.` : "", rest ? `${rest} Min.` : ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * `{ wait }` for a `429` - the wait as text, `""` when the answer names none -
 * and `null` for every other error. The header wins; the BFF's own error
 * routes answer without it and nest the backend's envelope below `data`.
 */
export function rateLimitOf(error) {
  const response = error?.response;
  if (response?.status !== 429) return null;

  const data = response.data || {};
  const seconds =
    Number(response.headers?.["retry-after"]) ||
    data.params?.retryAfterSeconds ||
    data.data?.params?.retryAfterSeconds;
  return { wait: retryAfterText(seconds) };
}

const MESSAGE_KEYS = "auth.rate-limit";

/**
 * The i18n message of a `rateLimitOf` on the authentication views; the key
 * carries a toast's `title` and `message`. A limit without a usable wait says
 * "later".
 */
export function rateLimitMessage(limit) {
  return limit.wait
    ? { key: `${MESSAGE_KEYS}.wait`, params: { wait: limit.wait } }
    : { key: `${MESSAGE_KEYS}.unknown`, params: {} };
}
