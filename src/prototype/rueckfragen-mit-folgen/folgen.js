/**
 * PROTOTYPE (tickets#1095) — stub data for the Rückfragen mit Folgen.
 * Throwaway, never merged. Nothing here talks to the backend.
 *
 * Builds on the rows of tickets#1093 (Stand „Wenige“) and adds what the two
 * questions need: running bookings with a granted access per Zugangspunkt
 * (Löschen), and the bookings at each Fach of the Schließfachanlage
 * Bürgerbüro (Fächer abwählen).
 */
import Vue from "vue";
import {
  store,
  provider,
  bookable,
  removeAccessPoint,
} from "../zugangspunkte-fuehrung/data";
import { loadRows } from "../zeilen-je-anbieter/rows";

export const folgen = Vue.observable({
  slow: false, // the check of running bookings takes 2.5 s
  unreadable: false, // the bookings of the Mandant cannot be read
  faecher: {}, // rowId → [{ id, schrank, number, outOfService, inAnlage }]
  bookings: {}, // fachId → [booking]
  stranded: {}, // rowId → [booking] future bookings no Fach was free for
});

// --- dates -----------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
function at(dayOffset, hour) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + dayOffset * DAY + hour * 60 * 60 * 1000);
}
function rel(hours) {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d;
}
function fmt(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / DAY - 0.5);
  const time = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (diff === 0) return `heute ${time}`;
  if (diff === 1) return `morgen ${time}`;
  return `${d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  })} ${time}`;
}
export function period(b) {
  return `${fmt(b.begin)} – ${fmt(b.end)}`;
}
export function until(b) {
  return `bis ${fmt(b.end)}`;
}

let seq = 1040;
function booking(name, mail, begin, end) {
  seq += 1;
  return { id: `B-${seq}`, name, mail, begin, end };
}

// --- running bookings with a granted access, per Zugangspunkt --------------

const PEOPLE = [
  ["Jana Petersen", "jana.petersen@example.org"],
  ["Mehmet Kaya", "m.kaya@example.org"],
  ["Lea Schröder", "lea.schroeder@example.org"],
  ["Tom Hansen", "tom.hansen@example.org"],
  ["Aylin Demir", "aylin.demir@example.org"],
  ["Finn Jensen", "finn.jensen@example.org"],
  ["Marie Lorenzen", "marie.lorenzen@example.org"],
];

function running(label) {
  if (label === "Rathaus Haupteingang")
    return [
      booking(...PEOPLE[0], rel(-2), rel(3)),
      booking(...PEOPLE[1], rel(-1), rel(5)),
    ];
  if (label === "Gemeinschaftsraum Gaarden")
    return [booking(...PEOPLE[2], rel(-14), rel(20))];
  if (label === "Fahrradboxen Bahnhof Nord")
    // Monatsmieten: a busy Anlage, longer than the list may show
    return Array.from({ length: 14 }, (_, i) =>
      booking(...PEOPLE[i % PEOPLE.length], at(-10 - i, 0), at(20 + i, 0))
    );
  return [];
}

// --- Fächer of the Schließfachanlage Bürgerbüro ------------------------------

function loadFaecher() {
  const faecher = {};
  const bookings = {};
  store.accessPoints
    .filter((r) => r.lockerType === "locker" && r.provider === "open-locker")
    .forEach((row) => {
      const plan =
        row.label === "Schließfachanlage Bürgerbüro"
          ? [{ schrank: "A", count: 6, out: [5] }]
          : [
              { schrank: "A", count: 8, out: [] },
              { schrank: "B", count: 4, out: [2] },
            ];
      const list = [];
      plan.forEach(({ schrank, count, out }) => {
        for (let n = 1; n <= count; n++)
          list.push({
            id: `${row.id}-${schrank}${n}`,
            schrank,
            number: n,
            outOfService: out.includes(n),
            inAnlage: true,
          });
      });
      faecher[row.id] = list;
      if (row.label === "Schließfachanlage Bürgerbüro") {
        const f = (n) => list[n - 1].id;
        bookings[f(1)] = [booking(...PEOPLE[3], at(1, 10), at(1, 12))];
        bookings[f(2)] = [booking(...PEOPLE[0], rel(-20), at(7, 18))];
        bookings[f(3)] = [
          booking(...PEOPLE[4], at(1, 9), at(1, 17)),
          booking(...PEOPLE[5], at(6, 8), at(6, 12)),
        ];
        bookings[f(4)] = [
          booking(...PEOPLE[6], rel(-26), rel(5)),
          booking(...PEOPLE[1], at(1, 14), at(1, 16)),
        ];
      }
    });
  folgen.faecher = faecher;
  folgen.bookings = bookings;
  folgen.stranded = {};
}

const RUNNING = {};

/** Stand „Wenige“ of tickets#1093 plus the bookings of this prototype. */
export function loadFolgen() {
  seq = 1040;
  loadRows("wenige");
  store.accessPoints.forEach((r) => (RUNNING[r.id] = running(r.label)));
  loadFaecher();
}

// --- Löschen ---------------------------------------------------------------

export function providerName(row) {
  return provider(row.provider)?.name || row.provider;
}

export function noun(row) {
  if (row.kind === "door") return "Tür";
  if (row.lockerType === "fixed") return "festes Fach";
  if (row.lockerType === "locker") return "Schließfachanlage";
  return "Anlage";
}

/** „die Tür“, „das feste Fach“, „die Schließfachanlage“, „die Anlage“. */
export function theNoun(row) {
  return row.lockerType === "fixed" ? "das feste Fach" : `die ${noun(row)}`;
}

export function bookablesOf(row) {
  return row.bookableIds.map((id) => bookable(id)).filter(Boolean);
}

export function runningAt(row) {
  if (row.lockerType === "locker" && folgen.faecher[row.id])
    return Object.entries(folgen.bookings)
      .filter(([fachId]) => fachId.startsWith(`${row.id}-`))
      .flatMap(([, list]) => list)
      .filter(isRunning);
  return RUNNING[row.id] || [];
}

/**
 * Reads the running bookings with a granted access. Resolves after a short
 * wait (2.5 s with „Prüfung dauert“), rejects with „nicht abrufbar“.
 */
export function checkRunning(row) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () =>
        folgen.unreadable
          ? reject(new Error("unreadable"))
          : resolve(runningAt(row)),
      folgen.slow ? 2500 : 350
    );
  });
}

export function deleteRow(row) {
  removeAccessPoint(row.id);
}

/** „Besprechungsraum 1. OG, Bürgersaal“, cut after `max` with „und 2 weitere“. */
export function names(list, max = 3, of = (x) => x.name) {
  const shown = list.slice(0, max).map(of);
  const rest = list.length - shown.length;
  if (rest <= 0)
    return shown.length > 1
      ? `${shown.slice(0, -1).join(", ")} und ${shown[shown.length - 1]}`
      : shown.join("");
  return `${shown.join(", ")} und ${rest} weitere`;
}

// --- Fächer abwählen ----------------------------------------------------------

export function isRunning(b) {
  const now = Date.now();
  return b.begin.getTime() <= now && b.end.getTime() > now;
}

export function faecherOf(row) {
  return folgen.faecher[row.id] || [];
}

export function bookingsAt(fachId) {
  return folgen.bookings[fachId] || [];
}

export function fachName(fach) {
  return `Fach ${fach.schrank}${fach.number}`;
}

function overlaps(a, b) {
  return a.begin < b.end && b.begin < a.end;
}

/**
 * What saving the Anlage with only `keptIds` would do to the bookings of the
 * Fächer that leave: running ones keep their Fach, future ones get the first
 * free Fach in service, or stay where they are when none is free. The real
 * backend decides this on save (tickets#1043); variant C assumes it could
 * answer the same question before.
 */
export function plan(row, keptIds) {
  const kept = new Set(keptIds);
  const all = faecherOf(row);
  const leaving = all.filter((f) => f.inAnlage && !kept.has(f.id));
  const targets = all.filter(
    (f) => kept.has(f.id) && !f.outOfService && f.inAnlage
  );
  const load = {};
  targets.forEach((f) => (load[f.id] = [...bookingsAt(f.id)]));

  const result = { running: [], moved: [], stranded: [], affected: [] };
  leaving.forEach((fach) => {
    const list = bookingsAt(fach.id);
    if (list.length) result.affected.push(fach);
    list.forEach((b) => {
      if (isRunning(b)) return result.running.push({ booking: b, fach });
      const to = targets.find((t) => !load[t.id].some((x) => overlaps(x, b)));
      if (to) {
        load[to.id].push(b);
        result.moved.push({ booking: b, from: fach, to });
      } else {
        result.stranded.push({ booking: b, from: fach });
      }
    });
  });
  result.count =
    result.running.length + result.moved.length + result.stranded.length;
  return result;
}

/** Saves: the Fächer that left are out of the Anlage, bookings moved. */
export function saveFaecher(row, keptIds) {
  const p = plan(row, keptIds);
  const kept = new Set(keptIds);
  const bookings = { ...folgen.bookings };
  p.moved.forEach(({ booking: b, from, to }) => {
    bookings[from.id] = bookings[from.id].filter((x) => x !== b);
    bookings[to.id] = [...(bookings[to.id] || []), b];
  });
  folgen.bookings = bookings;
  folgen.faecher = {
    ...folgen.faecher,
    [row.id]: faecherOf(row).map((f) => ({ ...f, inAnlage: kept.has(f.id) })),
  };
  folgen.stranded = {
    ...folgen.stranded,
    [row.id]: p.stranded.map((s) => ({ ...s.booking, fach: s.from })),
  };
  return p;
}

export function strandedAt(row) {
  return folgen.stranded[row.id] || [];
}

export const PRESETS = {
  // two Fächer with bookings leave, everything finds a place
  zwei: (row) =>
    faecherOf(row)
      .filter((f) => f.inAnlage && ![3, 4].includes(f.number))
      .map((f) => f.id),
  // only Fach 2 stays, rented for the week: nothing is free for the future ones
  eng: (row) =>
    faecherOf(row)
      .filter((f) => f.inAnlage && [2, 5].includes(f.number))
      .map((f) => f.id),
};
