/**
 * PROTOTYPE (tickets#1093) — stub data for the rows of each Anbieter.
 * Throwaway, never merged. Nothing here talks to the backend.
 *
 * Writes into the store of tickets#1084 (`../zugangspunkte-fuehrung/data`),
 * so its AssignDialog and helpers keep working, but with richer rows: ID beim
 * Anbieter, Standort, Herkunft, QR-Scan against the Anbieter's Standard,
 * Fächer, IQ.
 */
import {
  store,
  PROVIDERS,
  BOOKABLES,
  provider,
  bookable,
} from "../zugangspunkte-fuehrung/data";

export const STANDS = [
  {
    key: "wenige",
    label: "Wenige",
    hint: "Alle fünf Anbieter verbunden, je ein bis drei Zugangspunkte (14 insgesamt)",
  },
  {
    key: "viele",
    label: "Viele",
    hint: "Eine Stadt mit 41 Zugangspunkten: 16 Türen bei Nuki, 7 bei Salto KS, Schließfachanlagen und feste Fächer bei Open Locker, 9 Anlagen bei iFBS",
  },
];

// Which QR-Scan a new Zugangspunkt gets unless someone switches it: the
// server's default per Anbieter (tickets#1085). Only a deviation is news.
const QR_STANDARD = {
  nuki: true,
  "salto-ks": true,
  "open-locker": true,
  ifbs: null, // entfällt
  pareva: null, // entfällt
};

const MORE_BOOKABLES = [
  { id: "b7", name: "Turnhalle Ost", place: "Schulzentrum" },
  { id: "b8", name: "Proberaum Musikschule", place: "Kulturhaus" },
  { id: "b9", name: "Seminarraum 2", place: "VHS" },
  { id: "b10", name: "Lastenrad", place: "Rathaus" },
  { id: "b11", name: "Schlüsseltresor", place: "Bürgerbüro" },
  { id: "b12", name: "Fahrradbox Rathausplatz", place: "Rathausplatz" },
];
MORE_BOOKABLES.forEach((b) => {
  if (!BOOKABLES.some((x) => x.id === b.id)) BOOKABLES.push(b);
});

let seq = 0;
function ap(providerId, label, extra = {}) {
  const p = provider(providerId);
  seq += 1;
  return {
    id: `r${seq}`,
    label,
    provider: providerId,
    kind: p.group === "doors" ? "door" : "locker",
    lockerType: null,
    externalId: "",
    address: "",
    origin: "list",
    qrRequired: QR_STANDARD[providerId],
    bookableIds: [],
    compartments: null,
    iqActive: undefined,
    ...extra,
  };
}

function hex(n) {
  return (0x17a30000 + n * 7919).toString(16).toUpperCase();
}

function wenige() {
  return [
    ap("nuki", "Rathaus Haupteingang", {
      externalId: "17A3F2C1",
      address: "Rathausplatz 1",
      bookableIds: ["b1", "b2"],
    }),
    ap("nuki", "Rathaus Seiteneingang", {
      externalId: "17A3F2C8",
      address: "Rathausplatz 1",
      bookableIds: ["b2"],
      qrRequired: false,
    }),
    ap("nuki", "Makerspace Werkstatttür", {
      externalId: "17A3F9E4",
      bookableIds: [],
    }),
    ap("salto-ks", "Gemeinschaftsraum Gaarden", {
      externalId: "c0ffee12-77a1",
      address: "Elisabethstraße 64",
      bookableIds: ["b6"],
      iqActive: false,
    }),
    ap("salto-ks", "Gaarden Hintereingang", {
      externalId: "manuell-0042",
      address: "Elisabethstraße 64",
      origin: "manual",
      bookableIds: ["b6"],
      iqActive: true,
    }),
    ap("open-locker", "Schließfachanlage Bürgerbüro", {
      lockerType: "locker",
      compartments: 6,
      address: "Andreas-Gayk-Straße 31",
      bookableIds: ["b5"],
    }),
    ap("open-locker", "Schlüsselfach Hausmeister", {
      lockerType: "fixed",
      externalId: "Schrank B · Fach 4",
      address: "Andreas-Gayk-Straße 31",
      bookableIds: ["b11"],
    }),
    ap("ifbs", "Fahrradboxen Bahnhof Nord", {
      externalId: "LOC-4711",
      address: "Kaistraße 2",
      bookableIds: ["b4"],
    }),
    ap("ifbs", "Fahrradboxen Rathausplatz", {
      externalId: "LOC-4712",
      address: "Rathausplatz",
      bookableIds: [],
    }),
    ap("pareva", "Schließfächer Sporthalle", {
      externalId: "66570d1a1f9b6357ed971746",
      bookableIds: [],
    }),
    ap("nuki", "VHS Seminarraum 2", {
      externalId: "17A40011",
      address: "Muhliusstraße 29",
      bookableIds: ["b9"],
    }),
    ap("salto-ks", "Turnhalle Ost Nebeneingang", {
      externalId: "c0ffee12-9b20",
      bookableIds: ["b7"],
      iqActive: true,
    }),
    ap("open-locker", "Schließfachanlage Rathaus", {
      lockerType: "locker",
      compartments: 12,
      qrRequired: false,
      address: "Rathausplatz 1",
      bookableIds: [],
    }),
    ap("pareva", "Lastenrad-Box Rathaus", {
      externalId: "6657a1c2e0d4",
      address: "Rathausplatz 1",
      bookableIds: ["b10"],
    }),
  ];
}

const NUKI_DOORS = [
  ["Rathaus Haupteingang", "Rathausplatz 1", ["b1", "b2"]],
  ["Rathaus Seiteneingang", "Rathausplatz 1", ["b2"]],
  ["Rathaus Fahrradkeller", "Rathausplatz 1", ["b10"]],
  ["Makerspace Werkstatttür", "Alte Feuerwache", ["b3"]],
  ["Makerspace Lager", "Alte Feuerwache", []],
  ["VHS Haupteingang", "Muhliusstraße 29", ["b9"]],
  ["VHS Seminarraum 2", "Muhliusstraße 29", ["b9"]],
  ["Kulturhaus Bühneneingang", "Kulturhaus", ["b8"]],
  ["Kulturhaus Proberaum", "Kulturhaus", ["b8"]],
  ["Bürgerhaus Mettenhof", "Vaasastraße 43", ["b6"]],
  ["Bürgerhaus Mettenhof Küche", "Vaasastraße 43", []],
  ["Stadtteilbüro Gaarden", "Elisabethstraße 64", ["b6"]],
  ["Bibliothek Seiteneingang", "Holstenstraße 1", []],
  ["Jugendtreff Wik", "Holtenauer Straße 270", ["b6"]],
  ["Sportplatz Umkleide Nord", "Projensdorfer Straße", ["b7"]],
  ["Sportplatz Umkleide Süd", "Projensdorfer Straße", ["b7"]],
];

const SALTO_DOORS = [
  ["Turnhalle Ost Haupteingang", ["b7"], true],
  ["Turnhalle Ost Nebeneingang", ["b7"], true],
  ["Turnhalle Ost Geräteraum", [], false],
  ["Schulzentrum Aula", ["b7"], true],
  ["Schulzentrum Mensa", [], false],
  ["Gemeinschaftsraum Gaarden", ["b6"], true],
  ["Gaarden Hintereingang", ["b6"], true],
];

function viele() {
  const rows = [];
  NUKI_DOORS.forEach(([label, address, bookableIds], i) =>
    rows.push(
      ap("nuki", label, {
        externalId: hex(i),
        address,
        bookableIds,
        qrRequired: i === 1 || i === 12 ? false : true,
        origin: i === 13 ? "manual" : "list",
      })
    )
  );
  SALTO_DOORS.forEach(([label, bookableIds, iq], i) =>
    rows.push(
      ap("salto-ks", label, {
        externalId: `c0ffee12-${(4096 + i * 37).toString(16)}`,
        address: label.startsWith("Gaarden") ? "Elisabethstraße 64" : "",
        bookableIds,
        iqActive: iq,
      })
    )
  );
  rows.push(
    ap("open-locker", "Schließfachanlage Bürgerbüro", {
      lockerType: "locker",
      compartments: 12,
      address: "Andreas-Gayk-Straße 31",
      bookableIds: ["b5"],
    }),
    ap("open-locker", "Schließfachanlage Bahnhof", {
      lockerType: "locker",
      compartments: 24,
      address: "Kaistraße 2",
      bookableIds: ["b5"],
    }),
    ap("open-locker", "Schließfachanlage Rathaus", {
      lockerType: "locker",
      compartments: 8,
      qrRequired: false,
      address: "Rathausplatz 1",
      bookableIds: [],
    }),
    ap("open-locker", "Schlüsselfach Hausmeister", {
      lockerType: "fixed",
      externalId: "Schrank B · Fach 4",
      address: "Andreas-Gayk-Straße 31",
      bookableIds: ["b11"],
    }),
    ap("open-locker", "Schlüsselfach Bauhof", {
      lockerType: "fixed",
      externalId: "Schrank A · Fach 1",
      address: "Andreas-Gayk-Straße 31",
      bookableIds: [],
    })
  );
  [
    ["Bahnhof Nord", "Kaistraße 2"],
    ["Bahnhof Süd", "Sophienblatt"],
    ["Rathausplatz", "Rathausplatz"],
    ["Hörn", "Hörnbrücke"],
    ["Uni Kiel", "Olshausenstraße"],
    ["Holtenau", "Kanalufer"],
    ["Gaarden", "Vinetaplatz"],
    ["Wik", "Holtenauer Straße"],
    ["Mettenhof", "Skandinaviendamm"],
  ].forEach(([where, address], i) =>
    rows.push(
      ap("ifbs", `Fahrradboxen ${where}`, {
        externalId: `LOC-${4711 + i}`,
        address,
        bookableIds: i < 6 ? ["b12"] : [],
      })
    )
  );
  rows.push(
    ap("pareva", "Schließfächer Sporthalle", {
      externalId: "66570d1a1f9b6357ed971746",
      bookableIds: [],
    }),
    ap("pareva", "Lastenrad-Box Rathaus", {
      externalId: "6657a1c2e0d4",
      address: "Rathausplatz 1",
      bookableIds: ["b10"],
    })
  );
  return rows;
}

/** Loads a Stand into the shared store. `paused` switches Salto KS off. */
export function loadRows(key, { paused = false } = {}) {
  seq = 0;
  const systems = {};
  PROVIDERS.forEach(
    (p) =>
      (systems[p.id] = {
        active: true,
        paused: false,
        iqTotal: 0,
        iqActive: 0,
      })
  );
  const rows = key === "viele" ? viele() : wenige();
  const salto = rows.filter((r) => r.provider === "salto-ks");
  systems["salto-ks"].iqTotal = salto.length;
  systems["salto-ks"].iqActive = salto.filter((r) => r.iqActive).length;
  systems["salto-ks"].paused = paused;
  store.systems = systems;
  store.accessPoints = rows;
  store.scenario = key;
}

// --- what a row knows about itself ------------------------------------------

/** „Tür“, „Schließfachanlage · 12 Fächer“, „festes Fach“. */
export function kindLabel(row) {
  if (row.kind === "door") return "Tür";
  if (row.lockerType === "fixed") return "festes Fach";
  if (row.compartments) return `Schließfachanlage · ${row.compartments} Fächer`;
  return "Schließfachanlage";
}

/** QR-Scan as the old list said it: erforderlich, nicht nötig, entfällt. */
export function qrLabel(row) {
  if (row.qrRequired === null) return "entfällt";
  return row.qrRequired ? "erforderlich" : "nicht nötig";
}

/** Only what differs from the Anbieter's Standard, worth a marker. */
export function deviations(row) {
  const list = [];
  const std = QR_STANDARD[row.provider];
  if (std !== null && row.qrRequired !== std) {
    list.push({
      key: "qr",
      text: row.qrRequired ? "mit QR-Scan" : "ohne QR-Scan",
      tone: "neutral",
      why: row.qrRequired
        ? "Abweichend vom Standard dieses Anbieters wird der QR-Scan verlangt."
        : "Abweichend vom Standard öffnet dieser Zugangspunkt ohne QR-Scan.",
    });
  }
  if (row.origin === "manual") {
    list.push({
      key: "manual",
      text: "von Hand",
      tone: "neutral",
      why: "Nicht aus der Liste des Anbieters, die ID wurde von Hand eingetragen.",
    });
  }
  if (row.iqActive === false) {
    list.push({
      key: "iq",
      text: "IQ nicht aktiviert",
      tone: "warning",
      why: "Die Tür öffnet erst, wenn ihr IQ aktiviert ist.",
    });
  }
  return list;
}

/** Something the Verwaltung still has to do on this row. */
export function needsAction(row) {
  return row.bookableIds.length === 0 || row.iqActive === false;
}

export function hasQr(row) {
  if (row.kind === "door") return true;
  return row.provider === "open-locker";
}

/** The visible QR button: what it says, and what it opens. */
export function qrAction(row) {
  if (row.kind === "door")
    return { text: "QR-Code", title: "QR-Code drucken (PDF, A4)" };
  if (row.lockerType === "fixed")
    return { text: "QR-Code", title: "QR-Code des Fachs drucken (PDF, A4)" };
  return {
    text: "QR-Codes der Fächer",
    title: "QR-Codes der Fächer: einzeln oder als Sammel-PDF",
  };
}

/** What is left for the menu „…“ once QR-Code and Bearbeiten are visible. */
export function moreActions(row) {
  const list = [];
  if (row.kind === "door" || row.lockerType === "fixed") {
    list.push(
      { key: "svg", icon: "mdi-qrcode", text: "QR-Code als SVG" },
      { key: "png", icon: "mdi-qrcode", text: "QR-Code als PNG" },
      { key: "rotate", icon: "mdi-autorenew", text: "Scan-Code rotieren …" }
    );
  } else if (row.provider === "open-locker") {
    list.push({
      key: "rotate-all",
      icon: "mdi-autorenew",
      text: "Alle Scan-Codes rotieren …",
    });
  }
  list.push({
    key: "delete",
    icon: "mdi-delete-outline",
    text: "Löschen …",
    danger: true,
  });
  return list;
}

export function bookableList(row) {
  return row.bookableIds.map((id) => bookable(id)).filter(Boolean);
}

/** Search over Bezeichnung, ID, Standort and Buchungsobjekte. */
export function matches(row, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.label,
    row.externalId,
    row.address,
    kindLabel(row),
    ...bookableList(row).map((b) => b.name),
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((part) => hay.includes(part));
}

export function isPaused(providerId) {
  return !!store.systems[providerId]?.paused;
}
