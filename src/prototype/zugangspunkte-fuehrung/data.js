/**
 * PROTOTYPE (tickets#1084) — stub data and an in-memory store. Throwaway,
 * never merged. Nothing here talks to the backend.
 */
import Vue from "vue";

export const PROVIDERS = [
  {
    id: "nuki",
    name: "Nuki",
    group: "doors",
    noun: "Tür",
    nounPlural: "Türen",
    icon: "mdi-door-closed-lock",
    hint: "Smart Locks an Türen, Öffnen per App",
  },
  {
    id: "salto-ks",
    name: "Salto KS",
    group: "doors",
    noun: "Tür",
    nounPlural: "Türen",
    icon: "mdi-door-closed-lock",
    hint: "Schlösser mit IQ, Fernöffnen per App",
    needsIq: true,
  },
  {
    id: "open-locker",
    name: "Open Locker",
    group: "lockers",
    noun: "Schließfachanlage",
    nounPlural: "Schließfachanlagen",
    icon: "mdi-locker-multiple",
    hint: "Schließfachanlagen mit einzelnen Fächern",
  },
  {
    id: "ifbs",
    name: "iFBS",
    group: "lockers",
    noun: "Anlage",
    nounPlural: "Anlagen",
    icon: "mdi-bicycle",
    hint: "Fahrradboxen, die Anlagen kommen vom Anbieter",
    fromProvider: true,
  },
  {
    id: "pareva",
    name: "Pareva",
    group: "lockers",
    noun: "Anlage",
    nounPlural: "Anlagen",
    icon: "mdi-locker",
    hint: "Schließfächer und Fahrradboxen",
  },
];

export const GROUPS = [
  { id: "doors", label: "Türen" },
  { id: "lockers", label: "Schließfächer & Fahrradboxen" },
];

export function provider(id) {
  return PROVIDERS.find((p) => p.id === id);
}

export const BOOKABLES = [
  { id: "b1", name: "Besprechungsraum 1. OG", place: "Rathaus" },
  { id: "b2", name: "Bürgersaal", place: "Rathaus" },
  { id: "b3", name: "Werkstatt", place: "Makerspace" },
  { id: "b4", name: "Fahrradbox", place: "Bahnhof Nord" },
  { id: "b5", name: "Schließfach", place: "Bürgerbüro" },
  { id: "b6", name: "Gemeinschaftsraum", place: "Gaarden" },
];

export function bookable(id) {
  return BOOKABLES.find((b) => b.id === id);
}

export const SCENARIOS = [
  {
    key: "neu",
    label: "Neu",
    hint: "Kein Schließsystem verbunden, kein Zugangspunkt",
  },
  {
    key: "verbunden",
    label: "Verbunden",
    hint: "Nuki ist verbunden, noch kein Zugangspunkt",
  },
  {
    key: "mitten",
    label: "Mittendrin",
    hint: "Nuki und Salto KS verbunden, zwei IQs nicht aktiviert, zwei Türen ohne Buchungsobjekt",
  },
  {
    key: "eingerichtet",
    label: "Eingerichtet",
    hint: "Laufende Pflege: drei Schließsysteme, alles zugeordnet",
  },
];

function off() {
  return { active: false, iqTotal: 0, iqActive: 0 };
}

function on(extra = {}) {
  return { active: true, iqTotal: 0, iqActive: 0, ...extra };
}

function door(id, label, providerId, bookableIds, extra = {}) {
  return {
    id,
    label,
    provider: providerId,
    kind: "door",
    qrRequired: true,
    bookableIds,
    ...extra,
  };
}

function locker(id, label, providerId, bookableIds, extra = {}) {
  return {
    id,
    label,
    provider: providerId,
    kind: "locker",
    qrRequired: false,
    bookableIds,
    ...extra,
  };
}

function scenarioState(key) {
  const systems = {};
  PROVIDERS.forEach((p) => (systems[p.id] = off()));

  if (key === "neu") return { systems, accessPoints: [] };

  if (key === "verbunden") {
    systems.nuki = on();
    return { systems, accessPoints: [] };
  }

  if (key === "mitten") {
    systems.nuki = on();
    systems["salto-ks"] = on({ iqTotal: 3, iqActive: 1 });
    return {
      systems,
      accessPoints: [
        door("ap1", "Rathaus Haupteingang", "nuki", ["b1", "b2"]),
        door("ap2", "Rathaus Seiteneingang", "nuki", ["b2"]),
        door("ap3", "Makerspace Werkstatttür", "nuki", []),
        door("ap4", "Gemeinschaftsraum Gaarden", "salto-ks", [], {
          iqActive: false,
        }),
      ],
    };
  }

  systems.nuki = on();
  systems["open-locker"] = on();
  systems.ifbs = on();
  return {
    systems,
    accessPoints: [
      door("ap1", "Rathaus Haupteingang", "nuki", ["b1", "b2"]),
      door("ap2", "Rathaus Seiteneingang", "nuki", ["b2"]),
      door("ap3", "Makerspace Werkstatttür", "nuki", ["b3"]),
      locker("ap5", "Schließfachanlage Bürgerbüro", "open-locker", ["b5"], {
        compartments: 12,
        qrRequired: true,
      }),
      locker("ap6", "Fahrradboxen Bahnhof Nord", "ifbs", ["b4"]),
      locker("ap7", "Fahrradboxen Rathausplatz", "ifbs", ["b4"]),
    ],
  };
}

export const store = Vue.observable({
  scenario: "neu",
  systems: {},
  accessPoints: [],
  nextId: 100,
});

export const prototypeBus = new Vue();

export function stub(text) {
  prototypeBus.$emit("stub", text);
}

export function loadScenario(key) {
  const state = scenarioState(key);
  store.scenario = key;
  store.systems = state.systems;
  store.accessPoints = state.accessPoints;
}

export function connect(providerId) {
  const p = provider(providerId);
  store.systems[providerId] = on(p.needsIq ? { iqTotal: 2, iqActive: 0 } : {});
}

export function activateIqs(providerId) {
  const s = store.systems[providerId];
  s.iqActive = s.iqTotal;
  store.accessPoints
    .filter((ap) => ap.provider === providerId)
    .forEach((ap) => (ap.iqActive = true));
}

export function createAccessPoint(providerId, label) {
  const p = provider(providerId);
  const id = `ap${store.nextId++}`;
  const base = { label: label || `Neue ${p.noun}` };
  const ap =
    p.group === "doors"
      ? door(id, base.label, providerId, [], {
          iqActive: p.needsIq ? false : undefined,
        })
      : locker(id, base.label, providerId, [], {
          compartments: providerId === "open-locker" ? 8 : undefined,
          qrRequired: providerId === "open-locker",
        });
  store.accessPoints.push(ap);
  return ap;
}

export function assign(apId, bookableIds) {
  const ap = store.accessPoints.find((a) => a.id === apId);
  if (ap) ap.bookableIds = [...bookableIds];
}

export function removeAccessPoint(apId) {
  store.accessPoints = store.accessPoints.filter((a) => a.id !== apId);
}

// --- derived ---------------------------------------------------------------

export function activeProviders() {
  return PROVIDERS.filter((p) => store.systems[p.id]?.active);
}

export function inactiveProviders() {
  return PROVIDERS.filter((p) => !store.systems[p.id]?.active);
}

export function accessPointsOf(providerId) {
  return store.accessPoints.filter((ap) => ap.provider === providerId);
}

export function bookableNames(ap) {
  return ap.bookableIds.map((id) => bookable(id)?.name).filter(Boolean);
}

export function iqMissing(providerId) {
  const s = store.systems[providerId];
  return s?.active ? s.iqTotal - s.iqActive : 0;
}

/** What is still missing, as a flat list a variant can render however it likes. */
export function openSteps() {
  const steps = [];
  activeProviders().forEach((p) => {
    const missing = iqMissing(p.id);
    if (missing > 0) {
      steps.push({
        key: `iq-${p.id}`,
        kind: "iq",
        provider: p.id,
        text: `${p.name}: ${missing} von ${
          store.systems[p.id].iqTotal
        } IQs nicht aktiviert`,
        detail: "Türen an diesen IQs öffnen erst nach der Aktivierung.",
      });
    }
    if (accessPointsOf(p.id).length === 0) {
      steps.push({
        key: `ap-${p.id}`,
        kind: "create",
        provider: p.id,
        text: `${p.name}: noch keine ${p.noun} angelegt`,
        detail: p.fromProvider
          ? "Die Anlagen kommen aus der Liste des Anbieters."
          : `Legen Sie die erste ${p.noun} an.`,
      });
    }
  });
  store.accessPoints
    .filter((ap) => ap.bookableIds.length === 0)
    .forEach((ap) => {
      steps.push({
        key: `assign-${ap.id}`,
        kind: "assign",
        accessPoint: ap.id,
        text: `${ap.label}: keinem Buchungsobjekt zugeordnet`,
        detail: "Ohne Buchungsobjekt bekommt niemand Zutritt.",
      });
    });
  return steps;
}

/** The three stages of the Ersteinrichtung, with a count and a done flag. */
export function stages() {
  const active = activeProviders().length;
  const aps = store.accessPoints.length;
  const assigned = store.accessPoints.filter(
    (ap) => ap.bookableIds.length > 0
  ).length;
  const iq = activeProviders().reduce((n, p) => n + iqMissing(p.id), 0);
  return [
    {
      key: "systems",
      title: "Schließsystem verbinden",
      done: active > 0 && iq === 0,
      started: active > 0,
      summary:
        active === 0
          ? "Noch keins verbunden"
          : `${active} verbunden${iq ? `, ${iq} IQs offen` : ""}`,
    },
    {
      key: "accessPoints",
      title: "Zugangspunkte anlegen",
      done: aps > 0 && openSteps().every((s) => s.kind !== "create"),
      started: aps > 0,
      summary: aps === 0 ? "Noch keiner angelegt" : `${aps} angelegt`,
    },
    {
      key: "bookables",
      title: "Buchungsobjekten zuordnen",
      done: aps > 0 && assigned === aps,
      started: assigned > 0,
      summary:
        aps === 0
          ? "Kommt nach dem Anlegen"
          : `${assigned} von ${aps} zugeordnet`,
    },
  ];
}
