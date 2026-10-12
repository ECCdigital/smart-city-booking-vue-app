import { describe, expect, it } from "vitest";
import {
  abstand,
  ausGespeichert,
  pruefen,
  reducer,
  zuGespeichert,
} from "@/utils/standortLogik";

const GASSTRASSE = Object.freeze({
  address: {
    street: "Gasstraße",
    house_number: "4",
    postcode: "03172",
    city: "Guben",
    country_code: "DE",
  },
  display_address: "Gasstraße 4, 03172 Guben",
  coordinates: { type: "Point", points: [14.714485, 51.950438] },
  meta: { source: "photon" },
});

// A hit of `geo/search` or `geo/reverse`: the stored form of a Standort.
const treffer = ({ lat, lon, ...address }) => ({
  address: { country_code: "DE", ...address },
  coordinates: { type: "Point", points: [lon, lat] },
});
const TREFFER_GASSTRASSE = treffer({
  street: "Gasstraße",
  house_number: "4",
  postcode: "03172",
  city: "Guben",
  lat: 51.950438,
  lon: 14.714485,
});

// A scenario: the Zustand after a series of actions.
const folge = (start, ...aktionen) => aktionen.reduce(reducer, start);
const neu = () => ausGespeichert(null);

describe("conversion of an unchanged Standort", () => {
  it.each([
    ["a Standort with Anschrift and Punkt", GASSTRASSE],
    ["a Standort stored only as text", "Sportplatz Kaltenborner Straße, Guben"],
    [
      "an old Standort without Punkt",
      {
        address: { street: "Gasstraße", house_number: "4", city: "Guben" },
        display_address: "Gasstraße 4, Guben",
        coordinates: { type: "Point", points: [null, null] },
      },
    ],
    ["the empty default of a bookable", ""],
    ["no Standort at all", null],
  ])("gives back %s word for word", (_, gespeichert) => {
    expect(zuGespeichert(ausGespeichert(gespeichert))).toBe(gespeichert);
  });
});

describe("Zustand from the stored form", () => {
  const mitHerkunft = (source) => ({ ...GASSTRASSE, meta: { source } });

  it("reads Anschrift, Zusatz and Punkt", () => {
    const s = ausGespeichert({
      ...GASSTRASSE,
      meta: { source: "photon", additional: "Halle 2, Hintereingang" },
    });

    expect(s.anschrift).toEqual({
      strasse: "Gasstraße",
      hausnummer: "4",
      plz: "03172",
      ort: "Guben",
      land: "DE",
      zusatz: "Halle 2, Hintereingang",
    });
    expect(s.punkt).toEqual({ lat: 51.950438, lon: 14.714485 });
    expect(s.herkunftPunkt).toBe("suche");
    expect(s.altText).toBe("");
  });

  it.each([
    ["photon", "suche"],
    ["nominatim", "suche"],
    ["manual", "karte"],
    ["legacy", "karte"],
    ["nuki", "nuki"],
    [undefined, "karte"],
  ])("takes a Punkt with Herkunft %s as from %s", (source, herkunft) => {
    expect(ausGespeichert(mitHerkunft(source)).herkunftPunkt).toBe(herkunft);
  });

  it("reads the PLZ under its old name post_code as well", () => {
    const s = ausGespeichert({
      ...GASSTRASSE,
      address: { street: "Gasstraße", post_code: "03172", city: "Guben" },
    });

    expect(s.anschrift.plz).toBe("03172");
  });

  it("reads the Ländercode in capitals and takes Deutschland without one", () => {
    const polen = ausGespeichert({
      ...GASSTRASSE,
      address: { city: "Gubin", country_code: "pl" },
    });
    const ohne = ausGespeichert({ ...GASSTRASSE, address: { city: "Guben" } });

    expect(polen.anschrift.land).toBe("PL");
    expect(ohne.anschrift.land).toBe("DE");
  });

  it("keeps a Standort stored as text as the old text, without Punkt", () => {
    const s = ausGespeichert("Sportplatz Kaltenborner Straße, Guben");

    expect(s.altText).toBe("Sportplatz Kaltenborner Straße, Guben");
    expect(s.punkt).toBeNull();
    expect(s.herkunftPunkt).toBeNull();
  });

  it("keeps the text of an old Standort without Punkt for the search", () => {
    const s = ausGespeichert({
      display_address: "Rathaus, Guben",
      coordinates: { type: "Point", points: [null, null] },
    });

    expect(s.altText).toBe("Rathaus, Guben");
    expect(s.punkt).toBeNull();
  });

  it.each([
    [
      "points [null, null]",
      { coordinates: { type: "Point", points: [null, null] } },
    ],
    ["no coordinates", { display_address: "" }],
    [
      "the default with lat and lng",
      { display_address: null, lat: null, lng: null },
    ],
  ])("reads %s as no Punkt", (_, gespeichert) => {
    const s = ausGespeichert(gespeichert);

    expect(s.punkt).toBeNull();
    expect(s.herkunftPunkt).toBeNull();
    expect(s.altText).toBe("");
  });

  it("reads the default of an event as an empty Standort", () => {
    const s = ausGespeichert({
      coordinates: { type: "Point", points: [null, null] },
      display_address: "",
      address: {
        street: null,
        house_number: null,
        post_code: null,
        city: null,
        suburb: null,
        state: null,
        country: null,
        country_code: null,
      },
      meta: {},
    });

    expect(s.anschrift).toEqual({
      strasse: "",
      hausnummer: "",
      plz: "",
      ort: "",
      land: "DE",
      zusatz: "",
    });
    expect(s.punkt).toBeNull();
  });

  it("reads an old Punkt given as lat and lng", () => {
    const s = ausGespeichert({
      display_address: "Gasstraße 4, Guben",
      lat: 51.950438,
      lng: 14.714485,
    });

    expect(s.punkt).toEqual({ lat: 51.950438, lon: 14.714485 });
    expect(s.herkunftPunkt).toBe("karte");
  });
});

describe("choosing a hit of the search", () => {
  it("fills Anschrift and Punkt and keeps the Zusatz", () => {
    const s = folge(
      neu(),
      { typ: "feldGeaendert", feld: "zusatz", wert: "Halle 2, Hintereingang" },
      { typ: "trefferGewaehlt", treffer: TREFFER_GASSTRASSE }
    );

    expect(s.anschrift).toEqual({
      strasse: "Gasstraße",
      hausnummer: "4",
      plz: "03172",
      ort: "Guben",
      land: "DE",
      zusatz: "Halle 2, Hintereingang",
    });
    expect(s.punkt).toEqual({ lat: 51.950438, lon: 14.714485 });
    expect(s.herkunftPunkt).toBe("suche");
  });

  it("replaces the old text of a Standort without Punkt", () => {
    const s = folge(ausGespeichert("Sportplatz, Guben"), {
      typ: "trefferGewaehlt",
      treffer: TREFFER_GASSTRASSE,
    });

    expect(s.altText).toBe("");
  });
});

const HALLE = { lat: 51.950438, lon: 14.715278 }; // 54 m east of Gasstraße 4
const TREFFER_GASSTRASSE_PUNKT = { lat: 51.950438, lon: 14.714485 };
const WILKESCHE_HOEFE = treffer({ city: "Guben", lat: 51.9505, lon: 14.7153 });
const GASSTRASSE_6 = treffer({
  street: "Gasstraße",
  house_number: "6",
  postcode: "03172",
  city: "Guben",
  lat: 51.95044,
  lon: 14.71528,
});

// The answer to the Anfrage the Zustand carries.
const antwort = (s, felder) => ({
  typ:
    s.anfrage.art === "rueckwaerts" ? "rueckwaertsErgebnis" : "sucheErgebnis",
  id: s.anfrage.id,
  ...felder,
});

describe("setting the Punkt on the map or by NUKI", () => {
  const gewaehlt = () =>
    folge(neu(), { typ: "trefferGewaehlt", treffer: TREFFER_GASSTRASSE });

  it.each(["karte", "nuki"])(
    "sets the Punkt from %s and asks for a reverse search",
    (herkunft) => {
      const s = folge(gewaehlt(), {
        typ: "punktGesetzt",
        punkt: HALLE,
        herkunft,
      });

      expect(s.punkt).toEqual(HALLE);
      expect(s.herkunftPunkt).toBe(herkunft);
      expect(s.anfrage).toEqual({
        id: expect.anything(),
        art: "rueckwaerts",
        punkt: HALLE,
      });
    }
  );

  it("gives a new id to every Anfrage", () => {
    const erste = folge(gewaehlt(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });
    const zweite = folge(erste, {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });

    expect(zweite.anfrage.id).not.toBe(erste.anfrage.id);
  });

  it("makes the found Anschrift a Vorschlag and never overwrites", () => {
    const gesetzt = folge(gewaehlt(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });
    const s = folge(gesetzt, antwort(gesetzt, { treffer: GASSTRASSE_6 }));

    expect(s.anschrift.hausnummer).toBe("4");
    expect(s.vorschlag).toEqual({
      art: "anschrift",
      anschrift: {
        strasse: "Gasstraße",
        hausnummer: "6",
        plz: "03172",
        ort: "Guben",
        land: "DE",
        zusatz: "",
      },
    });
    expect(s.anfrage).toBeNull();
  });

  it("suggests an Anschrift for a Punkt from NUKI", () => {
    const gesetzt = folge(neu(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "nuki",
    });
    const s = folge(gesetzt, antwort(gesetzt, { treffer: GASSTRASSE_6 }));

    expect(s.anschrift.strasse).toBe("");
    expect(s.vorschlag.anschrift.strasse).toBe("Gasstraße");
  });

  it("takes over the Vorschlag and keeps the Zusatz", () => {
    const gesetzt = folge(
      gewaehlt(),
      { typ: "feldGeaendert", feld: "zusatz", wert: "Halle 2" },
      { typ: "punktGesetzt", punkt: HALLE, herkunft: "karte" }
    );
    const s = folge(gesetzt, antwort(gesetzt, { treffer: GASSTRASSE_6 }), {
      typ: "vorschlagUebernehmen",
    });

    expect(s.anschrift.hausnummer).toBe("6");
    expect(s.anschrift.zusatz).toBe("Halle 2");
    expect(s.punkt).toEqual(HALLE);
    expect(s.herkunftPunkt).toBe("karte");
    expect(s.vorschlag).toBeNull();
  });

  it("keeps the Anschrift when the Vorschlag is dismissed", () => {
    const gesetzt = folge(gewaehlt(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });
    const s = folge(gesetzt, antwort(gesetzt, { treffer: GASSTRASSE_6 }), {
      typ: "vorschlagVerwerfen",
    });

    expect(s.anschrift.hausnummer).toBe("4");
    expect(s.vorschlag).toBeNull();
  });

  describe("gives no Vorschlag", () => {
    it("when the reverse search finds nothing", () => {
      const gesetzt = folge(gewaehlt(), {
        typ: "punktGesetzt",
        punkt: HALLE,
        herkunft: "karte",
      });
      const s = folge(gesetzt, antwort(gesetzt, { treffer: null }));

      expect(s.vorschlag).toBeNull();
      expect(s.anfrage).toBeNull();
    });

    it("when it finds a place without street and the Anschrift has one", () => {
      const gesetzt = folge(gewaehlt(), {
        typ: "punktGesetzt",
        punkt: HALLE,
        herkunft: "karte",
      });
      const s = folge(gesetzt, antwort(gesetzt, { treffer: WILKESCHE_HOEFE }));

      expect(s.vorschlag).toBeNull();
      expect(s.anschrift.strasse).toBe("Gasstraße");
    });

    it("when it finds the same Anschrift", () => {
      const gesetzt = folge(gewaehlt(), {
        typ: "punktGesetzt",
        punkt: HALLE,
        herkunft: "karte",
      });
      const s = folge(
        gesetzt,
        antwort(gesetzt, { treffer: TREFFER_GASSTRASSE })
      );

      expect(s.vorschlag).toBeNull();
    });

    it("when the answer is stale, its id no longer matching", () => {
      const erste = folge(gewaehlt(), {
        typ: "punktGesetzt",
        punkt: HALLE,
        herkunft: "karte",
      });
      const zweite = folge(erste, {
        typ: "punktGesetzt",
        punkt: TREFFER_GASSTRASSE_PUNKT,
        herkunft: "karte",
      });
      const s = folge(zweite, antwort(erste, { treffer: GASSTRASSE_6 }));

      expect(s.vorschlag).toBeNull();
      expect(s.anfrage).toEqual(zweite.anfrage);
    });
  });

  it("suggests a place without street while the Anschrift has none", () => {
    const gesetzt = folge(neu(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });
    const s = folge(gesetzt, antwort(gesetzt, { treffer: WILKESCHE_HOEFE }));

    expect(s.vorschlag.anschrift.ort).toBe("Guben");
  });
});

describe("abstand", () => {
  it("measures a degree of latitude as about 111 km", () => {
    expect(abstand({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(
      111195,
      0
    );
  });

  it("is 0 for the same Punkt", () => {
    expect(abstand(HALLE, HALLE)).toBe(0);
  });
});

describe("changing the Anschrift", () => {
  // 229 m north of Gasstraße 4, 236 m from the Halle.
  const GASSTRASSE_20 = treffer({
    street: "Gasstraße",
    house_number: "20",
    postcode: "03172",
    city: "Guben",
    lat: 51.9525,
    lon: 14.714485,
  });
  const hausnummer20 = [
    { typ: "feldGeaendert", feld: "hausnummer", wert: "20" },
    { typ: "anschriftFertig" },
  ];
  const ausSuche = () =>
    folge(neu(), { typ: "trefferGewaehlt", treffer: TREFFER_GASSTRASSE });
  const vonHand = (herkunft = "karte") =>
    folge(
      ausSuche(),
      { typ: "punktGesetzt", punkt: HALLE, herkunft },
      {
        typ: "vorschlagVerwerfen",
      }
    );
  const nachSuche = (start, gefunden) => {
    const s = folge(start, ...hausnummer20);
    return folge(s, antwort(s, { treffer: gefunden }));
  };

  it("asks for a search with the Anschrift", () => {
    const s = folge(ausSuche(), ...hausnummer20);

    expect(s.anfrage).toEqual({
      id: expect.anything(),
      art: "suche",
      anschrift: expect.objectContaining({
        strasse: "Gasstraße",
        hausnummer: "20",
        ort: "Guben",
      }),
    });
  });

  it.each([
    ["only a Straße", { strasse: "Gasstraße" }, false],
    ["a PLZ", { plz: "03172" }, true],
    ["an Ort", { ort: "Guben" }, true],
  ])("with %s asks for a search: %s", (_, felder, sucht) => {
    const s = folge(
      neu(),
      ...Object.entries(felder).map(([feld, wert]) => ({
        typ: "feldGeaendert",
        feld,
        wert,
      })),
      { typ: "anschriftFertig" }
    );

    expect(s.anfrage !== null).toBe(sucht);
  });

  it("asks for nothing once a hit filled the Anschrift", () => {
    const s = folge(
      neu(),
      { typ: "feldGeaendert", feld: "ort", wert: "Gub" },
      { typ: "trefferGewaehlt", treffer: TREFFER_GASSTRASSE },
      { typ: "anschriftFertig" }
    );

    expect(s.anfrage).toBeNull();
  });

  it("asks for nothing when only the Zusatz changed", () => {
    const s = folge(
      ausSuche(),
      { typ: "feldGeaendert", feld: "zusatz", wert: "Halle 2" },
      { typ: "anschriftFertig" }
    );

    expect(s.anfrage).toBeNull();
  });

  it("moves a Punkt from the search along without asking", () => {
    const s = nachSuche(ausSuche(), GASSTRASSE_20);

    expect(s.punkt).toEqual({ lat: 51.9525, lon: 14.714485 });
    expect(s.herkunftPunkt).toBe("suche");
    expect(s.vorschlag).toBeNull();
  });

  it("sets the Punkt where there was none", () => {
    const s = folge(
      neu(),
      { typ: "feldGeaendert", feld: "strasse", wert: "Gasstraße" },
      { typ: "feldGeaendert", feld: "ort", wert: "Guben" },
      { typ: "anschriftFertig" }
    );
    const n = folge(s, antwort(s, { treffer: GASSTRASSE_20 }));

    expect(n.punkt).toEqual({ lat: 51.9525, lon: 14.714485 });
    expect(n.herkunftPunkt).toBe("suche");
  });

  it.each(["karte", "nuki"])(
    "asks with the distance before moving a Punkt from %s",
    (herkunft) => {
      const s = nachSuche(vonHand(herkunft), GASSTRASSE_20);

      expect(s.punkt).toEqual(HALLE);
      expect(s.vorschlag).toEqual({
        art: "punkt",
        punkt: { lat: 51.9525, lon: 14.714485 },
        abstand: 236,
      });
    }
  );

  it("moves the Punkt when the question is answered with yes", () => {
    const s = folge(nachSuche(vonHand(), GASSTRASSE_20), {
      typ: "vorschlagUebernehmen",
    });

    expect(s.punkt).toEqual({ lat: 51.9525, lon: 14.714485 });
    expect(s.herkunftPunkt).toBe("suche");
    expect(s.anschrift.hausnummer).toBe("20");
    expect(s.vorschlag).toBeNull();
  });

  it("keeps the Punkt when the question is answered with no", () => {
    const s = folge(nachSuche(vonHand(), GASSTRASSE_20), {
      typ: "vorschlagVerwerfen",
    });

    expect(s.punkt).toEqual(HALLE);
    expect(s.herkunftPunkt).toBe("karte");
  });

  it("does nothing under 25 m", () => {
    const nebenan = treffer({
      street: "Gasstraße",
      house_number: "20",
      city: "Guben",
      lat: 51.95055,
      lon: 14.715278,
    });
    const s = nachSuche(vonHand(), nebenan);

    expect(s.punkt).toEqual(HALLE);
    expect(s.vorschlag).toBeNull();
  });

  it("does nothing when the search finds no Punkt", () => {
    const s = nachSuche(vonHand(), null);

    expect(s.punkt).toEqual(HALLE);
    expect(s.vorschlag).toBeNull();
    expect(s.anfrage).toBeNull();
  });

  it("drops a stale answer", () => {
    const erste = folge(ausSuche(), ...hausnummer20);
    const zweite = folge(
      erste,
      { typ: "feldGeaendert", feld: "hausnummer", wert: "6" },
      {
        typ: "anschriftFertig",
      }
    );
    const s = folge(zweite, antwort(erste, { treffer: GASSTRASSE_20 }));

    expect(s.punkt).toEqual(TREFFER_GASSTRASSE_PUNKT);
    expect(s.anfrage).toEqual(zweite.anfrage);
  });

  it("drops a Vorschlag of an Anschrift once a field of the Anschrift changes", () => {
    const gesetzt = folge(ausSuche(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });
    const vorgeschlagen = folge(
      gesetzt,
      antwort(gesetzt, { treffer: GASSTRASSE_6 })
    );

    const zusatz = folge(vorgeschlagen, {
      typ: "feldGeaendert",
      feld: "zusatz",
      wert: "Halle 2",
    });
    const strasse = folge(vorgeschlagen, {
      typ: "feldGeaendert",
      feld: "hausnummer",
      wert: "5",
    });

    expect(zusatz.vorschlag).toEqual(vorgeschlagen.vorschlag);
    expect(strasse.vorschlag).toBeNull();
  });
});

describe("Ort ohne Treffer", () => {
  const WIESE = { lat: 51.953, lon: 14.7198 };

  it("puts the typed text in the empty Zusatz and waits for the Punkt", () => {
    const s = folge(neu(), { typ: "ohneTreffer", text: "Neißewiese Guben" });

    expect(s.anschrift.zusatz).toBe("Neißewiese Guben");
    expect(s.punktSetzen).toEqual({ text: "Neißewiese Guben" });
  });

  it("keeps a Zusatz already there", () => {
    const s = folge(
      neu(),
      { typ: "feldGeaendert", feld: "zusatz", wert: "Bühne am Ufer" },
      { typ: "ohneTreffer", text: "Neißewiese Guben" }
    );

    expect(s.anschrift.zusatz).toBe("Bühne am Ufer");
  });

  it("ends with the Punkt set and suggests an Anschrift", () => {
    const gesetzt = folge(
      neu(),
      { typ: "ohneTreffer", text: "Neißewiese Guben" },
      { typ: "punktGesetzt", punkt: WIESE, herkunft: "karte" }
    );
    const s = folge(gesetzt, antwort(gesetzt, { treffer: WILKESCHE_HOEFE }));

    expect(s.punktSetzen).toBeNull();
    expect(s.punkt).toEqual(WIESE);
    expect(s.anschrift.zusatz).toBe("Neißewiese Guben");
    expect(s.vorschlag.anschrift).toEqual(
      expect.objectContaining({ ort: "Guben", zusatz: "Neißewiese Guben" })
    );
  });

  it("can be cancelled", () => {
    const s = folge(
      neu(),
      { typ: "ohneTreffer", text: "Neißewiese Guben" },
      { typ: "punktSetzenAbbrechen" }
    );

    expect(s.punktSetzen).toBeNull();
    expect(s.punkt).toBeNull();
  });
});

describe("pruefen", () => {
  const ALT_OHNE_PUNKT = {
    address: { street: "Gasstraße", house_number: "4", city: "Guben" },
    display_address: "Gasstraße 4, Guben",
    coordinates: { type: "Point", points: [null, null] },
  };
  const speicherbar = { speicherbar: true, grund: null, punktFehlt: false };

  describe("Speichern", () => {
    it("lets a Standort with Anschrift and Punkt be saved", () => {
      const s = folge(neu(), {
        typ: "trefferGewaehlt",
        treffer: TREFFER_GASSTRASSE,
      });

      expect(pruefen(s)).toEqual(speicherbar);
    });

    it("lets a Punkt without Anschrift be saved", () => {
      const s = folge(neu(), {
        typ: "punktGesetzt",
        punkt: HALLE,
        herkunft: "karte",
      });

      expect(pruefen(s)).toEqual(speicherbar);
    });

    it.each([
      ["a new Standort", null],
      ["the default of a bookable", ""],
      [
        "the default of an access point",
        { display_address: null, lat: null, lng: null },
      ],
      [
        "the default of an event",
        {
          coordinates: { type: "Point", points: [null, null] },
          display_address: "",
          address: { street: null, post_code: null },
          meta: {},
        },
      ],
    ])("lets an empty Standort be saved: %s", (_, gespeichert) => {
      expect(pruefen(ausGespeichert(gespeichert))).toEqual(speicherbar);
    });

    it("lets a Standort emptied by hand be saved", () => {
      const s = folge(
        ausGespeichert(ALT_OHNE_PUNKT),
        { typ: "feldGeaendert", feld: "strasse", wert: "" },
        { typ: "feldGeaendert", feld: "hausnummer", wert: "" },
        { typ: "feldGeaendert", feld: "ort", wert: "" }
      );

      expect(pruefen(s)).toEqual(speicherbar);
    });

    it("refuses an Anschrift without Punkt, with the reason", () => {
      const s = folge(neu(), {
        typ: "feldGeaendert",
        feld: "ort",
        wert: "Guben",
      });

      expect(pruefen(s)).toEqual({
        speicherbar: false,
        grund: "anschriftOhnePunkt",
        punktFehlt: true,
      });
    });

    it("refuses a Zusatz without Punkt", () => {
      const s = folge(neu(), {
        typ: "feldGeaendert",
        feld: "zusatz",
        wert: "Halle 2",
      });

      expect(pruefen(s)).toEqual({
        speicherbar: false,
        grund: "anschriftOhnePunkt",
        punktFehlt: true,
      });
    });

    it("refuses while the Punkt of an Ort ohne Treffer is not set", () => {
      const s = folge(neu(), { typ: "ohneTreffer", text: "Neißewiese Guben" });

      expect(pruefen(s)).toEqual({
        speicherbar: false,
        grund: "punktNichtGesetzt",
        punktFehlt: true,
      });
    });
  });

  describe("Bestand", () => {
    it.each([
      ["an old Standort without Punkt", ALT_OHNE_PUNKT],
      ["a Standort stored as text", "Sportplatz Kaltenborner Straße, Guben"],
    ])(
      "lets %s be saved unchanged and says the Punkt is missing",
      (_, gespeichert) => {
        expect(pruefen(ausGespeichert(gespeichert))).toEqual({
          speicherbar: true,
          grund: null,
          punktFehlt: true,
        });
      }
    );

    it("refuses an old Standort without Punkt once changed, even only the Zusatz", () => {
      const s = folge(ausGespeichert(ALT_OHNE_PUNKT), {
        typ: "feldGeaendert",
        feld: "zusatz",
        wert: "Halle 2",
      });

      expect(pruefen(s)).toEqual({
        speicherbar: false,
        grund: "anschriftOhnePunkt",
        punktFehlt: true,
      });
    });

    it("refuses a Standort stored as text once changed", () => {
      const s = folge(ausGespeichert("Sportplatz, Guben"), {
        typ: "feldGeaendert",
        feld: "zusatz",
        wert: "Eingang Nord",
      });

      expect(pruefen(s)).toEqual({
        speicherbar: false,
        grund: "altTextOhnePunkt",
        punktFehlt: true,
      });
    });

    it("lets it be saved again once changed back", () => {
      const s = folge(
        ausGespeichert(ALT_OHNE_PUNKT),
        { typ: "feldGeaendert", feld: "zusatz", wert: "Halle 2" },
        { typ: "feldGeaendert", feld: "zusatz", wert: "" }
      );

      expect(pruefen(s).speicherbar).toBe(true);
    });

    it("lets a Standort stored as text be saved once it has a Punkt", () => {
      const s = folge(ausGespeichert("Sportplatz, Guben"), {
        typ: "punktGesetzt",
        punkt: HALLE,
        herkunft: "karte",
      });

      expect(pruefen(s)).toEqual(speicherbar);
    });
  });
});

describe("conversion of a changed Standort", () => {
  it("writes Anschrift, Zusatz, Punkt and its Herkunft", () => {
    const s = folge(
      neu(),
      { typ: "trefferGewaehlt", treffer: TREFFER_GASSTRASSE },
      { typ: "feldGeaendert", feld: "zusatz", wert: "Halle 2, Hintereingang" }
    );

    expect(zuGespeichert(s)).toEqual({
      address: {
        street: "Gasstraße",
        house_number: "4",
        postcode: "03172",
        city: "Guben",
        country_code: "DE",
      },
      display_address: "Gasstraße 4, 03172 Guben",
      coordinates: { type: "Point", points: [14.714485, 51.950438] },
      meta: { source: "photon", additional: "Halle 2, Hintereingang" },
    });
  });

  it.each([
    ["karte", "manual"],
    ["nuki", "nuki"],
  ])("stores a Punkt from %s as %s", (herkunft, source) => {
    const s = folge(neu(), { typ: "punktGesetzt", punkt: HALLE, herkunft });

    expect(zuGespeichert(s).meta.source).toBe(source);
  });

  it("stores a Punkt without Anschrift, with the Ländercode", () => {
    const s = folge(neu(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });

    expect(zuGespeichert(s)).toEqual({
      address: {
        street: null,
        house_number: null,
        postcode: null,
        city: null,
        country_code: "DE",
      },
      display_address: "",
      coordinates: { type: "Point", points: [14.715278, 51.950438] },
      meta: { source: "manual", additional: null },
    });
  });

  it("writes the Ländercode of a hit abroad in capitals", () => {
    const gubin = treffer({
      city: "Gubin",
      country_code: "pl",
      lat: 51.95,
      lon: 14.73,
    });
    const s = folge(neu(), { typ: "trefferGewaehlt", treffer: gubin });

    expect(zuGespeichert(s).address.country_code).toBe("PL");
  });

  it("rounds the Punkt to six decimals", () => {
    const s = folge(neu(), {
      typ: "punktGesetzt",
      punkt: { lat: 51.95043812345, lon: 14.71527798765 },
      herkunft: "karte",
    });

    expect(zuGespeichert(s).coordinates.points).toEqual([14.715278, 51.950438]);
  });

  it("keeps the old text as Anzeigetext once a Punkt is set", () => {
    const s = folge(ausGespeichert("Sportplatz, Guben"), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "karte",
    });

    expect(zuGespeichert(s).display_address).toBe("Sportplatz, Guben");
  });

  it("stores a removed Standort as none", () => {
    const s = folge(ausGespeichert(GASSTRASSE), { typ: "leeren" });

    expect(zuGespeichert(s)).toBeNull();
    expect(pruefen(s).speicherbar).toBe(true);
  });

  it("gives back the stored value when changed back", () => {
    const s = folge(
      ausGespeichert(GASSTRASSE),
      { typ: "feldGeaendert", feld: "hausnummer", wert: "6" },
      { typ: "feldGeaendert", feld: "hausnummer", wert: "4" }
    );

    expect(zuGespeichert(s)).toBe(GASSTRASSE);
  });
});

// The scenarios of the prototype #375, from opening to the stored form.
describe("scenarios of the prototype", () => {
  // Answers every open Anfrage with the given hit, as the input would.
  const mitAntwort = (s, gefunden) =>
    s.anfrage ? reducer(s, antwort(s, { treffer: gefunden })) : s;

  it("Pin liegt daneben: the Punkt moves to the hall, the Anschrift stays", () => {
    let s = folge(neu(), {
      typ: "trefferGewaehlt",
      treffer: TREFFER_GASSTRASSE,
    });
    s = folge(s, { typ: "punktGesetzt", punkt: HALLE, herkunft: "karte" });
    s = mitAntwort(s, TREFFER_GASSTRASSE);

    expect(s.vorschlag).toBeNull();
    expect(pruefen(s).speicherbar).toBe(true);
    expect(zuGespeichert(s)).toEqual(
      expect.objectContaining({
        display_address: "Gasstraße 4, 03172 Guben",
        coordinates: { type: "Point", points: [14.715278, 51.950438] },
        meta: { source: "manual", additional: null },
      })
    );
  });

  it("Ort ohne Treffer: the meadow gets its Punkt and keeps its name", () => {
    let s = folge(neu(), { typ: "ohneTreffer", text: "Neißewiese Guben" });
    expect(pruefen(s).grund).toBe("punktNichtGesetzt");

    s = folge(s, {
      typ: "punktGesetzt",
      punkt: { lat: 51.953, lon: 14.7198 },
      herkunft: "karte",
    });
    s = mitAntwort(s, WILKESCHE_HOEFE);
    s = folge(s, { typ: "vorschlagVerwerfen" });

    expect(pruefen(s).speicherbar).toBe(true);
    expect(zuGespeichert(s)).toEqual(
      expect.objectContaining({
        coordinates: { type: "Point", points: [14.7198, 51.953] },
        meta: { source: "manual", additional: "Neißewiese Guben" },
      })
    );
  });

  it("Anschrift nach dem Pin ändern: the Punkt by hand is asked about", () => {
    const GASSTRASSE_20 = treffer({
      street: "Gasstraße",
      house_number: "20",
      city: "Guben",
      lat: 51.9525,
      lon: 14.714485,
    });
    let s = folge(neu(), {
      typ: "trefferGewaehlt",
      treffer: TREFFER_GASSTRASSE,
    });
    s = mitAntwort(
      folge(s, { typ: "punktGesetzt", punkt: HALLE, herkunft: "karte" }),
      GASSTRASSE_6
    );
    s = folge(s, { typ: "vorschlagVerwerfen" });
    s = folge(
      s,
      { typ: "feldGeaendert", feld: "hausnummer", wert: "20" },
      { typ: "anschriftFertig" }
    );
    s = mitAntwort(s, GASSTRASSE_20);

    expect(s.vorschlag).toEqual(
      expect.objectContaining({ art: "punkt", abstand: 236 })
    );
    expect(s.punkt).toEqual(HALLE);
  });

  it("Zugangspunkt mit NUKI: the Punkt from NUKI gets the suggested Anschrift", () => {
    let s = folge(neu(), {
      typ: "punktGesetzt",
      punkt: HALLE,
      herkunft: "nuki",
    });
    s = folge(mitAntwort(s, GASSTRASSE_6), { typ: "vorschlagUebernehmen" });

    expect(zuGespeichert(s)).toEqual(
      expect.objectContaining({
        display_address: "Gasstraße 6, 03172 Guben",
        meta: { source: "nuki", additional: null },
      })
    );
  });

  it("Altdaten nur als Text: saved unchanged, refused once changed, fine with a hit", () => {
    const alt = ausGespeichert("Sportplatz Kaltenborner Straße, Guben");
    expect(pruefen(alt)).toEqual({
      speicherbar: true,
      grund: null,
      punktFehlt: true,
    });
    expect(zuGespeichert(alt)).toBe("Sportplatz Kaltenborner Straße, Guben");

    const s = folge(alt, {
      typ: "trefferGewaehlt",
      treffer: TREFFER_GASSTRASSE,
    });
    expect(pruefen(s).speicherbar).toBe(true);
    expect(zuGespeichert(s).display_address).toBe("Gasstraße 4, 03172 Guben");
  });
});
