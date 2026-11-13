import { LOCKER_TYPE, accessPointLabel } from "@/utilities/access-points";
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
 * declares `resolveCompartments` for them. Only for a NEW Anlage, which has
 * no data yet to tell - a stored access point carries its own Fächer when
 * its data has the list (`carriesOwnCompartments`), whatever its provider.
 */
const PROVIDERS_WITH_OWN_COMPARTMENTS = ["open-locker"];

/**
 * Whether a new Schließfachanlage of the provider carries its own Fächer -
 * which picker the dialog shows before anything is stored.
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
 * The Fächer that leave the Zuteilung of a stored Anlage with a save
 * (ECCdigital/tickets#1043): taken out of its list, or out of service now
 * and in service before. The backend moves the future bookings at them on
 * the save, so the dialog asks first. Mirrors the backend's
 * `LockerSystemRedistribution.leavingCompartmentIds`.
 *
 * @param {Object|null} stored The Anlage as stored, `null` for a new one
 * @param {Object[]} compartments The Fächer as the save would leave them
 * @returns {string[]} Their UUIDs
 */
export function leavingCompartmentIds(stored, compartments) {
  if (!carriesOwnCompartments(stored)) return [];
  const remaining = new Map((compartments || []).map((c) => [String(c.id), c]));
  return stored.config.compartments
    .filter((c) => {
      const kept = remaining.get(String(c.id));
      return !kept || (c.outOfService !== true && kept.outOfService === true);
    })
    .map((c) => String(c.id));
}

/**
 * The ids at the provider the other access points of the tenant stand for:
 * each one's `externalId` (a door, a fixed Fach, an iFBS Anlage) and the
 * Fächer of each Anlage that carries its own. A lock of the provider's
 * listing with one of them is created already; a Fach stands in at most one
 * Anlage and is then no fixed Fach, so none of them is to be chosen.
 *
 * @param {Object[]} accessPoints Every access point of the tenant
 * @param {Object} options
 * @param {string} options.provider The provider whose ids count
 * @param {string|null} [options.exceptId] The access point being edited
 * @returns {Set<string>}
 */
export function takenProviderIds(accessPoints, { provider, exceptId }) {
  const taken = new Set();
  (accessPoints || [])
    .filter((point) => point.provider === provider && point.id !== exceptId)
    .forEach((point) => {
      if (point.externalId) taken.add(String(point.externalId));
      if (carriesOwnCompartments(point)) {
        point.config.compartments.forEach((c) => taken.add(String(c.id)));
      }
    });
  return taken;
}

/**
 * A Fach as the administration reads it: „Schrank {name}, Fach {number}“,
 * either part left out where it is unknown.
 *
 * @param {{number?: number|null, lockerBankName?: string|null}|null} compartment
 *   The Fach in the shape the backend projects it
 * @returns {string}
 */
export function compartmentTitle(compartment) {
  if (!compartment) return "";
  const parts = [];
  if (compartment.lockerBankName) {
    parts.push(
      i18n.t("accessPoint.management.compartments.lockerBank", {
        name: compartment.lockerBankName,
      })
    );
  }
  if (compartment.number != null) {
    parts.push(
      i18n.t("accessPoint.management.compartments.compartment", {
        number: compartment.number,
      })
    );
  }
  return parts.join(", ");
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
 * The Fächer of an Anlage grouped by Schließfachschrank, in the order the
 * backend assigns them (its `inAllocationOrder`): Schrank by name, the same
 * name by its id, then the number numerically. The dialog „QR-Codes der
 * Fächer“ lists them so (ECCdigital/tickets#1056), as they stand in the
 * Schrank.
 *
 * @param {Object[]} compartments `config.compartments` of the Anlage
 * @returns {{lockerBank: {id: string, name: string}, compartments: Object[]}[]}
 */
export function compartmentsByLockerBank(compartments) {
  const text = (value) => (value == null ? "" : String(value));
  const number = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };
  const sorted = [...(compartments || [])].sort(
    (a, b) =>
      text(a.lockerBank?.name).localeCompare(text(b.lockerBank?.name), "de") ||
      text(a.lockerBank?.id).localeCompare(text(b.lockerBank?.id)) ||
      number(a.number) - number(b.number)
  );

  const groups = new Map();
  sorted.forEach((compartment) => {
    const lockerBank = compartment.lockerBank || { id: "", name: "" };
    const key = text(lockerBank.id);
    if (!groups.has(key)) groups.set(key, { lockerBank, compartments: [] });
    groups.get(key).compartments.push(compartment);
  });
  return [...groups.values()];
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
