/**
 * Stored secrets are write only: the backend answers with this marker where a
 * secret is stored, never the secret itself. Handed back, the marker keeps
 * the stored secret, an empty value removes it, any other value replaces it.
 * The marker keeps it only while the server and account it belongs to stay
 * the same; otherwise the backend answers `secret_required`.
 */
export const STORED_SECRET = "__stored_secret__";

/**
 * Whether a form value stands for the secret the backend has stored.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isStoredSecret(value) {
  return value === STORED_SECRET;
}
