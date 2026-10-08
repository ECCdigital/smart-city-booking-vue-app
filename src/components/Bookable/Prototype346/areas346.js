// PROTOTYPE (ECCdigital/tickets#346), throwaway: never merge.
// The areas only the editor has today, each with the editor component that
// renders it (embedded, per the principle „ein Feld, eine Komponente“), how
// to tell it is used, and where variant B sorts it into the flow.

const len = (value) => (Array.isArray(value) ? value.length : 0);

export const AREAS = [
  {
    key: "lockers",
    title: "Schließsysteme",
    hint: "Welche Schlösser oder Zugangspunkte Buchende mit der Buchung öffnen.",
    comp: "BookableEditAccessLocks",
    sectionId: null,
    expertOnly: true,
    stepB: "permission",
    used: (b) => len(b.accessPointDetails?.accessPointIds) > 0,
    summary: (b) =>
      `${len(b.accessPointDetails?.accessPointIds)} Zugangspunkt(e)`,
  },
  {
    key: "checkout",
    title: "Zusatzobjekte",
    hint: "Zusatzbuchungen, die im Checkout mit angeboten werden.",
    comp: "BookableEditRelatedBookables",
    sectionId: "be-section-related-checkout",
    expertOnly: true,
    stepB: "price",
    used: (b) => len(b.checkoutBookableIds) > 0,
    summary: (b) => `${len(b.checkoutBookableIds)} Zusatzobjekt(e)`,
  },
  {
    key: "hierarchy",
    title: "Hierarchie",
    hint: "Teil-von-Beziehungen zu anderen Buchungsobjekten.",
    comp: "BookableEditRelatedBookables",
    sectionId: "be-section-related-hierarchy",
    expertOnly: true,
    stepB: "identity",
    used: (b) => len(b.relatedBookableIds) > 0,
    summary: (b) => `Teil von ${len(b.relatedBookableIds)} Objekt(en)`,
  },
  {
    key: "group-booking",
    title: "Serienbuchung",
    hint: "Wiederkehrende Buchungen erlauben.",
    comp: "BookableEditPermissions",
    sectionId: "be-section-permissions-group-booking",
    expertOnly: false,
    stepB: "availability",
    used: (b) => !!b.groupBooking?.enabled,
    summary: () => "erlaubt",
  },
  {
    key: "cancellation",
    title: "Stornierung",
    hint: "Ob Buchende selbst absagen können.",
    comp: "BookableEditPermissions",
    sectionId: "be-section-permissions-cancellation",
    expertOnly: true,
    stepB: "approval",
    used: (b) => b.cancellationPolicy?.userCancellable === false,
    summary: () => "Buchende können nicht selbst stornieren",
  },
  {
    key: "attachments",
    title: "Anhänge",
    hint: "Was Buchende bestätigen müssen und welche Unterlagen sie bekommen.",
    comp: "BookableEditAttachments",
    sectionId: null,
    expertOnly: false,
    stepB: "approval",
    used: (b) => len(b.attachments) > 0,
    summary: (b) => `${len(b.attachments)} Anhang/Anhänge`,
  },
  {
    key: "custom-fields",
    title: "Eigene Felder",
    hint: "Werte für die Felder, die der Mandant für Buchungsobjekte festlegt.",
    comp: "BookableEditCustomFields",
    sectionId: null,
    expertOnly: false,
    stepB: "identity",
    used: (b) =>
      (b.customFields || []).some((f) => f.hasValue) ||
      len(b.customFieldDefinitions) > 0,
    summary: (b) =>
      `${(b.customFields || []).filter((f) => f.hasValue).length} von ${len(
        b.customFields
      )} Feldern gefüllt`,
  },
  {
    key: "required-fields",
    title: "Pflichtfelder",
    hint: "Welche Kontaktangaben Buchende im Checkout machen müssen.",
    comp: "BookableEditAdditional",
    sectionId: "be-section-additional-required-fields",
    expertOnly: true,
    stepB: "approval",
    // A new bookable already carries address, zip code and city (#339:
    // „genutzt“ = deviates from a new bookable, not „not empty“).
    used: (b) =>
      [...(b.requiredFields || [])].sort().join() !== "address,city,zipCode",
    summary: (b) => `${len(b.requiredFields)} Pflichtfeld(er)`,
  },
  // Not named in the question of #346, but the editor-only rest of
  // „Sonstiges“: shown to ask whether it belongs here or to the basics.
  {
    key: "notes",
    title: "Buchungshinweise",
    hint: "Kurze Hinweise im Checkout und in der Bestätigungsmail. (Nicht in der Frage von #346 – gehört er dazu?)",
    comp: "BookableEditAdditional",
    sectionId: "be-section-additional-notes",
    expertOnly: false,
    stepB: "approval",
    used: (b) => !!(b.bookingNotes || "").trim(),
    summary: () => "gesetzt",
  },
];

export function areaByKey(key) {
  return AREAS.find((area) => area.key === key);
}

/** #339: a used expert option is always shown, an unused one only in expert mode. */
export function areaShown(area, bookable, expertMode) {
  return !area.expertOnly || expertMode || area.used(bookable);
}

export function shownAreas(bookable, expertMode) {
  return AREAS.filter((area) => areaShown(area, bookable, expertMode));
}

/** The prototype's own steps: titles and questions. */
export const PROTO_STEPS = {
  more: {
    title: "Weitere Einstellungen",
    why: "Optional. Was die meisten Buchungsobjekte nicht brauchen – aufklappen, was zutrifft.",
  },
  pick: {
    title: "Was gehört noch dazu?",
    why: "Wählen Sie, was dieses Buchungsobjekt zusätzlich braucht. Jede Wahl wird ein eigener Schritt.",
  },
  publish: {
    title: "Veröffentlichung",
    why: "Wer kann das Buchungsobjekt finden und buchen? (Platzhalter aus #345)",
  },
};
