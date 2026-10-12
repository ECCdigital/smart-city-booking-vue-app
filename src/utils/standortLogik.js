/**
 * The Standort-Logik: the rules between the Anschrift and the Punkt of a
 * Standort, pure and without DOM (ECCdigital/tickets#470, spec of #372,
 * „Admin UI: Standort-Logik“). Taken over from the reducer `StandortLogik` of
 * the prototype #375, cut down to the rules decided there.
 *
 * The input of a Standort holds a Zustand, sends actions through `reducer`,
 * runs the `anfrage` the Zustand carries (search or reverse search) and sends
 * its answer back as an action with the same `id`. `pruefen` says whether the
 * Standort may be saved, `zuGespeichert` turns the Zustand back into the
 * stored form.
 *
 * The Zustand (read it, never write it; only `reducer` changes it):
 *
 * - `anschrift`: `{ strasse, hausnummer, plz, ort, land, zusatz }`, all
 *   strings; `land` is the Ländercode in capitals, `"DE"` by default.
 * - `punkt`: `null` or `{ lat, lon }`.
 * - `herkunftPunkt`: `null`, `"suche"`, `"karte"` (by hand) or `"nuki"`;
 *   stored as `photon`, `manual` and `nuki`.
 * - `altText`: the text of an old Standort without Punkt, for the search.
 * - `vorschlag`: `null`, `{ art: "anschrift", anschrift }` after the reverse
 *   search or `{ art: "punkt", punkt, abstand }` (metres) after the search.
 * - `anfrage`: `null`, `{ id, art: "rueckwaerts", punkt }` or
 *   `{ id, art: "suche", anschrift }`, for the input to run.
 * - `punktSetzen`: `null` or `{ text }` while an Ort ohne Treffer waits for
 *   its Punkt.
 *
 * The other keys are the module's own.
 */

const leereAnschrift = () => ({
  strasse: "",
  hausnummer: "",
  plz: "",
  ort: "",
  land: "DE",
  zusatz: "",
});

function leer() {
  return {
    anschrift: leereAnschrift(),
    punkt: null,
    herkunftPunkt: null,
    altText: "",
    vorschlag: null,
    anfrage: null,
    punktSetzen: null,
    anschriftOffen: false,
    naechsteId: 1,
    gespeichert: { wert: null, inhalt: null },
  };
}

// What decides the stored form; equal to the Inhalt at opening means unchanged.
const inhalt = (s) => ({
  anschrift: { ...s.anschrift },
  punkt: s.punkt ? { ...s.punkt } : null,
  herkunftPunkt: s.herkunftPunkt,
  altText: s.altText,
});

const gleicherInhalt = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The Zustand of the input for a stored Standort.
 *
 * `gespeichert` is the Standort as stored, when the input opens one already
 * edited (a field mounted again, the check of a whole bookable): unchanged
 * then means saying what that one says, and an unchanged Standort comes back
 * as that one. `null` means nothing is stored yet.
 *
 * @param {*} wert - The Standort as stored: an object, a text, `null`, `""`.
 * @param {*} [gespeichert] - The Standort as stored, `wert` by default.
 * @returns {Object} The Zustand.
 */
export function ausGespeichert(wert, gespeichert = wert) {
  const s = { ...leer(), ...lesen(wert) };
  const basis = gespeichert === wert ? s : { ...leer(), ...lesen(gespeichert) };
  return { ...s, gespeichert: { wert: gespeichert, inhalt: inhalt(basis) } };
}

// Old values of `meta.source` stay stored; `nominatim` counts as the search,
// `legacy`, an unknown and a missing one as set by hand (#376).
const HERKUNFT_AUS_SOURCE = Object.freeze({
  photon: "suche",
  nominatim: "suche",
  nuki: "nuki",
});

const text = (wert) =>
  typeof wert === "string" || typeof wert === "number" ? String(wert) : "";

function zahl(wert) {
  if (typeof wert === "number") return Number.isFinite(wert) ? wert : null;
  if (typeof wert !== "string" || !wert.trim()) return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
}

function punktLesen(wert) {
  const points = wert.coordinates?.points;
  const [lon, lat] = Array.isArray(points)
    ? [zahl(points[0]), zahl(points[1])]
    : [zahl(wert.lon ?? wert.lng), zahl(wert.lat)];
  return lat === null || lon === null ? null : { lat, lon };
}

function lesen(wert) {
  if (typeof wert === "string") return { altText: wert.trim() };
  if (!wert || typeof wert !== "object") return {};

  const a = wert.address || {};
  const punkt = punktLesen(wert);
  return {
    anschrift: {
      strasse: text(a.street),
      hausnummer: text(a.house_number),
      plz: text(a.postcode ?? a.post_code),
      ort: text(a.city),
      land: text(a.country_code).toUpperCase() || "DE",
      zusatz: text(wert.meta?.additional),
    },
    punkt,
    herkunftPunkt: punkt
      ? HERKUNFT_AUS_SOURCE[wert.meta?.source] || "karte"
      : null,
    altText: punkt ? "" : text(wert.display_address).trim(),
  };
}

/**
 * The Standort in the stored form. An unchanged Standort comes back as it was
 * stored, word for word: only so does the backend recognise an unchanged old
 * Standort without Punkt.
 *
 * @param {Object} s - The Zustand.
 * @returns {*} The Standort to store.
 */
export function zuGespeichert(s) {
  if (unveraendert(s)) return s.gespeichert.wert;
  if (!hatInhalt(s) && !s.punkt) return null;

  const a = s.anschrift;
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  const wert = {
    address: {
      street: a.strasse || null,
      house_number: a.hausnummer || null,
      postcode: a.plz || null,
      city: a.ort || null,
      country_code: (a.land || "DE").toUpperCase(),
    },
    display_address: anzeige(a) || s.altText,
    meta: { additional: a.zusatz || null },
  };
  if (!s.punkt) return wert;
  return {
    ...wert,
    coordinates: { type: "Point", points: [r6(s.punkt.lon), r6(s.punkt.lat)] },
    meta: { source: SOURCE_AUS_HERKUNFT[s.herkunftPunkt], ...wert.meta },
  };
}

const SOURCE_AUS_HERKUNFT = Object.freeze({
  suche: "photon",
  karte: "manual",
  nuki: "nuki",
});

/**
 * The Anzeigetext of an Anschrift, as `display_address` stores it:
 * „Gasstraße 4, 03172 Guben“.
 *
 * @param {Object} a - The Anschrift of a Zustand.
 * @returns {string} The text, empty for an empty Anschrift.
 */
export function anzeige(a) {
  const zeile1 = [a.strasse, a.hausnummer].filter(Boolean).join(" ");
  const zeile2 = [a.plz, a.ort].filter(Boolean).join(" ");
  return [zeile1, zeile2].filter(Boolean).join(", ");
}

/** Below this distance in metres a found Punkt counts as the same. */
export const NAH_GENUG_M = 25;

/**
 * The distance of two Punkte in metres (haversine).
 *
 * @param {{ lat: number, lon: number }} p - A Punkt.
 * @param {{ lat: number, lon: number }} q - Another Punkt.
 * @returns {number} The distance in metres.
 */
export function abstand(p, q) {
  const r = 6371000;
  const rad = Math.PI / 180;
  const dLat = (q.lat - p.lat) * rad;
  const dLon = (q.lon - p.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p.lat * rad) * Math.cos(q.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

const ANSCHRIFT_FELDER = ["strasse", "hausnummer", "plz", "ort"];
const norm = (x) => (x || "").trim().toLowerCase();
const anschriftLeer = (a) => ANSCHRIFT_FELDER.every((f) => !a[f]);
const gleicheAnschrift = (a, b) =>
  ANSCHRIFT_FELDER.every((f) => norm(a[f]) === norm(b[f]));

// An answer counts only for the Anfrage still open; a stale one is dropped.
const passt = (s, a) => !!s.anfrage && s.anfrage.id === a.id;

const neueAnfrage = (s, anfrage) => ({
  ...s,
  naechsteId: s.naechsteId + 1,
  anfrage: { id: s.naechsteId, ...anfrage },
});

/**
 * The Zustand after one action. Unknown actions leave it as it is.
 *
 * @param {Object} s - The Zustand.
 * @param {Object} a - The action, `{ typ, … }`.
 * @returns {Object} The new Zustand.
 */
export function reducer(s, a) {
  switch (a.typ) {
    case "trefferGewaehlt": {
      const t = lesen(a.treffer);
      return {
        ...s,
        anschrift: { ...t.anschrift, zusatz: s.anschrift.zusatz },
        punkt: t.punkt,
        herkunftPunkt: "suche",
        altText: "",
        vorschlag: null,
        anfrage: null,
        punktSetzen: null,
        anschriftOffen: false,
      };
    }

    // A place the search does not know: the typed text goes into an empty
    // Zusatz, and the Punkt is set on the map.
    case "ohneTreffer":
      return {
        ...s,
        anschrift: { ...s.anschrift, zusatz: s.anschrift.zusatz || a.text },
        punktSetzen: { text: a.text },
        vorschlag: null,
      };

    // Removes the Standort: an empty one may be saved, it is optional.
    case "leeren":
      return {
        ...leer(),
        naechsteId: s.naechsteId,
        gespeichert: s.gespeichert,
      };

    case "punktSetzenAbbrechen":
      return s.punktSetzen ? { ...s, punktSetzen: null } : s;

    case "punktGesetzt":
      return neueAnfrage(
        {
          ...s,
          punkt: { lat: a.punkt.lat, lon: a.punkt.lon },
          herkunftPunkt: a.herkunft,
          vorschlag: null,
          punktSetzen: null,
        },
        { art: "rueckwaerts", punkt: { lat: a.punkt.lat, lon: a.punkt.lon } }
      );

    // The reverse search never overwrites the Anschrift, it only suggests:
    // in the prototype a Punkt in the yard behind Gasstraße 4 found
    // „Wilkesche Höfe“ (#375).
    case "rueckwaertsErgebnis": {
      if (!passt(s, a)) return s;
      const n = { ...s, anfrage: null };
      if (!a.treffer) return n;
      const gefunden = {
        ...lesen(a.treffer).anschrift,
        zusatz: s.anschrift.zusatz,
      };
      if (!gefunden.strasse && s.anschrift.strasse) return n;
      if (
        !anschriftLeer(s.anschrift) &&
        gleicheAnschrift(s.anschrift, gefunden)
      )
        return n;
      return { ...n, vorschlag: { art: "anschrift", anschrift: gefunden } };
    }

    case "vorschlagUebernehmen": {
      const v = s.vorschlag;
      if (!v) return s;
      if (v.art === "punkt")
        return {
          ...s,
          punkt: v.punkt,
          herkunftPunkt: "suche",
          vorschlag: null,
        };
      return {
        ...s,
        anschrift: { ...v.anschrift, zusatz: s.anschrift.zusatz },
        altText: "",
        vorschlag: null,
        anschriftOffen: false,
      };
    }

    case "vorschlagVerwerfen":
      return s.vorschlag ? { ...s, vorschlag: null } : s;

    // A change of the Zusatz alone triggers nothing.
    case "feldGeaendert": {
      const n = { ...s, anschrift: { ...s.anschrift, [a.feld]: a.wert || "" } };
      if (a.feld === "zusatz") return n;
      return {
        ...n,
        altText: "",
        anschriftOffen: true,
        vorschlag: s.vorschlag?.art === "anschrift" ? null : s.vorschlag,
      };
    }

    case "anschriftFertig": {
      if (!s.anschriftOffen) return s;
      const n = { ...s, anschriftOffen: false };
      if (!(s.anschrift.ort || s.anschrift.plz)) return n;
      return neueAnfrage(n, { art: "suche", anschrift: { ...s.anschrift } });
    }

    // A Punkt from the search follows a changed Anschrift; a Punkt set by
    // hand or by NUKI only moves when the question is answered with yes.
    case "sucheErgebnis": {
      if (!passt(s, a)) return s;
      const n = { ...s, anfrage: null };
      const punkt = a.treffer ? lesen(a.treffer).punkt : null;
      if (!punkt) return n;
      if (!s.punkt || s.herkunftPunkt === "suche")
        return { ...n, punkt, herkunftPunkt: "suche", vorschlag: null };
      const weite = abstand(s.punkt, punkt);
      if (weite < NAH_GENUG_M) return n;
      return {
        ...n,
        vorschlag: { art: "punkt", punkt, abstand: Math.round(weite) },
      };
    }

    default:
      return s;
  }
}

const hatInhalt = (s) =>
  !anschriftLeer(s.anschrift) || !!s.anschrift.zusatz || !!s.altText;

const unveraendert = (s) => gleicherInhalt(inhalt(s), s.gespeichert.inhalt);

/**
 * Whether the Standort may be saved, and why not.
 *
 * A new or changed Standort needs a Punkt as soon as it has an Anschrift, a
 * Zusatz or an old text; a Punkt alone and an empty Standort are fine. An
 * unchanged old Standort without Punkt passes, the backend lets it through
 * too (#455); `punktFehlt` says the Punkt is still to be set.
 *
 * `grund` is `null` or one of `punktNichtGesetzt` (an Ort ohne Treffer still
 * waits for its Punkt), `anschriftOhnePunkt` and `altTextOhnePunkt`.
 *
 * @param {Object} s - The Zustand.
 * @returns {{ speicherbar: boolean, grund: string|null, punktFehlt: boolean }}
 */
export function pruefen(s) {
  const punktFehlt = !s.punkt && (hatInhalt(s) || !!s.punktSetzen);
  const nein = (grund) => ({ speicherbar: false, grund, punktFehlt });

  if (s.punktSetzen && !s.punkt) return nein("punktNichtGesetzt");
  if (!punktFehlt || unveraendert(s))
    return { speicherbar: true, grund: null, punktFehlt };
  if (s.altText && anschriftLeer(s.anschrift)) return nein("altTextOhnePunkt");
  return nein("anschriftOhnePunkt");
}
