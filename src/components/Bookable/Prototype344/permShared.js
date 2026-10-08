// PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
// The rules every variant shares. Only the form differs per variant.
//
// From the backend research (ECCdigital/tickets#338):
// - `permittedUsers`/`permittedRoles` always restrict booking, and a set list
//   already needs a sign-in; `requiresLogin` only changes the message.
// - `bookingDiscounts` take the highest percent of all hits, 0–100 integers;
//   at 0 € they change nothing but stay stored and act once a price is set.

import { isPaid } from "@/utils/bookableFlow";

export const ACCESS = ["everyone", "signedIn", "selected"];

export const NAMINGS = {
  E: {
    name: "Editor",
    section: "Berechtigungen",
    who: "Berechtigungen",
    whoHint: "",
    access: {
      everyone: "Ohne Login",
      signedIn: "Login erforderlich",
      selected: "Individuelle Berechtigungen",
    },
    accessHint: {
      everyone: "",
      signedIn: "Benutzer müssen angemeldet sein, um zu buchen.",
      selected: "",
    },
    loginTitle: "Anmeldepflicht",
    loginLabel: "Login erforderlich zum Buchen",
    loginLocked: "",
    listsTitle: "Individuelle Berechtigungen",
    users: "Verfügbar für Benutzer",
    roles: "Verfügbar für Rollen",
    listsHint:
      "Berechtigen Sie bestimmte Benutzer oder alle Benutzer einer Rolle, dieses Objekt zu sehen.",
    selectedEmpty: "",
    discounts: "Preisrabatte",
    discountsHint:
      "Legen Sie einen prozentualen Preisnachlass (0–100 %) pro Benutzer oder Rolle fest. 100 % entspricht einer kostenfreien Buchung.",
    discountUsers: "Rabatt für Benutzer",
    discountRoles: "Rabatt für Rollen",
    discountsNotPaid: "",
    percent: "Rabatt",
    add: "Hinzufügen",
    tableTitle: "",
    canBook: "",
  },
  A: {
    name: "Ablauf",
    section: "Berechtigung",
    who: "Wer darf buchen?",
    whoHint: "Bestimmt, wer dieses Objekt überhaupt buchen kann.",
    access: {
      everyone: "Jeder",
      signedIn: "Angemeldete Nutzer",
      selected: "Bestimmte Rollen und Personen",
    },
    accessHint: {
      everyone: "Ohne Konto buchbar, offen für alle.",
      signedIn: "Konto nötig, aber jeder registrierte Nutzer darf buchen.",
      selected:
        "Nur ausgewählte Gruppen oder Personen – ein Konto ist dann automatisch nötig.",
    },
    loginTitle: "Angemeldete Nutzer",
    loginLabel: "Konto nötig",
    loginLocked: "Bei bestimmten Rollen und Personen ist ein Konto immer nötig.",
    listsTitle: "Bestimmte Rollen und Personen",
    users: "Personen",
    roles: "Rollen",
    listsHint: "",
    selectedEmpty:
      "Solange niemand gewählt ist, darf jeder angemeldete Nutzer buchen. Wählen Sie Rollen oder Personen, um einzuschränken.",
    discounts: "Wer bucht kostenfrei?",
    discountsHint:
      "Preis-Ausnahme: Diese Rollen oder Personen buchen günstiger oder ohne Zahlung – 100 % entspricht einer kostenfreien Buchung.",
    discountUsers: "Nachlass für Personen",
    discountRoles: "Nachlass für Rollen",
    discountsNotPaid:
      "Dieses Objekt ist ohnehin kostenfrei – eine Ausnahme wirkt erst, sobald es einen Preis hat.",
    percent: "Nachlass",
    add: "Hinzufügen",
    tableTitle: "Rollen und Personen",
    canBook: "darf buchen",
  },
  N: {
    name: "Neu",
    section: "Berechtigung",
    who: "Wer darf buchen?",
    whoHint: "Gilt für jede Buchung, auch über einen direkten Link.",
    access: {
      everyone: "Alle",
      signedIn: "Alle mit Konto",
      selected: "Nur ausgewählte Rollen und Personen",
    },
    accessHint: {
      everyone: "Auch ohne Anmeldung.",
      signedIn: "Wer bucht, meldet sich an.",
      selected:
        "Nur sie können buchen, mit Konto.",
    },
    loginTitle: "Konto nötig",
    loginLabel: "Zum Buchen anmelden",
    loginLocked: "Bei ausgewählten Rollen und Personen immer nötig.",
    listsTitle: "Ausgewählte Rollen und Personen",
    users: "Personen",
    roles: "Rollen",
    listsHint: "",
    selectedEmpty:
      "Noch niemand gewählt. Bis dahin darf jede Person mit Konto buchen.",
    discounts: "Preisnachlass",
    discountsHint:
      "Diese Rollen und Personen zahlen weniger, 100 % heißt kostenfrei. Trifft mehr als ein Eintrag zu, gilt der höchste.",
    discountUsers: "Personen",
    discountRoles: "Rollen",
    discountsNotPaid:
      "Wirkt erst, sobald das Objekt einen Preis hat. Bis dahin bleiben die Einträge gespeichert.",
    percent: "Nachlass",
    add: "Rolle oder Person hinzufügen",
    tableTitle: "Rollen und Personen",
    canBook: "darf buchen",
  },
};

export function lists(bookable) {
  return {
    users: bookable?.permittedUsers || [],
    roles: bookable?.permittedRoles || [],
  };
}

export function hasLists(bookable) {
  const { users, roles } = lists(bookable);
  return users.length > 0 || roles.length > 0;
}

/** As `accessOf` in bookableFlow.js: lists set means `selected`. */
export function accessOf(bookable) {
  if (hasLists(bookable)) return "selected";
  return bookable?.requiresLogin ? "signedIn" : "everyone";
}

/**
 * One rule for both modes: `everyone` clears login and lists, `signedIn`
 * clears the lists, `selected` sets login. „Selected“ with nobody named is
 * the same data as `signedIn` and books the same in the backend, so the
 * component may hold the choice transiently (as the price form in #343).
 */
export function applyAccess(bookable, access) {
  bookable.requiresLogin = access !== "everyone";
  if (access !== "selected") {
    bookable.permittedRoles = [];
    bookable.permittedUsers = [];
  }
  return bookable;
}

/** Lists only ever come with a login: the patch for new lists. */
export function listsPatch(bookable, changes) {
  const next = { ...lists(bookable), ...changes };
  const set = next.users.length > 0 || next.roles.length > 0;
  return {
    permittedUsers: next.users,
    permittedRoles: next.roles,
    ...(set ? { requiresLogin: true } : {}),
  };
}

/** Saved data the unified rule would change on load (normalizeBookable). */
export function listsWithoutLogin(bookable) {
  return hasLists(bookable) && !bookable?.requiresLogin;
}

export function discountsOf(bookable) {
  return {
    users: bookable?.bookingDiscounts?.users || [],
    roles: bookable?.bookingDiscounts?.roles || [],
  };
}

export function discountsUsed(bookable) {
  const { users, roles } = discountsOf(bookable);
  return users.length > 0 || roles.length > 0;
}

/** Expert option after #339: shown in expert mode or when used. */
export function offersDiscounts(bookable, expertMode) {
  return expertMode || discountsUsed(bookable);
}

export function paid(bookable) {
  return isPaid(bookable);
}

export const ID_KEY = { user: "userId", role: "roleId" };

/** The patch for the discount list of `type` after `change(list)`. */
export function discountsPatch(bookable, type, change) {
  const current = discountsOf(bookable);
  const key = type === "user" ? "users" : "roles";
  const list = current[key].map((entry) => ({ ...entry }));
  change(list);
  return { bookingDiscounts: { ...current, [key]: list } };
}

/**
 * The checks for bookableValidation.js, after point 7 of #340: only what
 * the backend rejects (bookableSchema.js:217-266).
 */
export function permissionIssues(bookable) {
  const issues = [];
  const { users, roles } = discountsOf(bookable);
  [
    ["user", users],
    ["role", roles],
  ].forEach(([type, entries]) => {
    entries.forEach((entry, index) => {
      const value = entry.discountPercent;
      if (
        value === "" ||
        value == null ||
        !Number.isInteger(Number(value)) ||
        value < 0 ||
        value > 100
      ) {
        issues.push({
          field: `bookingDiscounts.${type}s.${index}.discountPercent`,
          message: "Bitte eine ganze Zahl von 0 bis 100 eingeben.",
        });
      }
    });
  });
  return issues;
}

export function percentError(value) {
  if (value === "" || value == null) return "Bitte eine ganze Zahl von 0 bis 100 eingeben.";
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 100)
    return "Bitte eine ganze Zahl von 0 bis 100 eingeben.";
  return null;
}
