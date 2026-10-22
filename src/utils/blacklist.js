/**
 * The blacklist of the instance (glossary „Blacklist“, „Blacklist-Eintrag“,
 * ECCdigital/tickets#625): what its page reads and checks before it asks
 * the API.
 */

const ADDRESS = /^[^@\s]+@[^@\s]+$/;
const DOMAIN = /^@[^@\s]+$/;

/**
 * An address or a domain as the backend stores an entry: trimmed and in
 * lower case as the user ids, a domain with its leading `@`.
 *
 * @param {*} value
 * @returns {{value: string, kind: string}|null} `null` for anything else
 */
export function parseBlacklistValue(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (DOMAIN.test(normalized)) return { value: normalized, kind: "domain" };
  if (ADDRESS.test(normalized)) return { value: normalized, kind: "address" };
  return null;
}
