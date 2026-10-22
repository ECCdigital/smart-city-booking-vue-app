import ApiBlacklistService from "@/services/api/ApiBlacklistService";

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

/** The addresses of a mail as the backend asks them: split, trimmed, lower case. */
export const addressesOf = (mail) =>
  String(mail ?? "")
    .split(/[,\n]+/)
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

/**
 * The addresses a way of the administration asks the blacklist about
 * before it saves (ECCdigital/tickets#629): each address of the mail of a
 * new booking, or those a changed mail adds - so an address already stored
 * warns no second time.
 *
 * @param {*} mail One address or a list, as `mail` of a booking
 * @param {*} [before] The mail as stored, for an existing booking
 * @returns {string[]}
 */
export function addressesToCheck(mail, before) {
  const stored = new Set(addressesOf(before));
  return [...new Set(addressesOf(mail))].filter(
    (address) => !stored.has(address)
  );
}

/**
 * The addresses the blacklist hits, each asked by the route of `way`
 * (ECCdigital/tickets#629). A failed question is no hit: a warning never
 * stops a save.
 *
 * @param {"manualBooking"|"bookingMail"|"tenantUser"} way
 * @param {string[]} addresses
 * @param {string} tenantId
 * @returns {Promise<string[]>}
 */
export async function blacklistedAmong(way, addresses, tenantId) {
  const hits = await Promise.all(
    addresses.map((address) =>
      ApiBlacklistService.isBlacklisted(way, address, tenantId).catch(
        () => false
      )
    )
  );
  return addresses.filter((_, index) => hits[index]);
}
