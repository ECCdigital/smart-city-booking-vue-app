// PROTOTYPE (ECCdigital/tickets#342), throwaway: never merge.
// One rule for the booking mode in both modes: which modes are offered, what
// they are called (switchable via `?namen=E|A|N`) and how a choice lands on
// the bookable - `applyBookingMode` from the flow, sent as one patch.

import {
  applyBookingMode,
  bookingModeOf,
  handlesExternalAvailability,
} from "@/utils/bookableFlow";
import { isBookableExpertOnlyBookingType } from "@/utils/bookableExpertMode";

export const MODES = [
  "schedule",
  "timePeriod",
  "blockPeriod",
  "week",
  "month",
  "independent",
];

export const ICONS = {
  schedule: "mdi-calendar-range",
  timePeriod: "mdi-clock-outline",
  blockPeriod: "mdi-calendar-sync",
  week: "mdi-calendar-week",
  month: "mdi-calendar-month",
  independent: "mdi-clock-remove-outline",
};

/** Three naming schemes: the editor's today, the flow's today, a proposal. */
export const NAMINGS = {
  E: {
    name: "Namen des Editors",
    title: "Buchungstyp",
    labels: {
      schedule: "Freie Zeitwahl",
      timePeriod: "Feste Zeitfenster",
      blockPeriod: "Zeiträume",
      week: "Wochenbuchung",
      month: "Monatsbuchung",
      independent: "Zeitunabhängig",
    },
    longRange: "Langzeit",
  },
  A: {
    name: "Namen des Ablaufs",
    title: "Verfügbarkeit",
    labels: {
      schedule: "Freie Zeitwahl",
      timePeriod: "Feste Zeiten",
      blockPeriod: "Zeiträume",
      week: "Wochen",
      month: "Monate",
      independent: "Ohne Zeit",
    },
    longRange: "Langzeit",
  },
  N: {
    name: "Vorschlag",
    title: "Buchungsart",
    labels: {
      schedule: "Freie Zeitwahl",
      timePeriod: "Feste Zeitfenster",
      blockPeriod: "Zeiträume",
      week: "Ganze Wochen",
      month: "Ganze Monate",
      independent: "Ohne Zeit",
    },
    longRange: "Ganze Wochen oder Monate",
  },
};

/** What the booker does, one sentence per mode (the flow's `explain`). */
export const EXPLAIN = {
  schedule:
    "Buchende suchen sich im Kalender einen freien Zeitpunkt und wählen die Dauer innerhalb der Grenzen.",
  timePeriod:
    "Sie geben feste Zeitfenster vor, etwa montags 9–12 Uhr; Buchende wählen ein freies davon.",
  blockPeriod:
    "Sie geben wiederkehrende, tagesübergreifende Zeiträume vor, etwa ein Wochenende; Buchende wählen einen davon.",
  week: "Buchende buchen ganze Wochen am Stück.",
  month: "Buchende buchen ganze Kalendermonate am Stück.",
  independent:
    "Buchende buchen eine Menge ohne Zeitauswahl. Die Kapazität steuert „Anzahl & Kapazität“.",
};

export const LONG_RANGE_INFO =
  "Bei ganzen Wochen und Monaten prüft das System keine Öffnungszeiten oder Ausnahmen.";

export const EXTERNAL = {
  title: "Verfügbarkeit kommt von einem externen Anbieter",
  text: "Die Verfügbarkeit wird extern geführt. Deaktivieren Sie die externe Steuerung unter „Schließsysteme“, um sie hier selbst zu pflegen.",
};

/**
 * Decided in #339: an expert mode in use is always shown and editable, an
 * unused one only in expert mode.
 */
export function offeredModes(bookable, expertMode) {
  const current = bookingModeOf(bookable);
  return MODES.filter(
    (mode) =>
      expertMode || mode === current || !isBookableExpertOnlyBookingType(mode)
  );
}

export { applyBookingMode, bookingModeOf, handlesExternalAvailability };
