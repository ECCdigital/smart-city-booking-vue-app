import { LOCKER_TYPE, DOOR_TYPE } from "@/utilities/access-points";

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
