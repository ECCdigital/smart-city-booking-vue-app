/**
 * PROTOTYPE (ECCdigital/tickets#1159) — stub data. Throwaway, never merged.
 *
 * Open Locker lists its Fächer by Schließfachschrank. Some are taken by an
 * other Anlage already. Each case is one Buchungsobjekt with its Einsatzfall
 * and its `amount` (`null` = unbegrenzt), and the Fächer its Anlage already
 * has (empty = the Anlage is new).
 */

function bank(id, name, count, startAt = 1) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}-${startAt + i}`,
    number: startAt + i,
    lockerBank: { id, name },
  }));
}

export const LISTING = [
  ...bank("rathaus", "Rathaus, Eingang Süd", 6),
  ...bank("bahnhof", "Bahnhof Nord", 12),
];

// Fächer other Anlagen hold: never offered.
export const TAKEN = {
  "bahnhof-1": "Lastenräder Bahnhof",
  "bahnhof-2": "Lastenräder Bahnhof",
  "rathaus-1": "Schlüssel Ratssaal",
};

export const CASES = [
  {
    key: "raum",
    label: "Schlüssel für einen Raum",
    icon: "mdi-key-variant",
    use: "key",
    bookable: {
      id: "b-raum",
      name: "Besprechungsraum 2.14",
      type: "room",
      typeLabel: "Raum",
      amount: 1,
    },
    anlageLabel: "Schlüssel Besprechungsraum 2.14",
    compartments: [],
  },
  {
    key: "fahrrad",
    label: "Fahrradboxen",
    icon: "mdi-bike",
    use: "item",
    bookable: {
      id: "b-fahrrad",
      name: "Fahrradboxen Bahnhof Nord",
      type: "resource",
      typeLabel: "Ressource",
      amount: 6,
    },
    anlageLabel: "Fahrradboxen Bahnhof Nord",
    compartments: [],
  },
  {
    key: "geraete",
    label: "Tablets ausleihen",
    icon: "mdi-tablet",
    use: "item",
    bookable: {
      id: "b-tablets",
      name: "Tablets Stadtbibliothek",
      type: "resource",
      typeLabel: "Ressource",
      amount: 4,
    },
    anlageLabel: "Tablets Stadtbibliothek",
    compartments: [],
  },
  {
    key: "unbegrenzt",
    label: "Anzahl unbegrenzt",
    icon: "mdi-infinity",
    use: "item",
    bookable: {
      id: "b-lastenrad",
      name: "Lastenrad Rathaus",
      type: "resource",
      typeLabel: "Ressource",
      amount: null,
    },
    anlageLabel: "Lastenrad Rathaus",
    compartments: [],
  },
  {
    key: "bestehend",
    label: "Bestehend, 1 Fach außer Betrieb",
    icon: "mdi-pencil",
    use: "item",
    bookable: {
      id: "b-fahrrad",
      name: "Fahrradboxen Bahnhof Nord",
      type: "resource",
      typeLabel: "Ressource",
      amount: 6,
    },
    anlageLabel: "Fahrradboxen Bahnhof Nord",
    compartments: [3, 4, 5, 6, 7, 8].map((n) => ({
      id: `bahnhof-${n}`,
      number: n,
      lockerBank: { id: "bahnhof", name: "Bahnhof Nord" },
      outOfService: n === 5,
    })),
  },
];

export const BOOKABLES = CASES.filter(
  (c, i, all) => all.findIndex((o) => o.bookable.id === c.bookable.id) === i
).map((c) => c.bookable);

export function inService(compartments) {
  return compartments.filter((c) => !c.outOfService).length;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** „1 Fach“ / „3 Fächer“ */
export function faecher(count) {
  return count === 1 ? "1 Fach" : `${count} Fächer`;
}
