import { describe, expect, it } from "vitest";
import {
  check,
  distance,
  fromStored,
  locationRefusal,
  pointOf,
  reducer,
  toStored,
} from "@/utils/locationLogic";

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

// A hit of `geo/search` or `geo/reverse`: the stored form of a location.
const hit = ({ lat, lon, ...address }) => ({
  address: { country_code: "DE", ...address },
  coordinates: { type: "Point", points: [lon, lat] },
});
const HIT_GASSTRASSE = hit({
  street: "Gasstraße",
  house_number: "4",
  postcode: "03172",
  city: "Guben",
  lat: 51.950438,
  lon: 14.714485,
});

// A scenario: the state after a series of actions.
const after = (start, ...actions) => actions.reduce(reducer, start);
const fresh = () => fromStored(null);

describe("conversion of an unchanged location", () => {
  it.each([
    ["a location with address and point", GASSTRASSE],
    ["a location stored only as text", "Sportplatz Kaltenborner Straße, Guben"],
    [
      "an old location without point",
      {
        address: { street: "Gasstraße", house_number: "4", city: "Guben" },
        display_address: "Gasstraße 4, Guben",
        coordinates: { type: "Point", points: [null, null] },
      },
    ],
    ["the empty default of a bookable", ""],
    ["no location at all", null],
  ])("gives back %s word for word", (_, stored) => {
    expect(toStored(fromStored(stored))).toBe(stored);
  });
});

describe("the state from the stored form", () => {
  const withOrigin = (source) => ({ ...GASSTRASSE, meta: { source } });

  it("reads address, addition and point", () => {
    const s = fromStored({
      ...GASSTRASSE,
      meta: { source: "photon", additional: "Halle 2, Hintereingang" },
    });

    expect(s.address).toEqual({
      street: "Gasstraße",
      houseNumber: "4",
      postcode: "03172",
      city: "Guben",
      countryCode: "DE",
      addition: "Halle 2, Hintereingang",
    });
    expect(s.point).toEqual({ lat: 51.950438, lon: 14.714485 });
    expect(s.pointOrigin).toBe("search");
    expect(s.oldText).toBe("");
  });

  it.each([
    ["photon", "search"],
    ["nominatim", "search"],
    ["manual", "map"],
    ["legacy", "map"],
    ["nuki", "nuki"],
    [undefined, "map"],
  ])("takes a point with origin %s as from %s", (source, origin) => {
    expect(fromStored(withOrigin(source)).pointOrigin).toBe(origin);
  });

  it("reads the postcode under its old name post_code as well", () => {
    const s = fromStored({
      ...GASSTRASSE,
      address: { street: "Gasstraße", post_code: "03172", city: "Guben" },
    });

    expect(s.address.postcode).toBe("03172");
  });

  it("reads the country code in capitals and takes Germany without one", () => {
    const poland = fromStored({
      ...GASSTRASSE,
      address: { city: "Gubin", country_code: "pl" },
    });
    const without = fromStored({ ...GASSTRASSE, address: { city: "Guben" } });

    expect(poland.address.countryCode).toBe("PL");
    expect(without.address.countryCode).toBe("DE");
  });

  it("keeps a location stored as text as the old text, without point", () => {
    const s = fromStored("Sportplatz Kaltenborner Straße, Guben");

    expect(s.oldText).toBe("Sportplatz Kaltenborner Straße, Guben");
    expect(s.point).toBeNull();
    expect(s.pointOrigin).toBeNull();
  });

  it("keeps the text of an old location without point for the search", () => {
    const s = fromStored({
      display_address: "Rathaus, Guben",
      coordinates: { type: "Point", points: [null, null] },
    });

    expect(s.oldText).toBe("Rathaus, Guben");
    expect(s.point).toBeNull();
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
  ])("reads %s as no point", (_, stored) => {
    const s = fromStored(stored);

    expect(s.point).toBeNull();
    expect(s.pointOrigin).toBeNull();
    expect(s.oldText).toBe("");
  });

  it("reads the default of an event as an empty location", () => {
    const s = fromStored({
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

    expect(s.address).toEqual({
      street: "",
      houseNumber: "",
      postcode: "",
      city: "",
      countryCode: "DE",
      addition: "",
    });
    expect(s.point).toBeNull();
  });

  it("reads an old point given as lat and lng", () => {
    const s = fromStored({
      display_address: "Gasstraße 4, Guben",
      lat: 51.950438,
      lng: 14.714485,
    });

    expect(s.point).toEqual({ lat: 51.950438, lon: 14.714485 });
    expect(s.pointOrigin).toBe("map");
  });
});

describe("choosing a hit of the search", () => {
  it("fills address and point and keeps the addition", () => {
    const s = after(
      fresh(),
      {
        type: "fieldChanged",
        field: "addition",
        value: "Halle 2, Hintereingang",
      },
      { type: "hitChosen", hit: HIT_GASSTRASSE }
    );

    expect(s.address).toEqual({
      street: "Gasstraße",
      houseNumber: "4",
      postcode: "03172",
      city: "Guben",
      countryCode: "DE",
      addition: "Halle 2, Hintereingang",
    });
    expect(s.point).toEqual({ lat: 51.950438, lon: 14.714485 });
    expect(s.pointOrigin).toBe("search");
  });

  it("replaces the old text of a location without point", () => {
    const s = after(fromStored("Sportplatz, Guben"), {
      type: "hitChosen",
      hit: HIT_GASSTRASSE,
    });

    expect(s.oldText).toBe("");
  });

  // A place without house address (a park, a square, a hall) has no street;
  // its name stands in front of the hit's display text (Marvin's decision).
  describe("a place without street", () => {
    const placeHit = (display_address, address = {}) => ({
      ...hit({
        postcode: "03172",
        city: "Guben",
        lat: 51.9531,
        lon: 14.7189,
        ...address,
      }),
      display_address,
    });
    const STADTPARK = placeHit("Stadtpark, 03172 Guben");
    const choose = (start, chosen) =>
      after(start, { type: "hitChosen", hit: chosen });

    it("puts its name into an empty addition", () => {
      const s = choose(fresh(), STADTPARK);

      expect(s.address.addition).toBe("Stadtpark");
      expect(s.address.street).toBe("");
      expect(toStored(s).meta.additional).toBe("Stadtpark");
    });

    it("keeps an addition already there", () => {
      const s = choose(
        after(fresh(), {
          type: "fieldChanged",
          field: "addition",
          value: "Halle 2",
        }),
        STADTPARK
      );

      expect(s.address.addition).toBe("Halle 2");
    });

    it("takes a name without postcode and city as it is", () => {
      const s = choose(
        fresh(),
        placeHit("Neißeufer", { postcode: null, city: null })
      );

      expect(s.address.addition).toBe("Neißeufer");
    });

    it.each([
      ["a town, whose name is its city", placeHit("03172 Guben")],
      [
        "a hit with street",
        { ...HIT_GASSTRASSE, display_address: "Gasstraße 4, 03172 Guben" },
      ],
    ])("adds no name for %s", (_, chosen) => {
      expect(choose(fresh(), chosen).address.addition).toBe("");
    });
  });
});

const HALL = { lat: 51.950438, lon: 14.715278 }; // 54 m east of Gasstraße 4
const GASSTRASSE_POINT = { lat: 51.950438, lon: 14.714485 };
const WILKESCHE_HOEFE = hit({ city: "Guben", lat: 51.9505, lon: 14.7153 });
const GASSTRASSE_6 = hit({
  street: "Gasstraße",
  house_number: "6",
  postcode: "03172",
  city: "Guben",
  lat: 51.95044,
  lon: 14.71528,
});

// The answer to the request the state carries.
const answer = (s, fields) => ({
  type: s.request.kind === "reverse" ? "reverseResult" : "searchResult",
  id: s.request.id,
  ...fields,
});

describe("setting the point on the map or by NUKI", () => {
  const chosen = () =>
    after(fresh(), { type: "hitChosen", hit: HIT_GASSTRASSE });

  it.each(["map", "nuki"])(
    "sets the point from %s and asks for a reverse search",
    (origin) => {
      const s = after(chosen(), {
        type: "pointSet",
        point: HALL,
        origin,
      });

      expect(s.point).toEqual(HALL);
      expect(s.pointOrigin).toBe(origin);
      expect(s.request).toEqual({
        id: expect.anything(),
        kind: "reverse",
        point: HALL,
      });
    }
  );

  it("gives a new id to every request", () => {
    const first = after(chosen(), {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });
    const second = after(first, {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });

    expect(second.request.id).not.toBe(first.request.id);
  });

  it("makes the found address a suggestion and never overwrites", () => {
    const placed = after(chosen(), {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });
    const s = after(placed, answer(placed, { hit: GASSTRASSE_6 }));

    expect(s.address.houseNumber).toBe("4");
    expect(s.suggestion).toEqual({
      kind: "address",
      address: {
        street: "Gasstraße",
        houseNumber: "6",
        postcode: "03172",
        city: "Guben",
        countryCode: "DE",
        addition: "",
      },
    });
    expect(s.request).toBeNull();
  });

  it("suggests an address for a point from NUKI", () => {
    const placed = after(fresh(), {
      type: "pointSet",
      point: HALL,
      origin: "nuki",
    });
    const s = after(placed, answer(placed, { hit: GASSTRASSE_6 }));

    expect(s.address.street).toBe("");
    expect(s.suggestion.address.street).toBe("Gasstraße");
  });

  it("takes over the suggestion and keeps the addition", () => {
    const placed = after(
      chosen(),
      { type: "fieldChanged", field: "addition", value: "Halle 2" },
      { type: "pointSet", point: HALL, origin: "map" }
    );
    const s = after(placed, answer(placed, { hit: GASSTRASSE_6 }), {
      type: "suggestionAccepted",
    });

    expect(s.address.houseNumber).toBe("6");
    expect(s.address.addition).toBe("Halle 2");
    expect(s.point).toEqual(HALL);
    expect(s.pointOrigin).toBe("map");
    expect(s.suggestion).toBeNull();
  });

  it("keeps the address when the suggestion is dismissed", () => {
    const placed = after(chosen(), {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });
    const s = after(placed, answer(placed, { hit: GASSTRASSE_6 }), {
      type: "suggestionDismissed",
    });

    expect(s.address.houseNumber).toBe("4");
    expect(s.suggestion).toBeNull();
  });

  describe("gives no suggestion", () => {
    it("when the reverse search finds nothing", () => {
      const placed = after(chosen(), {
        type: "pointSet",
        point: HALL,
        origin: "map",
      });
      const s = after(placed, answer(placed, { hit: null }));

      expect(s.suggestion).toBeNull();
      expect(s.request).toBeNull();
    });

    it("when it finds a place without street and the address has one", () => {
      const placed = after(chosen(), {
        type: "pointSet",
        point: HALL,
        origin: "map",
      });
      const s = after(placed, answer(placed, { hit: WILKESCHE_HOEFE }));

      expect(s.suggestion).toBeNull();
      expect(s.address.street).toBe("Gasstraße");
    });

    it("when it finds the same address", () => {
      const placed = after(chosen(), {
        type: "pointSet",
        point: HALL,
        origin: "map",
      });
      const s = after(placed, answer(placed, { hit: HIT_GASSTRASSE }));

      expect(s.suggestion).toBeNull();
    });

    it("when the answer is stale, its id no longer matching", () => {
      const first = after(chosen(), {
        type: "pointSet",
        point: HALL,
        origin: "map",
      });
      const second = after(first, {
        type: "pointSet",
        point: GASSTRASSE_POINT,
        origin: "map",
      });
      const s = after(second, answer(first, { hit: GASSTRASSE_6 }));

      expect(s.suggestion).toBeNull();
      expect(s.request).toEqual(second.request);
    });
  });

  it("suggests a place without street while the address has none", () => {
    const placed = after(fresh(), {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });
    const s = after(placed, answer(placed, { hit: WILKESCHE_HOEFE }));

    expect(s.suggestion.address.city).toBe("Guben");
  });
});

describe("distance", () => {
  it("measures a degree of latitude as about 111 km", () => {
    expect(distance({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(
      111195,
      0
    );
  });

  it("is 0 for the same point", () => {
    expect(distance(HALL, HALL)).toBe(0);
  });
});

describe("changing the address", () => {
  // 229 m north of Gasstraße 4, 236 m from the hall.
  const GASSTRASSE_20 = hit({
    street: "Gasstraße",
    house_number: "20",
    postcode: "03172",
    city: "Guben",
    lat: 51.9525,
    lon: 14.714485,
  });
  const houseNumber20 = [
    { type: "fieldChanged", field: "houseNumber", value: "20" },
    { type: "addressDone" },
  ];
  const fromSearch = () =>
    after(fresh(), { type: "hitChosen", hit: HIT_GASSTRASSE });
  const byHand = (origin = "map") =>
    after(
      fromSearch(),
      { type: "pointSet", point: HALL, origin },
      {
        type: "suggestionDismissed",
      }
    );
  const afterSearch = (start, found) => {
    const s = after(start, ...houseNumber20);
    return after(s, answer(s, { hit: found }));
  };

  it("asks for a search with the address", () => {
    const s = after(fromSearch(), ...houseNumber20);

    expect(s.request).toEqual({
      id: expect.anything(),
      kind: "search",
      address: expect.objectContaining({
        street: "Gasstraße",
        houseNumber: "20",
        city: "Guben",
      }),
    });
  });

  it.each([
    ["only a street", { street: "Gasstraße" }, false],
    ["a postcode", { postcode: "03172" }, true],
    ["a city", { city: "Guben" }, true],
  ])("with %s asks for a search: %s", (_, fields, searches) => {
    const s = after(
      fresh(),
      ...Object.entries(fields).map(([field, value]) => ({
        type: "fieldChanged",
        field,
        value,
      })),
      { type: "addressDone" }
    );

    expect(s.request !== null).toBe(searches);
  });

  it("asks for nothing once a hit filled the address", () => {
    const s = after(
      fresh(),
      { type: "fieldChanged", field: "city", value: "Gub" },
      { type: "hitChosen", hit: HIT_GASSTRASSE },
      { type: "addressDone" }
    );

    expect(s.request).toBeNull();
  });

  it("asks for nothing when only the addition changed", () => {
    const s = after(
      fromSearch(),
      { type: "fieldChanged", field: "addition", value: "Halle 2" },
      { type: "addressDone" }
    );

    expect(s.request).toBeNull();
  });

  it("moves a point from the search along without asking", () => {
    const s = afterSearch(fromSearch(), GASSTRASSE_20);

    expect(s.point).toEqual({ lat: 51.9525, lon: 14.714485 });
    expect(s.pointOrigin).toBe("search");
    expect(s.suggestion).toBeNull();
  });

  it("sets the point where there was none", () => {
    const s = after(
      fresh(),
      { type: "fieldChanged", field: "street", value: "Gasstraße" },
      { type: "fieldChanged", field: "city", value: "Guben" },
      { type: "addressDone" }
    );
    const n = after(s, answer(s, { hit: GASSTRASSE_20 }));

    expect(n.point).toEqual({ lat: 51.9525, lon: 14.714485 });
    expect(n.pointOrigin).toBe("search");
  });

  it.each(["map", "nuki"])(
    "asks with the distance before moving a point from %s",
    (origin) => {
      const s = afterSearch(byHand(origin), GASSTRASSE_20);

      expect(s.point).toEqual(HALL);
      expect(s.suggestion).toEqual({
        kind: "point",
        point: { lat: 51.9525, lon: 14.714485 },
        distance: 236,
      });
    }
  );

  it("moves the point when the question is answered with yes", () => {
    const s = after(afterSearch(byHand(), GASSTRASSE_20), {
      type: "suggestionAccepted",
    });

    expect(s.point).toEqual({ lat: 51.9525, lon: 14.714485 });
    expect(s.pointOrigin).toBe("search");
    expect(s.address.houseNumber).toBe("20");
    expect(s.suggestion).toBeNull();
  });

  it("keeps the point when the question is answered with no", () => {
    const s = after(afterSearch(byHand(), GASSTRASSE_20), {
      type: "suggestionDismissed",
    });

    expect(s.point).toEqual(HALL);
    expect(s.pointOrigin).toBe("map");
  });

  it("does nothing under 25 m", () => {
    const nextDoor = hit({
      street: "Gasstraße",
      house_number: "20",
      city: "Guben",
      lat: 51.95055,
      lon: 14.715278,
    });
    const s = afterSearch(byHand(), nextDoor);

    expect(s.point).toEqual(HALL);
    expect(s.suggestion).toBeNull();
  });

  it("does nothing when the search finds no point", () => {
    const s = afterSearch(byHand(), null);

    expect(s.point).toEqual(HALL);
    expect(s.suggestion).toBeNull();
    expect(s.request).toBeNull();
  });

  it("drops a stale answer", () => {
    const first = after(fromSearch(), ...houseNumber20);
    const second = after(
      first,
      { type: "fieldChanged", field: "houseNumber", value: "6" },
      {
        type: "addressDone",
      }
    );
    const s = after(second, answer(first, { hit: GASSTRASSE_20 }));

    expect(s.point).toEqual(GASSTRASSE_POINT);
    expect(s.request).toEqual(second.request);
  });

  it("drops a suggestion of an address once a field of the address changes", () => {
    const placed = after(fromSearch(), {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });
    const suggested = after(placed, answer(placed, { hit: GASSTRASSE_6 }));

    const addition = after(suggested, {
      type: "fieldChanged",
      field: "addition",
      value: "Halle 2",
    });
    const street = after(suggested, {
      type: "fieldChanged",
      field: "houseNumber",
      value: "5",
    });

    expect(addition.suggestion).toEqual(suggested.suggestion);
    expect(street.suggestion).toBeNull();
  });

  // User story 26: a stale suggestion lapses once something else changed,
  // so an old answer never overtakes a newer input.
  describe("a stale suggestion", () => {
    const houseNumber = (value) => ({
      type: "fieldChanged",
      field: "houseNumber",
      value,
    });

    it("drops the question to move the point once the address changes again", () => {
      const asked = afterSearch(byHand(), GASSTRASSE_20);
      expect(asked.suggestion.kind).toBe("point");

      const s = after(asked, houseNumber("21"));

      expect(s.suggestion).toBeNull();
      expect(s.point).toEqual(HALL);
    });

    it("keeps the question while only the addition changes", () => {
      const asked = afterSearch(byHand(), GASSTRASSE_20);

      const s = after(asked, {
        type: "fieldChanged",
        field: "addition",
        value: "Halle 2",
      });

      expect(s.suggestion).toEqual(asked.suggestion);
    });

    it("makes no suggestion of a reverse search answered after a new input", () => {
      const placed = after(fromSearch(), {
        type: "pointSet",
        point: HALL,
        origin: "map",
      });
      const typed = after(placed, houseNumber("5"));

      const s = after(typed, answer(placed, { hit: GASSTRASSE_6 }));

      expect(s.suggestion).toBeNull();
      expect(s.request).toBeNull();
      expect(s.address.houseNumber).toBe("5");
    });

    it("makes no suggestion of a search answered after a new input", () => {
      const asking = after(byHand(), ...houseNumber20);
      const typed = after(asking, houseNumber("21"));

      const s = after(typed, answer(asking, { hit: GASSTRASSE_20 }));

      expect(s.suggestion).toBeNull();
      expect(s.point).toEqual(HALL);
    });

    it("moves no point from the search after a new input", () => {
      const asking = after(fromSearch(), ...houseNumber20);
      const typed = after(asking, houseNumber("21"));

      const s = after(typed, answer(asking, { hit: GASSTRASSE_20 }));

      expect(s.point).toEqual(GASSTRASSE_POINT);
    });
  });
});

describe("a place without hit", () => {
  const MEADOW = { lat: 51.953, lon: 14.7198 };

  it("puts the typed text in the empty addition and waits for the point", () => {
    const s = after(fresh(), { type: "withoutHit", text: "Neißewiese Guben" });

    expect(s.address.addition).toBe("Neißewiese Guben");
    expect(s.placing.text).toBe("Neißewiese Guben");
  });

  it("keeps an addition already there", () => {
    const s = after(
      fresh(),
      { type: "fieldChanged", field: "addition", value: "Bühne am Ufer" },
      { type: "withoutHit", text: "Neißewiese Guben" }
    );

    expect(s.address.addition).toBe("Bühne am Ufer");
  });

  it("ends with the point set and suggests an address", () => {
    const placed = after(
      fresh(),
      { type: "withoutHit", text: "Neißewiese Guben" },
      { type: "pointSet", point: MEADOW, origin: "map" }
    );
    const s = after(placed, answer(placed, { hit: WILKESCHE_HOEFE }));

    expect(s.placing).toBeNull();
    expect(s.point).toEqual(MEADOW);
    expect(s.address.addition).toBe("Neißewiese Guben");
    expect(s.suggestion.address).toEqual(
      expect.objectContaining({ city: "Guben", addition: "Neißewiese Guben" })
    );
  });

  it("can be cancelled", () => {
    const s = after(
      fresh(),
      { type: "withoutHit", text: "Neißewiese Guben" },
      { type: "placingCancelled" }
    );

    expect(s.placing).toBeNull();
    expect(s.point).toBeNull();
  });

  // User story 33: cancelling goes back to where it was before.
  it.each([
    ["empty", ""],
    ["filled", "Bühne am Ufer"],
  ])("gives the addition back as it was, %s, when cancelled", (_, before) => {
    const s = after(
      fresh(),
      { type: "fieldChanged", field: "addition", value: before },
      { type: "withoutHit", text: "Neißewiese Guben" },
      { type: "placingCancelled" }
    );

    expect(s.address.addition).toBe(before);
  });
});

describe("check", () => {
  const OLD_WITHOUT_POINT = {
    address: { street: "Gasstraße", house_number: "4", city: "Guben" },
    display_address: "Gasstraße 4, Guben",
    coordinates: { type: "Point", points: [null, null] },
  };
  const storable = { storable: true, reason: null, pointMissing: false };

  describe("saving", () => {
    it("lets a location with address and point be saved", () => {
      const s = after(fresh(), {
        type: "hitChosen",
        hit: HIT_GASSTRASSE,
      });

      expect(check(s)).toEqual(storable);
    });

    it("lets a point without address be saved", () => {
      const s = after(fresh(), {
        type: "pointSet",
        point: HALL,
        origin: "map",
      });

      expect(check(s)).toEqual(storable);
    });

    it.each([
      ["a new location", null],
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
    ])("lets an empty location be saved: %s", (_, stored) => {
      expect(check(fromStored(stored))).toEqual(storable);
    });

    it("lets a location emptied by hand be saved", () => {
      const s = after(
        fromStored(OLD_WITHOUT_POINT),
        { type: "fieldChanged", field: "street", value: "" },
        { type: "fieldChanged", field: "houseNumber", value: "" },
        { type: "fieldChanged", field: "city", value: "" }
      );

      expect(check(s)).toEqual(storable);
    });

    it("refuses an address without point, with the reason", () => {
      const s = after(fresh(), {
        type: "fieldChanged",
        field: "city",
        value: "Guben",
      });

      expect(check(s)).toEqual({
        storable: false,
        reason: "addressWithoutPoint",
        pointMissing: false,
      });
    });

    it("refuses an addition without point", () => {
      const s = after(fresh(), {
        type: "fieldChanged",
        field: "addition",
        value: "Halle 2",
      });

      expect(check(s)).toEqual({
        storable: false,
        reason: "addressWithoutPoint",
        pointMissing: false,
      });
    });

    it("refuses while the point of a place without hit is not set", () => {
      const s = after(fresh(), {
        type: "withoutHit",
        text: "Neißewiese Guben",
      });

      expect(check(s)).toEqual({
        storable: false,
        reason: "pointNotSet",
        pointMissing: false,
      });
    });
  });

  describe("old data", () => {
    it.each([
      ["an old location without point", OLD_WITHOUT_POINT],
      ["a location stored as text", "Sportplatz Kaltenborner Straße, Guben"],
    ])(
      "lets %s be saved unchanged and says the point is missing",
      (_, stored) => {
        expect(check(fromStored(stored))).toEqual({
          storable: true,
          reason: null,
          pointMissing: true,
        });
      }
    );

    it("refuses an old location without point once changed, even only the addition", () => {
      const s = after(fromStored(OLD_WITHOUT_POINT), {
        type: "fieldChanged",
        field: "addition",
        value: "Halle 2",
      });

      expect(check(s)).toEqual({
        storable: false,
        reason: "addressWithoutPoint",
        pointMissing: false,
      });
    });

    it("refuses a location stored as text once changed", () => {
      const s = after(fromStored("Sportplatz, Guben"), {
        type: "fieldChanged",
        field: "addition",
        value: "Eingang Nord",
      });

      expect(check(s)).toEqual({
        storable: false,
        reason: "oldTextWithoutPoint",
        pointMissing: false,
      });
    });

    it("lets it be saved again once changed back", () => {
      const s = after(
        fromStored(OLD_WITHOUT_POINT),
        { type: "fieldChanged", field: "addition", value: "Halle 2" },
        { type: "fieldChanged", field: "addition", value: "" }
      );

      expect(check(s).storable).toBe(true);
    });

    describe("an edited location against the one stored", () => {
      const changed = {
        ...OLD_WITHOUT_POINT,
        meta: { additional: "Halle 2" },
      };

      it("refuses it when it differs from the stored one", () => {
        expect(check(fromStored(changed, OLD_WITHOUT_POINT))).toEqual({
          storable: false,
          reason: "addressWithoutPoint",
          pointMissing: false,
        });
      });

      it("lets it be saved while it says what the stored one says", () => {
        const copy = JSON.parse(JSON.stringify(OLD_WITHOUT_POINT));

        expect(check(fromStored(copy, OLD_WITHOUT_POINT)).storable).toBe(true);
      });

      it("refuses a text without point where nothing was stored", () => {
        expect(check(fromStored("Sportplatz, Guben", null)).reason).toBe(
          "oldTextWithoutPoint"
        );
      });

      it("gives back the stored one while unchanged", () => {
        const copy = JSON.parse(JSON.stringify(OLD_WITHOUT_POINT));

        expect(toStored(fromStored(copy, OLD_WITHOUT_POINT))).toBe(
          OLD_WITHOUT_POINT
        );
      });
    });

    it("lets a location stored as text be saved once it has a point", () => {
      const s = after(fromStored("Sportplatz, Guben"), {
        type: "pointSet",
        point: HALL,
        origin: "map",
      });

      expect(check(s)).toEqual(storable);
    });
  });
});

describe("conversion of a changed location", () => {
  it("writes address, addition, point and its origin", () => {
    const s = after(
      fresh(),
      { type: "hitChosen", hit: HIT_GASSTRASSE },
      {
        type: "fieldChanged",
        field: "addition",
        value: "Halle 2, Hintereingang",
      }
    );

    expect(toStored(s)).toEqual({
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
    ["map", "manual"],
    ["nuki", "nuki"],
  ])("stores a point from %s as %s", (origin, source) => {
    const s = after(fresh(), { type: "pointSet", point: HALL, origin });

    expect(toStored(s).meta.source).toBe(source);
  });

  it("stores a point without address, with the country code", () => {
    const s = after(fresh(), {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });

    expect(toStored(s)).toEqual({
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

  it("writes the country code of a hit abroad in capitals", () => {
    const gubin = hit({
      city: "Gubin",
      country_code: "pl",
      lat: 51.95,
      lon: 14.73,
    });
    const s = after(fresh(), { type: "hitChosen", hit: gubin });

    expect(toStored(s).address.country_code).toBe("PL");
  });

  it("rounds the point to six decimals", () => {
    const s = after(fresh(), {
      type: "pointSet",
      point: { lat: 51.95043812345, lon: 14.71527798765 },
      origin: "map",
    });

    expect(toStored(s).coordinates.points).toEqual([14.715278, 51.950438]);
  });

  it("keeps the old text as display text once a point is set", () => {
    const s = after(fromStored("Sportplatz, Guben"), {
      type: "pointSet",
      point: HALL,
      origin: "map",
    });

    expect(toStored(s).display_address).toBe("Sportplatz, Guben");
  });

  it("stores a removed location as none", () => {
    const s = after(fromStored(GASSTRASSE), { type: "cleared" });

    expect(toStored(s)).toBeNull();
    expect(check(s).storable).toBe(true);
  });

  it("gives back the stored value when changed back", () => {
    const s = after(
      fromStored(GASSTRASSE),
      { type: "fieldChanged", field: "houseNumber", value: "6" },
      { type: "fieldChanged", field: "houseNumber", value: "4" }
    );

    expect(toStored(s)).toBe(GASSTRASSE);
  });
});

// The scenarios of the prototype #375, from opening to the stored form.
describe("scenarios of the prototype", () => {
  // Answers every open request with the given hit, as the input would.
  const withAnswer = (s, found) =>
    s.request ? reducer(s, answer(s, { hit: found })) : s;

  it("pin beside the hall: the point moves to the hall, the address stays", () => {
    let s = after(fresh(), {
      type: "hitChosen",
      hit: HIT_GASSTRASSE,
    });
    s = after(s, { type: "pointSet", point: HALL, origin: "map" });
    s = withAnswer(s, HIT_GASSTRASSE);

    expect(s.suggestion).toBeNull();
    expect(check(s).storable).toBe(true);
    expect(toStored(s)).toEqual(
      expect.objectContaining({
        display_address: "Gasstraße 4, 03172 Guben",
        coordinates: { type: "Point", points: [14.715278, 51.950438] },
        meta: { source: "manual", additional: null },
      })
    );
  });

  it("place without hit: the meadow gets its point and keeps its name", () => {
    let s = after(fresh(), { type: "withoutHit", text: "Neißewiese Guben" });
    expect(check(s).reason).toBe("pointNotSet");

    s = after(s, {
      type: "pointSet",
      point: { lat: 51.953, lon: 14.7198 },
      origin: "map",
    });
    s = withAnswer(s, WILKESCHE_HOEFE);
    s = after(s, { type: "suggestionDismissed" });

    expect(check(s).storable).toBe(true);
    expect(toStored(s)).toEqual(
      expect.objectContaining({
        coordinates: { type: "Point", points: [14.7198, 51.953] },
        meta: { source: "manual", additional: "Neißewiese Guben" },
      })
    );
  });

  it("address changed after the pin: the point by hand is asked about", () => {
    const GASSTRASSE_20 = hit({
      street: "Gasstraße",
      house_number: "20",
      city: "Guben",
      lat: 51.9525,
      lon: 14.714485,
    });
    let s = after(fresh(), {
      type: "hitChosen",
      hit: HIT_GASSTRASSE,
    });
    s = withAnswer(
      after(s, { type: "pointSet", point: HALL, origin: "map" }),
      GASSTRASSE_6
    );
    s = after(s, { type: "suggestionDismissed" });
    s = after(
      s,
      { type: "fieldChanged", field: "houseNumber", value: "20" },
      { type: "addressDone" }
    );
    s = withAnswer(s, GASSTRASSE_20);

    expect(s.suggestion).toEqual(
      expect.objectContaining({ kind: "point", distance: 236 })
    );
    expect(s.point).toEqual(HALL);
  });

  it("access point with NUKI: the point from NUKI gets the suggested address", () => {
    let s = after(fresh(), {
      type: "pointSet",
      point: HALL,
      origin: "nuki",
    });
    s = after(withAnswer(s, GASSTRASSE_6), { type: "suggestionAccepted" });

    expect(toStored(s)).toEqual(
      expect.objectContaining({
        display_address: "Gasstraße 6, 03172 Guben",
        meta: { source: "nuki", additional: null },
      })
    );
  });

  it("old data only as text: saved unchanged, refused once changed, fine with a hit", () => {
    const old = fromStored("Sportplatz Kaltenborner Straße, Guben");
    expect(check(old)).toEqual({
      storable: true,
      reason: null,
      pointMissing: true,
    });
    expect(toStored(old)).toBe("Sportplatz Kaltenborner Straße, Guben");

    const s = after(old, {
      type: "hitChosen",
      hit: HIT_GASSTRASSE,
    });
    expect(check(s).storable).toBe(true);
    expect(toStored(s).display_address).toBe("Gasstraße 4, 03172 Guben");
  });
});

// The one rule of a location, for every place that saves one: the bookable's
// check, the events store, the access point's dialog and the input itself.
describe("locationRefusal", () => {
  const OLD_TEXT = "Sportplatz, Guben";

  it("names the reason as a key of the catalogue", () => {
    const address = { address: { city: "Guben" }, display_address: "Guben" };

    expect(locationRefusal(address, null)).toBe(
      "location.reason.addressWithoutPoint"
    );
    expect(locationRefusal(OLD_TEXT, null)).toBe(
      "location.reason.oldTextWithoutPoint"
    );
  });

  it("lets an unchanged old location without point pass", () => {
    expect(locationRefusal(OLD_TEXT, OLD_TEXT)).toBeNull();
  });

  it.each([
    ["a location with point", GASSTRASSE],
    ["no location", null],
  ])("lets %s pass where nothing is stored", (_, location) => {
    expect(locationRefusal(location, null)).toBeNull();
    expect(locationRefusal(location)).toBeNull();
  });
});

describe("pointOf", () => {
  it.each([
    ["the stored form", GASSTRASSE],
    ["the answer of NUKI", { coordinates: { points: [14.714485, 51.950438] } }],
    ["an old one with lat and lng", { lat: 51.950438, lng: 14.714485 }],
  ])("reads the point of %s", (_, value) => {
    expect(pointOf(value)).toEqual({ lat: 51.950438, lon: 14.714485 });
  });

  it.each([
    ["no location", null],
    ["a text", "Sportplatz, Guben"],
    ["points [null, null]", { coordinates: { points: [null, null] } }],
    ["an empty answer", {}],
  ])("reads no point from %s", (_, value) => {
    expect(pointOf(value)).toBeNull();
  });
});
