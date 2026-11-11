import {
  LOCKER_TYPE,
  DOOR_TYPE,
  accessPointLabel,
} from "@/utilities/access-points";
import { isUnlimitedAmount } from "@/utils/bookableFlow";
import i18n from "@/language/index";

/**
 * The Fächer a Schließfachanlage carries itself - an Open Locker Anlage
 * (ECCdigital/tickets#1037). The list sits in `config.compartments`, one
 * entry per Fach as the backend stores it:
 *
 * ```
 * { id: "<UUID at Open Locker>", number: 3,
 *   lockerBank: { id: "<Schließfachschrank id>", name: "Labor Fachbank 1" },
 *   outOfService: false }
 * ```
 *
 * Schrank and number come from Open Locker's listing on every save; this UI
 * sends what it shows, the backend takes over its own.
 */

/**
 * The providers whose Schließfachanlage carries its own Fächer: the backend
 * declares `resolveCompartments` for them. Asked of the provider, not of
 * the access point, where there is none yet - a new Anlage, or a provider
 * the tenant has not switched on and whose capabilities are unknown.
 */
const PROVIDERS_WITH_OWN_COMPARTMENTS = ["open-locker"];

/**
 * Whether a Schließfachanlage of the provider carries its own Fächer.
 *
 * @param {string} provider A provider id
 * @returns {boolean}
 */
export function lockerCarriesCompartments(provider) {
  return PROVIDERS_WITH_OWN_COMPARTMENTS.includes(provider);
}

/**
 * Whether the access point is a Schließfachanlage that carries its own
 * Fächer - an empty list too. iFBS and Pareva Anlagen carry none.
 *
 * @param {Object|null} accessPoint An access point or the dialog's form
 * @returns {boolean}
 */
export function carriesOwnCompartments(accessPoint) {
  return (
    accessPoint?.type === LOCKER_TYPE &&
    Array.isArray(accessPoint?.config?.compartments)
  );
}

/**
 * The UUIDs of the Fächer the other access points of the provider hold: the
 * Fächer of each Anlage that carries its own, and each fixed Fach (a door,
 * its UUID the `externalId`). A Fach stands in at most one Anlage and is then
 * no fixed Fach, so none of them is to be chosen.
 *
 * @param {Object[]} accessPoints Every access point of the tenant
 * @param {Object} options
 * @param {string} options.provider The provider whose Fächer count
 * @param {string|null} [options.exceptId] The access point being edited
 * @returns {Set<string>}
 */
export function takenCompartmentIds(accessPoints, { provider, exceptId }) {
  const taken = new Set();
  (accessPoints || [])
    .filter((point) => point.provider === provider && point.id !== exceptId)
    .forEach((point) => {
      if (carriesOwnCompartments(point)) {
        point.config.compartments.forEach((c) => taken.add(String(c.id)));
      } else if (point.type === DOOR_TYPE && point.externalId) {
        taken.add(String(point.externalId));
      }
    });
  return taken;
}

/** A listed compartment in the shape the choice shows. */
function fromListing(entry) {
  const metadata = entry.metadata || {};
  return {
    id: String(entry.id),
    number: metadata.number ?? null,
    lockerBank: {
      id: String(metadata.lockerBank?.id ?? entry.locationId ?? ""),
      name: metadata.lockerBank?.name ?? "",
    },
  };
}

/**
 * The Fächer to choose from, grouped by Schließfachschrank in the order the
 * listing names them: every listed Fach no other access point holds, each
 * marked whether it is chosen and out of service. A chosen Fach the listing
 * does not name - the provider is not active, or the account lost it - is
 * kept as stored, at the end of its Schrank, so it can still be taken out.
 * A Schrank with nothing left to show is left out.
 *
 * @param {Object[]} listing The provider's listing (`listAccessPoints`)
 * @param {Object[]} selected The Fächer chosen, in the stored shape
 * @param {Set<string>} taken The Fächer other access points hold
 * @returns {{lockerBank: {id: string, name: string}, compartments: Object[]}[]}
 */
export function compartmentGroups(listing, selected, taken) {
  const chosen = new Map((selected || []).map((c) => [String(c.id), c]));
  const groups = new Map();
  const groupOf = (lockerBank) => {
    const key = lockerBank?.id || lockerBank?.name || "";
    if (!groups.has(key)) {
      groups.set(key, { lockerBank, compartments: [] });
    }
    return groups.get(key);
  };
  const listedIds = new Set();

  (listing || []).forEach((entry) => {
    const compartment = fromListing(entry);
    listedIds.add(compartment.id);
    const choice = chosen.get(compartment.id);
    if (!choice && taken.has(compartment.id)) return;
    groupOf(compartment.lockerBank).compartments.push({
      ...compartment,
      selected: !!choice,
      outOfService: choice?.outOfService === true,
      listed: true,
    });
  });

  chosen.forEach((choice, id) => {
    if (listedIds.has(id)) return;
    const lockerBank = choice.lockerBank || { id: "", name: "" };
    groupOf(lockerBank).compartments.push({
      ...choice,
      id,
      lockerBank,
      selected: true,
      outOfService: choice.outOfService === true,
      listed: false,
    });
  });

  return [...groups.values()].filter((group) => group.compartments.length);
}

/**
 * The Anlagen with their own Fächer that a bookable other than the one being
 * edited already links - its access switched on or off, as the backend
 * counts it. Such an Anlage belongs to one bookable only, so the form does
 * not offer it (ECCdigital/tickets#1038). Doors and Anlagen whose provider
 * assigns may hang at several bookables and are never named.
 *
 * @param {Object[]} accessPoints Every access point of the tenant
 * @param {Object[]} bookables The bookables of the tenant the editor may read
 * @param {string|undefined} exceptId The bookable being edited, none if new
 * @returns {Set<string>} Ids of the Anlagen linked elsewhere
 */
export function lockerSystemIdsLinkedElsewhere(
  accessPoints,
  bookables,
  exceptId
) {
  const linked = new Set(
    (bookables || [])
      .filter((bookable) => !exceptId || bookable.id !== exceptId)
      .flatMap((bookable) => bookable.accessPointDetails?.accessPointIds || [])
  );
  return new Set(
    (accessPoints || [])
      .filter((point) => carriesOwnCompartments(point) && linked.has(point.id))
      .map((point) => point.id)
  );
}

/**
 * The linked Anlagen with their own Fächer whose Fächer the bookable's
 * `amount` does not fit: it is unlimited (empty or 0), or larger than their
 * number. Every Fach counts, out of service or not. `amount` stays the
 * editor's to set, so this is a hint, never a refusal
 * (ECCdigital/tickets#1038).
 *
 * @param {Object} bookable The bookable as edited
 * @param {Object[]} accessPoints Every access point of the tenant
 * @returns {{accessPointId: string, label: string, count: number}[]} In the
 *   order the bookable links them
 */
export function compartmentCountMismatches(bookable, accessPoints) {
  const unlimited = isUnlimitedAmount(bookable);
  const amount = Number(bookable?.amount);
  return (bookable?.accessPointDetails?.accessPointIds || [])
    .map((id) => (accessPoints || []).find((point) => point.id === id))
    .filter(carriesOwnCompartments)
    .map((point) => ({
      accessPointId: point.id,
      label: accessPointLabel(point),
      count: point.config.compartments.length,
    }))
    .filter(({ count }) => unlimited || amount > count);
}

/**
 * The hint of `compartmentCountMismatches`, one sentence per Anlage, for the
 * amount card and the assignment alike.
 *
 * @param {Object} bookable The bookable as edited
 * @param {Object[]} accessPoints Every access point of the tenant
 * @returns {{id: string, text: string}[]}
 */
export function compartmentCountHints(bookable, accessPoints) {
  const unlimited = isUnlimitedAmount(bookable);
  return compartmentCountMismatches(bookable, accessPoints).map(
    ({ accessPointId, label, count }) => ({
      id: accessPointId,
      text: i18n.tc(
        `accessPoint.bookable.compartmentCount.${
          unlimited ? "unlimited" : "larger"
        }`,
        count,
        { label, count, amount: Number(bookable.amount) }
      ),
    })
  );
}
