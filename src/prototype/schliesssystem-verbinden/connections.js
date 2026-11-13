/**
 * PROTOTYPE (tickets#1087) — Zugangsdaten je Schließsystem, Verbindungstest,
 * IQs von Salto KS, Ausschalten und Entfernen. In memory, throwaway, never
 * merged. Builds on the store of tickets#1084 (`../zugangspunkte-fuehrung/data`).
 */
import Vue from "vue";
import {
  store,
  provider,
  connect,
  accessPointsOf,
} from "../zugangspunkte-fuehrung/data";

// --- Formular je Anbieter ----------------------------------------------------
// primary: zuerst sichtbar. advanced: unter „Weitere Einstellungen“, mit Standard.
// help: eingeklappter Kasten mit dem, was man vorher im Anbieter einrichtet.

const customerService = [
  {
    key: "csEmail",
    label: "E-Mail für Rückfragen zum Öffnen",
    type: "text",
    hint: "Steht in der Buchungsbestätigung, wenn eine Tür nicht öffnet.",
    optional: true,
  },
  {
    key: "csPhone",
    label: "Telefon für Rückfragen zum Öffnen",
    type: "text",
    optional: true,
  },
];

export const FORMS = {
  nuki: {
    primary: [
      {
        key: "apiToken",
        label: "API-Token",
        type: "secret",
        hint: "In Nuki Web unter Menü › API erstellen.",
      },
    ],
    advanced: [
      {
        key: "apiBaseUrl",
        label: "API-Adresse",
        type: "text",
        default: "https://api.nuki.io",
      },
      ...customerService,
    ],
    help: {
      title: "Welche Rechte braucht der Token?",
      intro:
        "Ein Token behält genau die Rechte, die beim Erstellen angehakt wurden. Er wird ungültig, sobald jemand das Passwort des Nuki-Web-Kontos ändert.",
      items: [
        "Geräte anzeigen (smartlock.readOnly): Test, Türen auflisten, Status",
        "Geräte bedienen (smartlock.action): Türen öffnen und schließen",
        "Für Keypad-Codes zusätzlich: Berechtigungen verwalten (smartlock.auth)",
        "Für Tür-Ereignisse zusätzlich: Aktivitätsprotokolle (smartlock.log)",
      ],
      note: "„Geräte verwalten“ (smartlock) nicht vergeben. Biletado ändert keine Geräte.",
    },
  },
  "salto-ks": {
    primary: [
      { key: "clientId", label: "Client-ID", type: "text" },
      { key: "clientSecret", label: "Client-Secret", type: "secret" },
      {
        key: "siteId",
        label: "Site-ID",
        type: "text",
        hint: "Die Site, deren Türen Biletado öffnet.",
      },
      {
        key: "username",
        label: "System-User (E-Mail)",
        type: "text",
        hint: "Ein eigener User nur für Biletado. An dieses Postfach schickt Salto die PIN zum Aktivieren eines IQ.",
      },
      { key: "password", label: "Passwort des System-Users", type: "secret" },
    ],
    advanced: [
      {
        key: "environment",
        label: "Umgebung",
        type: "select",
        default: "production",
        items: [
          { value: "production", text: "Production" },
          { value: "accept", text: "Accept (Sandbox)" },
        ],
      },
    ],
    help: {
      title: "Voraussetzungen in Salto KS",
      intro:
        "Biletado meldet sich als System-User an. Richten Sie ihn vorher in Salto KS ein:",
      items: [
        "Ein eigener System-User nur für Biletado, etwa „Biletado – nicht löschen“.",
        "Rolle „site_admin“ für alle Sites, deren Türen Biletado öffnen soll.",
        "Dazu „Remote Opening“ unter Lock Options.",
        "Sein Postfach bleibt erreichbar, dorthin geht die PIN für jedes IQ.",
        "Den System-User nie in der Salto-App aktivieren.",
      ],
      note: "Rolle und „Remote Opening“ kann Biletado nicht prüfen.",
      openOnConnect: true,
    },
  },
  "open-locker": {
    primary: [
      {
        key: "serverUrl",
        label: "Server-Adresse",
        type: "text",
        placeholder: "https://…",
      },
      { key: "email", label: "E-Mail des technischen Kontos", type: "text" },
      { key: "password", label: "Passwort", type: "secret" },
    ],
    advanced: [],
    help: {
      title: "Was das technische Konto braucht",
      intro:
        "Das Konto muss in Open Locker seine E-Mail bestätigt und die aktuellen Nutzungsbedingungen akzeptiert haben, sonst ist es gesperrt. Es braucht Zugriff auf die Fächer, die Sie hier anlegen.",
      items: [],
    },
  },
  ifbs: {
    primary: [
      {
        key: "serverUrl",
        label: "Server-Adresse",
        type: "text",
        placeholder: "https://…",
      },
      { key: "apiKeyId", label: "API Key ID", type: "text" },
      { key: "apiKey", label: "API Key", type: "secret" },
    ],
    advanced: [
      {
        key: "secretPhrase",
        label: "Secret Phrase",
        type: "secret",
        optional: true,
        hint: "Nur, wenn iFBS sie für den Mandanten vergeben hat.",
      },
      ...customerService,
    ],
    help: null,
  },
  pareva: {
    primary: [
      {
        key: "serverUrl",
        label: "Server-Adresse",
        type: "text",
        placeholder: "https://…",
      },
      { key: "lockerId", label: "Locker-ID", type: "text" },
      { key: "username", label: "Benutzername", type: "text" },
      { key: "password", label: "Passwort", type: "secret" },
    ],
    advanced: [],
    help: null,
  },
};

export function fieldsOf(providerId) {
  const f = FORMS[providerId];
  return [...f.primary, ...f.advanced];
}

export const STATUS_CHIP = {
  ok: { text: "Verbunden", color: "success", dark: true },
  untested: { text: "Nicht geprüft", color: "grey lighten-2", dark: false },
  error: { text: "Gestört", color: "error", dark: true },
  paused: { text: "Ausgeschaltet", color: "grey", dark: true },
};

// --- Gespeicherte Verbindungen -------------------------------------------------

const SAMPLE = {
  nuki: {
    apiToken: "x",
    apiBaseUrl: "https://api.nuki.io",
    csEmail: "zutritt@kiel.de",
  },
  "salto-ks": {
    clientId: "biletado-kiel",
    clientSecret: "x",
    siteId: "c0ffee12-77a1",
    username: "biletado@kiel.de",
    password: "x",
    environment: "production",
  },
  "open-locker": {
    serverUrl: "https://api.openlocker.example",
    email: "technik@kiel.de",
    password: "x",
  },
  ifbs: {
    serverUrl: "https://kiel.ifbs.example",
    apiKeyId: "KIEL-01",
    apiKey: "x",
  },
  pareva: {
    serverUrl: "https://pareva.example",
    lockerId: "66570d1a1f9b",
    username: "biletado",
    password: "x",
  },
};

const IQ_NAMES = [
  "IQ Gaarden EG",
  "IQ Gaarden OG",
  "IQ Rathaus Nord",
  "IQ Rathaus Süd",
];

export const conn = Vue.observable({
  outcome: "ok", // Stub: ok | fail, set from the dashed bar
  byProvider: {},
  iqs: [],
});

export function seedConnections() {
  const byProvider = {};
  Object.keys(store.systems).forEach((id) => {
    if (!store.systems[id].active) return;
    byProvider[id] = savedFrom(id, SAMPLE[id]);
  });
  conn.byProvider = byProvider;
  seedIqs();
}

function savedFrom(providerId, values) {
  const kept = {};
  const secrets = {};
  fieldsOf(providerId).forEach((f) => {
    const v = values[f.key];
    if (f.type === "secret") secrets[f.key] = !!v;
    else kept[f.key] = v ?? f.default ?? "";
  });
  return {
    values: kept,
    secrets,
    status: "ok", // ok | error | untested
    checkedAt: "heute, 09:12",
    lastError: null,
    paused: false,
  };
}

function seedIqs() {
  const s = store.systems["salto-ks"];
  if (!s?.active) {
    conn.iqs = [];
    return;
  }
  conn.iqs = IQ_NAMES.slice(0, s.iqTotal).map((name, i) => ({
    id: `iq${i + 1}`,
    name,
    doors: i === 0 ? 2 : 1,
    status: i < s.iqActive ? "aktiviert" : "offen",
  }));
}

export function connection(providerId) {
  return conn.byProvider[providerId] || null;
}

export function isConnected(providerId) {
  return !!store.systems[providerId]?.active;
}

export function isPaused(providerId) {
  return !!connection(providerId)?.paused;
}

// --- Formular-Zustand -----------------------------------------------------------

/** A fresh form for one Schließsystem: saved values, secrets left blank. */
export function newForm(providerId) {
  const saved = connection(providerId);
  const values = {};
  const secretSaved = {};
  const editing = {};
  fieldsOf(providerId).forEach((f) => {
    if (f.type === "secret") {
      values[f.key] = "";
      secretSaved[f.key] = !!saved?.secrets[f.key];
      editing[f.key] = !secretSaved[f.key];
    } else {
      values[f.key] = saved ? saved.values[f.key] : f.default ?? "";
    }
  });
  return { values, secretSaved, editing };
}

export function isDirty(providerId, form) {
  const saved = connection(providerId);
  if (!saved) return Object.values(form.values).some((v) => v);
  return fieldsOf(providerId).some((f) =>
    f.type === "secret"
      ? !!form.values[f.key]
      : (form.values[f.key] || "") !== (saved.values[f.key] || "")
  );
}

/** Pflichtfelder: alle primären, ein gespeichertes Secret zählt als gefüllt. */
export function validate(providerId, form) {
  const errors = {};
  fieldsOf(providerId).forEach((f) => {
    if (f.optional) return;
    const filled =
      f.type === "secret"
        ? !!form.values[f.key] ||
          (form.secretSaved[f.key] && !form.editing[f.key])
        : !!form.values[f.key];
    if (!filled) errors[f.key] = "Bitte ausfüllen.";
  });
  return errors;
}

// --- Verbindungstest (Stub) ---------------------------------------------------

export const SALTO_CHECKS = [
  "Client-ID und Client-Secret",
  "Anmeldung des System-Users",
  "Site",
  "Fernöffnen für den System-User",
  "Recht zum Fernöffnen an den Türen",
  "IQs",
];

const FAILURES = {
  nuki: {
    field: "apiToken",
    message:
      "Nuki lehnt den API-Token ab. Prüfen Sie, ob er noch gilt und das Recht „Geräte anzeigen“ hat.",
  },
  "salto-ks": {
    field: null,
    failedCheck: 3,
    message:
      "Der System-User darf nicht fernöffnen. Vergeben Sie in Salto KS „Remote Opening“ unter Lock Options.",
  },
  "open-locker": {
    field: "password",
    message: "Open Locker kennt diese E-Mail mit diesem Passwort nicht.",
  },
  ifbs: {
    field: "apiKey",
    message: "iFBS lehnt den API Key ab (401).",
  },
  pareva: {
    field: "serverUrl",
    message: "Pareva ist unter dieser Adresse nicht erreichbar.",
  },
};

/**
 * Resolves after a short pause with { ok, message, field, checks }. The outcome
 * comes from the dashed bar; leere Pflichtfelder scheitern immer vorher.
 */
export function runTest(providerId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const ok = conn.outcome === "ok";
      const fail = FAILURES[providerId];
      let checks = null;
      if (providerId === "salto-ks") {
        checks = SALTO_CHECKS.map((label, i) => {
          if (!ok && i === fail.failedCheck) return { label, state: "fail" };
          if (!ok && i > fail.failedCheck) return { label, state: "skip" };
          if (i === 5) {
            const open = conn.iqs.filter(
              (q) => q.status !== "aktiviert"
            ).length;
            return open
              ? { label: `IQs: ${open} nicht aktiviert`, state: "warn" }
              : { label, state: "ok" };
          }
          return { label, state: "ok" };
        });
      }
      resolve(
        ok
          ? {
              ok: true,
              message: `${
                provider(providerId).name
              } antwortet. Die Zugangsdaten stimmen.`,
              checks,
            }
          : { ok: false, message: fail.message, field: fail.field, checks }
      );
    }, 900);
  });
}

// --- Speichern, Ausschalten, Entfernen ------------------------------------------

/** status: ok (Test bestanden) | untested | error (gespeichert trotz Fehler). */
export function save(providerId, form, status, error = null) {
  const first = !isConnected(providerId);
  const prev = connection(providerId);
  const values = {};
  const secrets = {};
  fieldsOf(providerId).forEach((f) => {
    if (f.type === "secret") {
      secrets[f.key] = form.editing[f.key]
        ? !!form.values[f.key]
        : !!form.secretSaved[f.key];
    } else values[f.key] = form.values[f.key];
  });
  Vue.set(conn.byProvider, providerId, {
    values,
    secrets,
    status,
    checkedAt: status === "untested" ? prev?.checkedAt || null : "gerade eben",
    lastError: status === "error" ? error : null,
    paused: prev?.paused || false,
  });
  if (first) {
    connect(providerId);
    if (providerId === "salto-ks") seedIqs();
  }
  return first;
}

export function pause(providerId) {
  connection(providerId).paused = true;
}

export function resume(providerId) {
  connection(providerId).paused = false;
}

export function canRemove(providerId) {
  return accessPointsOf(providerId).length === 0;
}

/** Entfernen: Zugangsdaten löschen. Nur ohne Zugangspunkte. */
export function remove(providerId) {
  Vue.delete(conn.byProvider, providerId);
  store.systems[providerId] = { active: false, iqTotal: 0, iqActive: 0 };
  if (providerId === "salto-ks") conn.iqs = [];
}

// --- IQs von Salto KS -------------------------------------------------------------

function syncIqCount() {
  const s = store.systems["salto-ks"];
  s.iqTotal = conn.iqs.length;
  s.iqActive = conn.iqs.filter((q) => q.status === "aktiviert").length;
  if (s.iqActive === s.iqTotal) {
    store.accessPoints
      .filter((ap) => ap.provider === "salto-ks")
      .forEach((ap) => (ap.iqActive = true));
  }
}

/** Stub for the wizard of today: Vorbereitung › PIN-Mail › PIN › Fertig. */
export function startIq(iqId) {
  const iq = conn.iqs.find((q) => q.id === iqId);
  iq.status = "pin";
}

export function finishIq(iqId) {
  const iq = conn.iqs.find((q) => q.id === iqId);
  iq.status = "aktiviert";
  syncIqCount();
}

export function iqSummary() {
  const total = conn.iqs.length;
  const active = conn.iqs.filter((q) => q.status === "aktiviert").length;
  return { total, active, open: total - active };
}
