/**
 * PROTOTYPE (tickets#1085) — what each provider lists, and which fields a
 * Zugangspunkt of it really needs. Throwaway, never merged. Builds on the
 * in-memory store of tickets#1084.
 *
 * The facts mirror `src/utilities/access-points.js` on feat/660-open-locker:
 * - Modus: the PIN modes are „bald verfügbar“ everywhere, so every provider
 *   opens per App today. No variant asks for it; A shows it as a fixed line.
 * - Typ and Anbieter: settled by the section the dialog opens from. Only Open
 *   Locker asks: Schließfachanlage or festes Fach.
 * - Öffnungsart: Nuki doors only.
 * - QR-Scan: doors and an Open Locker Schließfachanlage; iFBS and Pareva
 *   Anlagen have none.
 * - Standort-ID beim Anbieter: read by no provider, informative only.
 */
import { store, provider } from "../zugangspunkte-fuehrung/data";

export const OPEN_ACTIONS = [
  {
    value: "auto",
    text: "Automatisch",
    hint: "Falle ziehen, wo eine Falle ist, sonst aufschließen.",
  },
  {
    value: "unlock",
    text: "Aufschließen",
    hint: "Riegel zurück, zum Öffnen Klinke drücken.",
  },
  {
    value: "unlatch",
    text: "Falle ziehen",
    hint: "Die Tür lässt sich aufdrücken.",
  },
  {
    value: "lock_n_go",
    text: "Lock'n'Go",
    hint: "Aufschließen, kurz warten, wieder abschließen.",
  },
  {
    value: "lock_n_go_unlatch",
    text: "Lock'n'Go mit Falle ziehen",
    hint: "Wie Lock'n'Go, mit gezogener Falle.",
  },
];

export function openActionText(value) {
  return OPEN_ACTIONS.find((o) => o.value === value)?.text || "Automatisch";
}

// What the providers list. `taken` marks what already is a Zugangspunkt.
const LISTINGS = {
  nuki: [
    { id: "17A3F2C1", name: "Rathaus Haupteingang", account: "Konto 48213" },
    { id: "17A3F9E4", name: "Makerspace Werkstatttür", account: "Konto 48213" },
    {
      id: "17A40B22",
      name: "Bürgerbüro Hintereingang",
      account: "Konto 48213",
      openActions: ["auto", "unlock", "lock_n_go"],
    },
    { id: "17A41C08", name: "Jugendzentrum Eingang", account: "Konto 48213" },
    {
      id: "17A42D90",
      name: "Sporthalle Nord Geräteraum",
      account: "Konto 51007",
    },
  ],
  "salto-ks": [
    {
      id: "c0ffee12-77a1",
      name: "Gemeinschaftsraum Gaarden",
      account: "Site Gaarden",
      iqActive: false,
    },
    {
      id: "c0ffee12-81b3",
      name: "Stadtteilbüro Gaarden",
      account: "Site Gaarden",
      iqActive: true,
    },
    {
      id: "c0ffee12-90c4",
      name: "Bibliothek Gaarden Seiteneingang",
      account: "Site Gaarden",
      iqActive: false,
    },
  ],
  ifbs: [
    { id: "LOC-4711", name: "Bahnhof Nord", detail: "12 Boxen" },
    { id: "LOC-4712", name: "Rathausplatz", detail: "8 Boxen" },
    { id: "LOC-4720", name: "Uni Campus Süd", detail: "20 Boxen" },
    { id: "LOC-4733", name: "Hörn-Brücke", detail: "6 Boxen" },
  ],
};

// Open Locker lists Fächer, grouped by Schließfachschrank.
const OPEN_LOCKER_BANKS = [
  { bank: "A", place: "Bürgerbüro, Erdgeschoss", count: 6, outOfService: [] },
  {
    bank: "B",
    place: "Bürgerbüro, Erdgeschoss",
    count: 6,
    outOfService: ["B5"],
  },
  { bank: "C", place: "Stadtbücherei", count: 4, outOfService: [] },
];

export function compartmentBanks() {
  const taken = new Set(
    store.accessPoints
      .filter((ap) => ap.provider === "open-locker")
      .flatMap(
        (ap) => ap.compartmentIds || (ap.externalId ? [ap.externalId] : [])
      )
  );
  return OPEN_LOCKER_BANKS.map((b) => ({
    ...b,
    compartments: Array.from({ length: b.count }, (_, i) => {
      const id = `${b.bank}${i + 1}`;
      return {
        id,
        name: `Fach ${i + 1}`,
        taken: taken.has(id),
        outOfService: b.outOfService.includes(id),
      };
    }),
  }));
}

/** The provider's listing, each entry marked when it already is a Zugangspunkt. */
export function listing(providerId) {
  const taken = new Set(
    store.accessPoints
      .filter((ap) => ap.provider === providerId)
      .map((ap) => ap.externalId)
  );
  return (LISTINGS[providerId] || []).map((e) => ({
    ...e,
    taken: taken.has(e.id),
  }));
}

export function listed(providerId, id) {
  return (LISTINGS[providerId] || []).find((e) => e.id === id) || null;
}

/**
 * What a Zugangspunkt of the provider asks for. `type` matters only for Open
 * Locker: "locker" (Schließfachanlage) or "door" (festes Fach).
 */
export function facts(providerId, type) {
  const p = provider(providerId) || {};
  const base = {
    name: p.name,
    noun: p.noun,
    nounPlural: p.nounPlural,
    hasListing: !!LISTINGS[providerId],
    manual: true,
    idLabel: "ID beim Anbieter",
    idHint:
      "Wechseln Sie die ID, um das Schloss zu tauschen. Der QR-Code bleibt.",
    idPlaceholder: "",
    openAction: false,
    qr: true,
    qrDefault: true,
    qrHint:
      "Öffnet nur, wenn der QR-Code vor Ort gescannt wurde. Beim Anlegen ist das voreingestellt.",
    accountField: true,
    compartments: false,
    typeChoice: false,
    iq: false,
  };
  if (providerId === "nuki") return { ...base, openAction: true };
  if (providerId === "salto-ks") return { ...base, iq: true };
  if (providerId === "ifbs") {
    return {
      ...base,
      idLabel: "Standort-ID",
      idHint:
        "Wechseln Sie die Standort-ID, um die Anlage bei iFBS zu tauschen.",
      qr: false,
      accountField: false,
    };
  }
  if (providerId === "pareva") {
    return {
      ...base,
      hasListing: false,
      idLabel: "Produkt-ID",
      idHint: "Die Produkt-ID aus der Verwaltung von Pareva, 24 Zeichen.",
      idPlaceholder: "z. B. 66570d1a1f9b6357ed971746",
      qr: false,
      accountField: false,
    };
  }
  if (providerId === "open-locker") {
    const fixed = type === "door";
    return {
      ...base,
      noun: fixed ? "Fach" : "Schließfachanlage",
      nounPlural: fixed ? "Fächer" : "Schließfachanlagen",
      hasListing: true,
      manual: false,
      typeChoice: true,
      compartments: !fixed,
      idLabel: "UUID des Fachs",
      idHint: "Wechseln Sie die UUID, um das Fach zu tauschen.",
      qrDefault: false,
      qrHint: fixed
        ? "Das Fach öffnet nur nach dem Scan seines QR-Codes. Bei Open Locker ist das aus, bis Sie es einschalten."
        : "Gilt für alle Fächer: Jedes öffnet nur nach dem Scan seines eigenen QR-Codes. Bei Open Locker ist das aus, bis Sie es einschalten.",
      accountField: false,
    };
  }
  return base;
}

/** A fresh form for a new Zugangspunkt of the provider. */
export function blankForm(providerId, type) {
  const f = facts(providerId, type);
  return {
    id: null,
    provider: providerId,
    lockerType: providerId === "open-locker" ? type || "locker" : null,
    label: "",
    externalId: "",
    providerLocationId: "",
    openAction: "auto",
    qrRequired: f.qrDefault,
    address: "",
    config: "{}",
    compartmentIds: [],
  };
}

/** A form for a stored Zugangspunkt. */
export function formOf(ap) {
  return {
    ...blankForm(ap.provider, ap.lockerType),
    ...ap,
    compartmentIds: [...(ap.compartmentIds || [])],
    config: ap.config || "{}",
  };
}

function kindOf(form) {
  if (form.provider === "open-locker") {
    return form.lockerType === "door" ? "door" : "locker";
  }
  return provider(form.provider)?.group === "doors" ? "door" : "locker";
}

export function saveForm(form) {
  const f = facts(form.provider, form.lockerType);
  const record = {
    ...form,
    kind: kindOf(form),
    qrRequired: f.qr ? form.qrRequired : false,
    compartments: f.compartments ? form.compartmentIds.length : undefined,
  };
  if (form.provider === "salto-ks") {
    const entry = listed("salto-ks", form.externalId);
    record.iqActive = entry ? entry.iqActive : true;
  }
  if (!record.label) {
    record.label =
      listed(form.provider, form.externalId)?.name || `Neue ${f.noun}`;
  }
  if (form.id) {
    const i = store.accessPoints.findIndex((a) => a.id === form.id);
    const merged = { ...store.accessPoints[i], ...record };
    store.accessPoints.splice(i, 1, merged);
    return merged;
  }
  const created = {
    ...record,
    id: `ap${store.nextId++}`,
    bookableIds: [],
  };
  store.accessPoints.push(created);
  return created;
}

/** The settings left at their defaults, as one line - for collapsed sections. */
export function summary(form) {
  const f = facts(form.provider, form.lockerType);
  // Decided in tickets#1085: the Modus is shown as a fixed line while
  // „Öffnen per App“ is the only one to choose.
  const parts = ["Öffnen per App"];
  if (f.openAction)
    parts.push(`Öffnungsart ${openActionText(form.openAction)}`);
  if (f.qr)
    parts.push(form.qrRequired ? "QR-Scan erforderlich" : "ohne QR-Scan");
  parts.push(form.address ? form.address : "kein Standort");
  return parts.join(" · ");
}
