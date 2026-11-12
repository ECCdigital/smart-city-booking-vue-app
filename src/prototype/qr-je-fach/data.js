/**
 * PROTOTYPE — QR-Code je Fach (ECCdigital/tickets#1049). Throwaway, never merged.
 *
 * Stub data for the access point list. Nothing here talks to a backend: the
 * downloads and rotations only announce what the real button would do.
 */
import Vue from "vue";

function compartments(bankId, bankName, count, outOfService = []) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${bankId}-uuid-${String(i + 1).padStart(2, "0")}`,
    number: i + 1,
    lockerBank: { id: bankId, name: bankName },
    outOfService: outOfService.includes(i + 1),
    // In memory only: how often the prototype has rotated this Fach.
    rotations: 0,
  }));
}

export function initialAccessPoints() {
  return [
    {
      id: "ap-door-1",
      label: "Haupteingang Quartierszentrum",
      provider: "nuki",
      providerTitle: "Nuki",
      type: "door",
      typeLabel: "Tür",
      isLocker: false,
      qrScanRequired: true,
      assignment: "Gemeinschaftsraum",
      compartments: [],
    },
    {
      id: "ap-locker-ol",
      label: "Quartiersschrank Gaarden",
      provider: "openLocker",
      providerTitle: "Open Locker",
      type: "locker",
      typeLabel: "Schließfachanlage",
      isLocker: true,
      hasQr: true,
      qrScanRequired: false,
      assignment: "Paketfach Gaarden",
      compartments: [
        ...compartments("bank-a", "A", 12, [5]),
        ...compartments("bank-b", "B", 8, [8]),
      ],
    },
    {
      id: "ap-locker-ifbs",
      label: "Fahrradboxen Bahnhof",
      provider: "ifbs",
      providerTitle: "iFBS",
      type: "locker",
      typeLabel: "Schließfachanlage",
      isLocker: true,
      hasQr: false,
      qrScanRequired: false,
      assignment: "Fahrradbox",
      compartments: [],
    },
  ];
}

/** Fächer grouped by Schließfachschrank, in the order of the list. */
export function groupByBank(list) {
  const groups = [];
  list.forEach((c) => {
    let group = groups.find((g) => g.lockerBank.id === c.lockerBank.id);
    if (!group) {
      group = { lockerBank: c.lockerBank, compartments: [] };
      groups.push(group);
    }
    group.compartments.push(c);
  });
  return groups;
}

export function compartmentName(c) {
  return `Schrank ${c.lockerBank.name} · Fach ${c.number}`;
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function fileName(anlage, compartment, format) {
  const base = `qr-${slug(anlage.label)}`;
  if (!compartment) return `${base}-alle-faecher.${format}`;
  const nr = String(compartment.number).padStart(2, "0");
  return `${base}-schrank-${slug(
    compartment.lockerBank.name
  )}-fach-${nr}.${format}`;
}

// One bus for the stub messages, shown as a snackbar by the prototype view.
export const prototypeBus = new Vue();

export function stub(text) {
  prototypeBus.$emit("stub", text);
}

export const FORMATS = [
  { key: "pdf", text: "PDF (A4)", icon: "mdi-file-pdf-box" },
  { key: "svg", text: "SVG", icon: "mdi-qrcode" },
  { key: "png", text: "PNG", icon: "mdi-qrcode" },
];

// ---------------------------------------------------------------------------
// A fake QR code: right size and look, finder patterns included, but it
// encodes nothing. The real one renders the server.

function rng(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

export function fakeQrSvg(seed, modules = 37) {
  const rand = rng(seed);
  const cells = [];
  const inFinder = (x, y) =>
    (x < 8 && y < 8) ||
    (x >= modules - 8 && y < 8) ||
    (x < 8 && y >= modules - 8);
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (inFinder(x, y)) continue;
      if (rand() < 0.48) cells.push(`M${x + 4} ${y + 4}h1v1h-1z`);
    }
  }
  const finder = (ox, oy) =>
    `M${ox} ${oy}h7v7h-7zM${ox + 1} ${oy + 1}v5h5v-5zM${ox + 2} ${
      oy + 2
    }h3v3h-3z`;
  const size = modules + 8;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path fill="#000" fill-rule="evenodd" d="${cells.join("")}${finder(
      4,
      4
    )}${finder(modules - 3, 4)}${finder(4, modules - 3)}"/></svg>`
  );
}

export function fakeQrDataUrl(seed) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(fakeQrSvg(seed))}`;
}
