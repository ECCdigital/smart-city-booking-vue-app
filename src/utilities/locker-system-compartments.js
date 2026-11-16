import { LOCKER_TYPE, accessPointLabel } from "@/utilities/access-points";
import { isUnlimitedAmount } from "@/utils/bookableFlow";
import { isRejectedOrCancelled } from "@/utils/bookingStatus";
import FormatService from "@/services/FormatService";
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

/** The Pufferzeit of a bookable in milliseconds, as the backend counts it. */
function accessBufferMs(bookable) {
  const buffer = bookable?.accessPointDetails?.accessBuffer || {};
  const toMs = (minutes) => {
    const value = Number(minutes ?? 0);
    return Number.isFinite(value) && value > 0 ? value * 60 * 1000 : 0;
  };
  return { beforeMs: toMs(buffer.before), afterMs: toMs(buffer.after) };
}

/**
 * The bookings that hold a Fach of the Anlage (ECCdigital/tickets#1113),
 * read off the tenant's bookings: each not taken back entry in `accessInfo`
 * at the Anlage with the Fach it was given, of a booking not rejected,
 * cancelled or withdrawn whose access window - the period with the
 * Pufferzeit of its bookable - is not over. It is `running` once that window
 * has begun, and keeps its Fach when the Fach leaves; before, it gets a free
 * Fach in service on the save. A booking without a period holds its Fach for
 * good. Mirrors the backend's `LockerSystemRedistribution.bookingsAt`.
 *
 * @param {Object} accessPoint The Anlage
 * @param {Object[]} bookings The tenant's bookings, with `accessInfo`
 * @param {Object[]} bookables The tenant's bookables, for the Pufferzeit
 * @param {number} [now=Date.now()]
 * @returns {{id: string, timeBegin: number|null, timeEnd: number|null,
 *   compartment: Object, running: boolean}[]} One per Fach held, earliest
 *   first
 */
export function compartmentBookings(
  accessPoint,
  bookings,
  bookables,
  now = Date.now()
) {
  if (!carriesOwnCompartments(accessPoint)) return [];
  const bookableById = new Map(
    (bookables || []).map((bookable) => [String(bookable.id), bookable])
  );
  return (bookings || [])
    .filter((booking) => !isRejectedOrCancelled(booking))
    .flatMap((booking) =>
      (booking.accessInfo || [])
        .filter(
          (entry) =>
            String(entry?.accessPointId) === String(accessPoint.id) &&
            !entry.revokedAt &&
            entry.assignedCompartment?.id
        )
        .map((entry) => {
          const { timeBegin, timeEnd } = booking;
          const { beforeMs, afterMs } = accessBufferMs(
            bookableById.get(String(entry.bookableId))
          );
          const endless = timeBegin == null || timeEnd == null;
          if (!endless && now > timeEnd + afterMs) return null;
          return {
            id: booking.id,
            timeBegin: timeBegin ?? null,
            timeEnd: timeEnd ?? null,
            compartment: entry.assignedCompartment,
            running: endless || now >= timeBegin - beforeMs,
          };
        })
    )
    .filter(Boolean)
    .sort(
      (a, b) =>
        (a.timeBegin ?? 0) - (b.timeBegin ?? 0) ||
        String(a.id).localeCompare(String(b.id))
    );
}

/**
 * The future bookings that hold a Fach no longer in the Anlage, or out of
 * service (ECCdigital/tickets#1113): a save found no free Fach in service
 * for them, so they stayed at the old one. They count until they are
 * solved - moved or cancelled, or the Fach is back.
 *
 * @param {Object} accessPoint The Anlage as stored
 * @param {Object[]} bookings The bookings at its Fächer, as
 *   `compartmentBookings` reads them
 * @returns {Object[]} Those bookings, earliest first
 */
export function bookingsWithoutCompartment(accessPoint, bookings) {
  if (!carriesOwnCompartments(accessPoint)) return [];
  const inService = new Set(
    accessPoint.config.compartments
      .filter((compartment) => compartment.outOfService !== true)
      .map((compartment) => String(compartment.id))
  );
  return (bookings || []).filter(
    (booking) =>
      !booking.running && !inService.has(String(booking.compartment?.id))
  );
}

/**
 * What a save does to the bookings at a Fach that leaves the Anlage, in a
 * few words at the Fach (ECCdigital/tickets#1113): the running one stays,
 * the future ones move - „läuft bis 20.11.26, 14:00, bleibt · 2 ziehen um“.
 *
 * @param {Object[]} bookings The bookings at the Fach, as
 *   `compartmentBookings` reads them
 * @returns {string} Empty without bookings
 */
export function leavingCompartmentNote(bookings) {
  const running = (bookings || []).filter((booking) => booking.running);
  const moving = (bookings || []).length - running.length;
  const parts = [];
  if (running.length) {
    const end = running[0].timeEnd;
    parts.push(
      end == null
        ? i18n.t("accessPoint.management.compartments.bookings.running")
        : i18n.t("accessPoint.management.compartments.bookings.runningUntil", {
            end: FormatService.dateTime(end),
          })
    );
  }
  if (moving) {
    parts.push(
      i18n.tc("accessPoint.management.compartments.bookings.moving", moving, {
        count: moving,
      })
    );
  }
  return parts.join(" · ");
}

/**
 * What a save does to the bookings at all Fächer that leave the Anlage, as
 * the sentence under the Fächer says it (ECCdigital/tickets#1113): „Beim
 * Speichern: 1 laufende Buchung behält ihr Fach, 2 künftige bekommen ein
 * freies Fach in Betrieb.“ How many find a free Fach only the save knows.
 *
 * @param {Object[]} bookings The bookings at the Fächer of the Anlage, as
 *   `compartmentBookings` reads them
 * @param {string[]} leavingIds The UUIDs of the Fächer that leave
 * @returns {string} Empty where no booking hangs at them
 */
export function leavingCompartmentsSummary(bookings, leavingIds) {
  const leaving = new Set((leavingIds || []).map(String));
  const affected = (bookings || []).filter((booking) =>
    leaving.has(String(booking.compartment?.id))
  );
  if (!affected.length) return "";
  const key = (name) => `accessPoint.management.compartments.bookings.${name}`;
  const keeping = affected.filter((booking) => booking.running).length;
  const moving = affected.length - keeping;
  const parts = [];
  if (keeping) parts.push(i18n.tc(key("keep"), keeping, { count: keeping }));
  if (moving) {
    parts.push(
      i18n.tc(key(keeping ? "moveAfterKeep" : "move"), moving, {
        count: moving,
      })
    );
  }
  return i18n.t(key("summary"), { consequences: parts.join(", ") });
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
