/**
 * PROTOTYPE (tickets#1094) — stub data for QR-Codes and Rotieren.
 * Throwaway, never merged. Nothing here talks to the backend.
 *
 * Builds on the rows of tickets#1093 (Stand „Wenige“) and adds what the
 * QR question needs: a Scan-Code per Tür and festes Fach, the Fächer of each
 * Schließfachanlage von Open Locker with their own Scan-Code, and which codes
 * were rotated but not printed again yet.
 */
import Vue from "vue";
import { store, stub } from "../zugangspunkte-fuehrung/data";
import { loadRows, hasQr } from "../zeilen-je-anbieter/rows";

export const qr = Vue.observable({
  codes: {}, // key → Scan-Code; key is the row id, or `${rowId}/${fachId}`
  compartments: {}, // rowId → [{ id, schrank, number, outOfService }]
  stale: {}, // key → true after Rotieren, until the new code was downloaded
});

let counter = 0;
function newCode() {
  counter += 1;
  return `SC-${(Date.now() + counter * 7919).toString(36).toUpperCase()}`;
}

const FAECHER = {
  "Schließfachanlage Bürgerbüro": [{ schrank: "A", count: 6, out: [5] }],
  "Schließfachanlage Rathaus": [
    { schrank: "A", count: 8, out: [] },
    { schrank: "B", count: 4, out: [2] },
  ],
};

/** Loads the Stand „Wenige“ of tickets#1093 and gives every code a value. */
export function loadQr() {
  loadRows("wenige");
  const codes = {};
  const compartments = {};
  store.accessPoints.filter(hasQr).forEach((row) => {
    if (isAnlage(row)) {
      const list = [];
      (FAECHER[row.label] || []).forEach(({ schrank, count, out }) => {
        for (let n = 1; n <= count; n++) {
          const fach = {
            id: `${row.id}-${schrank}${n}`,
            schrank,
            number: n,
            outOfService: out.includes(n),
          };
          list.push(fach);
          codes[key(row, fach)] = newCode();
        }
      });
      compartments[row.id] = list;
    } else {
      codes[row.id] = newCode();
    }
  });
  qr.codes = codes;
  qr.compartments = compartments;
  qr.stale = {};
}

// --- what a row is ----------------------------------------------------------

export function isAnlage(row) {
  return row.kind === "locker" && row.lockerType === "locker";
}

export function isFixed(row) {
  return row.lockerType === "fixed";
}

export function faecher(row) {
  return qr.compartments[row.id] || [];
}

export function schraenke(row) {
  const groups = [];
  faecher(row).forEach((f) => {
    let g = groups.find((x) => x.schrank === f.schrank);
    if (!g) groups.push((g = { schrank: f.schrank, faecher: [] }));
    g.faecher.push(f);
  });
  return groups;
}

export function key(row, fach) {
  return fach ? `${row.id}/${fach.id}` : row.id;
}

export function code(row, fach) {
  return qr.codes[key(row, fach)] || "";
}

export function fachLabel(fach) {
  return `Schrank ${fach.schrank} · Fach ${fach.number}`;
}

/** „öffnet die Tür nicht“, „öffnet keines der 6 Fächer“ — for warnings. */
export function opensNot(row, fach, all) {
  if (all) return `öffnet keines der ${faecher(row).length} Fächer`;
  if (fach) return `öffnet Fach ${fach.number} nicht`;
  if (isFixed(row)) return "öffnet das Fach nicht";
  return "öffnet die Tür nicht";
}

/** The Anlage or Tür demands the QR-Scan, so a stale sticker locks out. */
export function scanRequired(row) {
  return row.qrRequired === true;
}

// --- Rotieren ---------------------------------------------------------------

export function rotate(row, fach) {
  const k = key(row, fach);
  qr.codes = { ...qr.codes, [k]: newCode() };
  qr.stale = { ...qr.stale, [k]: true };
}

export function rotateAll(row) {
  const codes = { ...qr.codes };
  const stale = { ...qr.stale };
  faecher(row).forEach((f) => {
    codes[key(row, f)] = newCode();
    stale[key(row, f)] = true;
  });
  qr.codes = codes;
  qr.stale = stale;
}

export function isStale(row, fach) {
  return !!qr.stale[key(row, fach)];
}

/** Rotated codes of this row that nobody printed since. */
export function staleCount(row) {
  if (isAnlage(row)) return faecher(row).filter((f) => isStale(row, f)).length;
  return isStale(row) ? 1 : 0;
}

// --- Downloads (stubbed) ----------------------------------------------------

function slug(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fileName(row, fach, format) {
  const base = `qr-${slug(row.label)}`;
  if (fach)
    return `${base}-schrank-${slug(fach.schrank)}-fach-${String(
      fach.number
    ).padStart(2, "0")}.${format}`;
  return `${base}.${format}`;
}

/** One code: PDF (A4), SVG or PNG. Downloading clears „noch nicht gedruckt“. */
export function download(row, fach, format) {
  const what =
    format === "pdf" ? "A4-Seite zum Drucken" : `Bild für eigene Layouts`;
  stub(`Stub: lädt ${fileName(row, fach, format)} (${what}).`);
  const k = key(row, fach);
  if (qr.stale[k]) {
    const stale = { ...qr.stale };
    delete stale[k];
    qr.stale = stale;
  }
}

/** Sammel-PDF: Etikettenbogen 2×4, jeder Schrank auf einer neuen Seite. */
export function downloadSheet(row) {
  const pages = schraenke(row).reduce(
    (n, g) => n + Math.ceil(g.faecher.length / 8),
    0
  );
  stub(
    `Stub: lädt qr-${slug(
      row.label
    )}-alle-faecher.pdf (Etikettenbogen 2×4, ${pages} ${
      pages === 1 ? "Seite" : "Seiten"
    }).`
  );
  const stale = { ...qr.stale };
  faecher(row).forEach((f) => delete stale[key(row, f)]);
  qr.stale = stale;
}

// --- A QR-Code to look at ---------------------------------------------------

/**
 * Not a real QR-Code: a deterministic pattern from the Scan-Code with the
 * three finder squares, so a rotated code visibly changes.
 */
export function qrPath(seed, n = 25) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const corners = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let dark = null;
      for (const [or, oc] of corners) {
        const y = r - or;
        const x = c - oc;
        if (y >= -1 && y <= 7 && x >= -1 && x <= 7) {
          const ring = y === 0 || y === 6 || x === 0 || x === 6;
          const core = y >= 2 && y <= 4 && x >= 2 && x <= 4;
          dark = y >= 0 && y <= 6 && x >= 0 && x <= 6 && (ring || core);
        }
      }
      if (dark === null) dark = rnd() < 0.48;
      if (dark) d += `M${c + 1} ${r + 1}h1v1h-1z`;
    }
  }
  return { d, size: n + 2 };
}
