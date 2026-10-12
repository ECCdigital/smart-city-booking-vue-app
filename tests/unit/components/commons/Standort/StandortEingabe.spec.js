import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import StandortEingabe from "@/components/commons/Standort/StandortEingabe.vue";

vi.mock("@/services/api/ApiGeoService", () => ({
  default: {
    search: vi.fn(),
    reverse: vi.fn(),
    start: vi.fn(),
    tile: vi.fn(),
  },
}));

import ApiGeoService from "@/services/api/ApiGeoService";

// The map stands aside: a click and the end of a drag are its events.
const KarteStub = {
  name: "StandortKarte",
  props: {
    punkt: { type: Object, default: null },
    vorschlagPunkt: { type: Object, default: null },
    ansicht: { type: Object, default: null },
    tenantId: { type: String, default: null },
  },
  render(h) {
    return h("div", { attrs: { "data-test": "stub-karte" } });
  },
};

// A hit of `geo/search` or `geo/reverse`: the stored form of a Standort.
const hit = ({
  lat,
  lon,
  country_code = "DE",
  display_address,
  ...address
}) => ({
  address: {
    street: null,
    house_number: null,
    postcode: null,
    city: null,
    country_code,
    ...address,
  },
  coordinates: { type: "Point", points: [lon, lat] },
  display_address,
});
const GASSTRASSE = hit({
  street: "Gasstraße",
  house_number: "4",
  postcode: "03172",
  city: "Guben",
  lat: 51.950438,
  lon: 14.714485,
  display_address: "Gasstraße 4, 03172 Guben",
});
const GUBIN = hit({
  street: "Piastowska",
  house_number: "16",
  postcode: "66-620",
  city: "Gubin",
  country_code: "PL",
  lat: 51.9497,
  lon: 14.7276,
  display_address: "Piastowska 16, 66-620 Gubin",
});
const STORED_GASSTRASSE = {
  address: {
    street: "Gasstraße",
    house_number: "4",
    postcode: "03172",
    city: "Guben",
    country_code: "DE",
  },
  display_address: "Gasstraße 4, 03172 Guben",
  coordinates: { type: "Point", points: [14.714485, 51.950438] },
  meta: { source: "photon", additional: null },
};

const unavailable = () =>
  Object.assign(new Error("Request failed with status code 503"), {
    response: { status: 503, data: { code: "geo_search_unavailable" } },
  });

/** Mounts the input with `v-model` the way a page binds it. */
function mountEingabe(propsData = {}) {
  let wrapper = null;
  wrapper = mountComponent(StandortEingabe, {
    propsData: { value: null, tenantId: "t1", ...propsData },
    stubs: { StandortKarte: KarteStub },
    listeners: {
      input: (value) => wrapper.setProps({ value }),
    },
  });
  return wrapper;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const karte = (wrapper) => wrapper.findComponent(KarteStub);
const settle = () => vi.advanceTimersByTimeAsync(0);
const lastInput = (wrapper) => wrapper.emitted("input")?.slice(-1)[0][0];

async function type(wrapper, test, text) {
  await find(wrapper, test).find("input").setValue(text);
}

/** Types into the search and waits out its pause. */
async function search(wrapper, text) {
  await type(wrapper, "standort-suche", text);
  await vi.advanceTimersByTimeAsync(300);
  await settle();
}

const hits = (wrapper) => wrapper.findAll("[data-test='standort-treffer']");

describe("StandortEingabe - the search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    ApiGeoService.start.mockResolvedValue({ lat: 51.95, lon: 14.71, zoom: 12 });
    ApiGeoService.search.mockResolvedValue([GASSTRASSE, GUBIN]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks after a pause of 300 ms, from 3 characters, with the middle of the map as focus", async () => {
    const wrapper = mountEingabe();
    karte(wrapper).vm.$emit("ausschnitt", { lat: 51.95, lon: 14.71 });

    await type(wrapper, "standort-suche", "Ga");
    await vi.advanceTimersByTimeAsync(300);
    expect(ApiGeoService.search).not.toHaveBeenCalled();

    await type(wrapper, "standort-suche", "Gasstr");
    await vi.advanceTimersByTimeAsync(299);
    expect(ApiGeoService.search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(ApiGeoService.search).toHaveBeenCalledTimes(1);
    expect(ApiGeoService.search).toHaveBeenCalledWith("t1", {
      q: "Gasstr",
      lat: 51.95,
      lon: 14.71,
      lang: "de",
    });
  });

  it("shows at most 5 hits, one from abroad with its country as chip", async () => {
    ApiGeoService.search.mockResolvedValue([
      GASSTRASSE,
      GUBIN,
      GASSTRASSE,
      GASSTRASSE,
      GASSTRASSE,
      GASSTRASSE,
    ]);
    const wrapper = mountEingabe();

    await search(wrapper, "Gasstraße");

    expect(hits(wrapper)).toHaveLength(5);
    expect(hits(wrapper).at(0).text()).toContain("Gasstraße 4, 03172 Guben");
    expect(hits(wrapper).at(0).find(".v-chip").exists()).toBe(false);
    expect(hits(wrapper).at(1).find(".v-chip").text()).toBe("Polen");
  });

  it("fills the fields with a hit, sets the Punkt, keeps the Zusatz and reports the Standort", async () => {
    const wrapper = mountEingabe();
    await type(wrapper, "standort-zusatz", "Halle 2");

    await search(wrapper, "Gasstraße 4");
    await hits(wrapper).at(0).trigger("click");

    expect(find(wrapper, "standort-strasse").find("input").element.value).toBe(
      "Gasstraße"
    );
    expect(
      find(wrapper, "standort-hausnummer").find("input").element.value
    ).toBe("4");
    expect(find(wrapper, "standort-plz").find("input").element.value).toBe(
      "03172"
    );
    expect(find(wrapper, "standort-ort").find("input").element.value).toBe(
      "Guben"
    );
    expect(find(wrapper, "standort-zusatz").find("input").element.value).toBe(
      "Halle 2"
    );
    expect(karte(wrapper).props("punkt")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });
    expect(lastInput(wrapper)).toEqual({
      ...STORED_GASSTRASSE,
      meta: { source: "photon", additional: "Halle 2" },
    });
  });

  it("is driven by keys: arrows choose, Enter takes, Escape closes", async () => {
    const wrapper = mountEingabe();
    await search(wrapper, "Guben");
    const input = find(wrapper, "standort-suche").find("input");

    await input.trigger("keydown", { key: "Escape" });
    expect(hits(wrapper)).toHaveLength(0);

    await input.trigger("keydown", { key: "ArrowDown" });
    expect(hits(wrapper)).toHaveLength(2);
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });

    expect(find(wrapper, "standort-ort").find("input").element.value).toBe(
      "Gubin"
    );
    expect(find(wrapper, "standort-land").find("input").element.value).toBe(
      "PL"
    );
  });

  it("shows the country as a field only outside Germany", async () => {
    const wrapper = mountEingabe({ value: STORED_GASSTRASSE });

    expect(find(wrapper, "standort-land").exists()).toBe(false);
  });

  it("tells when the search is unavailable, and the fields keep working", async () => {
    ApiGeoService.search.mockRejectedValue(unavailable());
    const wrapper = mountEingabe();

    await search(wrapper, "Gasstraße");

    expect(wrapper.text()).toContain(
      "Suche gerade nicht erreichbar, setze den Punkt auf der Karte"
    );
    await type(wrapper, "standort-ort", "Guben");
    expect(lastInput(wrapper).address.city).toBe("Guben");
  });
});

describe("StandortEingabe - map and Punkt", () => {
  const HALLE = { lat: 51.95046, lon: 14.71528 };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    ApiGeoService.start.mockResolvedValue({ lat: 51.95, lon: 14.71, zoom: 12 });
    ApiGeoService.search.mockResolvedValue([GASSTRASSE]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("begins the map at the Punkt and asks for no start view", async () => {
    const wrapper = mountEingabe({ value: STORED_GASSTRASSE });
    await settle();

    expect(ApiGeoService.start).not.toHaveBeenCalled();
    expect(karte(wrapper).props("punkt")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });
  });

  it("asks once for the start view of a Standort without Punkt", async () => {
    const wrapper = mountEingabe();
    await settle();

    expect(ApiGeoService.start).toHaveBeenCalledTimes(1);
    expect(ApiGeoService.start).toHaveBeenCalledWith("t1");
    expect(karte(wrapper).props("ansicht")).toEqual({
      lat: 51.95,
      lon: 14.71,
      zoom: 12,
    });
  });

  it("runs the reverse search on a click into the map and suggests the Anschrift, never overwriting it", async () => {
    ApiGeoService.reverse.mockResolvedValue(
      hit({
        street: "Kaltenborner Straße",
        house_number: "70",
        postcode: "03172",
        city: "Guben",
        lat: HALLE.lat,
        lon: HALLE.lon,
        display_address: "Kaltenborner Straße 70, 03172 Guben",
      })
    );
    const wrapper = mountEingabe({ value: STORED_GASSTRASSE });

    karte(wrapper).vm.$emit("punkt-gesetzt", HALLE);
    await settle();

    expect(ApiGeoService.reverse).toHaveBeenCalledWith("t1", {
      ...HALLE,
      lang: "de",
    });
    expect(find(wrapper, "standort-vorschlag").text()).toContain(
      "Anschrift am neuen Punkt: Kaltenborner Straße 70, 03172 Guben"
    );
    expect(find(wrapper, "standort-strasse").find("input").element.value).toBe(
      "Gasstraße"
    );
    expect(lastInput(wrapper).coordinates.points).toEqual([
      HALLE.lon,
      HALLE.lat,
    ]);
    expect(lastInput(wrapper).meta.source).toBe("manual");

    await find(wrapper, "standort-vorschlag-uebernehmen").trigger("click");

    expect(find(wrapper, "standort-strasse").find("input").element.value).toBe(
      "Kaltenborner Straße"
    );
    expect(find(wrapper, "standort-vorschlag").exists()).toBe(false);
  });

  it("keeps the Anschrift when the suggestion is declined", async () => {
    ApiGeoService.reverse.mockResolvedValue(
      hit({ street: "Kaltenborner Straße", city: "Guben", ...HALLE })
    );
    const wrapper = mountEingabe({ value: STORED_GASSTRASSE });
    karte(wrapper).vm.$emit("punkt-gesetzt", HALLE);
    await settle();

    await find(wrapper, "standort-vorschlag-verwerfen").trigger("click");

    expect(find(wrapper, "standort-vorschlag").exists()).toBe(false);
    expect(find(wrapper, "standort-strasse").find("input").element.value).toBe(
      "Gasstraße"
    );
  });

  it("asks whether a Punkt set by hand follows a changed Anschrift, with distance and a pale second pin", async () => {
    const vonHand = {
      ...STORED_GASSTRASSE,
      coordinates: { type: "Point", points: [HALLE.lon, HALLE.lat] },
      meta: { source: "manual", additional: null },
    };
    ApiGeoService.search.mockResolvedValue([GASSTRASSE]);
    const wrapper = mountEingabe({ value: vonHand });

    await type(wrapper, "standort-hausnummer", "4a");
    await find(wrapper, "standort-hausnummer").find("input").trigger("blur");
    await settle();

    expect(find(wrapper, "standort-vorschlag").text()).toMatch(
      /Die Anschrift liegt \d+ m vom Punkt\. Punkt zur Anschrift verschieben\?/
    );
    expect(karte(wrapper).props("vorschlagPunkt")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });

    await find(wrapper, "standort-vorschlag-uebernehmen").trigger("click");
    expect(karte(wrapper).props("punkt")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });
  });

  it("runs the reverse search again after the Standort was read anew, as after a save", async () => {
    ApiGeoService.reverse.mockResolvedValue(null);
    const wrapper = mountEingabe({ value: STORED_GASSTRASSE });
    karte(wrapper).vm.$emit("punkt-gesetzt", HALLE);
    await settle();
    const saved = lastInput(wrapper);
    await wrapper.setProps({ value: { ...saved }, gespeichert: saved });

    karte(wrapper).vm.$emit("punkt-gesetzt", { lat: 51.951, lon: 14.716 });
    await settle();

    expect(ApiGeoService.reverse).toHaveBeenCalledTimes(2);
  });

  it("tells once when the map is unavailable", async () => {
    const wrapper = mountEingabe();

    karte(wrapper).vm.$emit("kacheln-ausfall");
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "standort-karte-ausfall").text()).toBe(
      "Karte gerade nicht erreichbar"
    );
  });

  it("sets a Punkt from outside, from NUKI, and suggests the Anschrift", async () => {
    ApiGeoService.reverse.mockResolvedValue(GASSTRASSE);
    const wrapper = mountEingabe();

    wrapper.vm.setzePunkt({ lat: 51.950438, lon: 14.714485 });
    await settle();

    expect(lastInput(wrapper)).toEqual({
      address: {
        street: null,
        house_number: null,
        postcode: null,
        city: null,
        country_code: "DE",
      },
      display_address: "",
      coordinates: { type: "Point", points: [14.714485, 51.950438] },
      meta: { source: "nuki", additional: null },
    });
    expect(find(wrapper, "standort-vorschlag").text()).toContain(
      "Gasstraße 4, 03172 Guben"
    );
    expect(wrapper.text()).toContain("Punkt von NUKI");
  });
});

describe("StandortEingabe - a place the search does not know", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    ApiGeoService.start.mockResolvedValue({ lat: 51.95, lon: 14.71, zoom: 12 });
    ApiGeoService.search.mockResolvedValue([]);
    ApiGeoService.reverse.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers to set the Punkt on the map, puts the text in the Zusatz and waits for the Punkt", async () => {
    const wrapper = mountEingabe();
    await search(wrapper, "Neißewiese");

    const ohne = find(wrapper, "standort-ohne-treffer");
    expect(ohne.text()).toContain("„Neißewiese“ auf der Karte setzen");
    await ohne.trigger("click");

    expect(find(wrapper, "standort-zusatz").find("input").element.value).toBe(
      "Neißewiese"
    );
    expect(find(wrapper, "standort-setzen").text()).toContain(
      "Klicke in die Karte, wo „Neißewiese“ liegt."
    );

    karte(wrapper).vm.$emit("punkt-gesetzt", { lat: 51.953, lon: 14.7198 });
    await settle();

    expect(find(wrapper, "standort-setzen").exists()).toBe(false);
    expect(lastInput(wrapper).meta).toEqual({
      source: "manual",
      additional: "Neißewiese",
    });
  });

  it("names the place after hits as „Nicht dabei?“", async () => {
    ApiGeoService.search.mockResolvedValue([GASSTRASSE]);
    const wrapper = mountEingabe();

    await search(wrapper, "Gasstraße");

    expect(find(wrapper, "standort-ohne-treffer").text()).toContain(
      "Nicht dabei? „Gasstraße“ auf der Karte setzen"
    );
  });

  it("goes back to the search when cancelled", async () => {
    const wrapper = mountEingabe();
    await search(wrapper, "Neißewiese");
    await find(wrapper, "standort-ohne-treffer").trigger("click");

    await find(wrapper, "standort-setzen-abbrechen").trigger("click");
    await settle();

    expect(find(wrapper, "standort-setzen").exists()).toBe(false);
    expect(find(wrapper, "standort-suche").find("input").element.value).toBe(
      "Neißewiese"
    );
  });
});

describe("StandortEingabe - whether it may be saved", () => {
  const OLD_TEXT = "Sportplatz Kaltenborner Straße, Guben";
  const lastCheck = (wrapper) => wrapper.emitted("pruefung").slice(-1)[0][0];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    ApiGeoService.start.mockResolvedValue({ lat: 51.95, lon: 14.71, zoom: 12 });
    ApiGeoService.search.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports an Anschrift without Punkt as not to be saved, with the reason", async () => {
    const wrapper = mountEingabe();

    await type(wrapper, "standort-strasse", "Gasstraße");

    expect(lastCheck(wrapper)).toEqual({
      speicherbar: false,
      grund: "anschriftOhnePunkt",
      punktFehlt: true,
    });
    expect(lastInput(wrapper).address.street).toBe("Gasstraße");
  });

  it("reports an empty Standort as fine from the start", () => {
    const wrapper = mountEingabe();

    expect(wrapper.emitted("pruefung")).toEqual([
      [{ speicherbar: true, grund: null, punktFehlt: false }],
    ]);
  });

  it("shows the reason at the input once a surrounding form validates", async () => {
    const wrapper = mountEingabe();
    await type(wrapper, "standort-strasse", "Gasstraße");

    wrapper.findComponent({ name: "v-input" }).vm.validate(true);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(
      "Anschrift ohne Punkt. Setze den Punkt auf der Karte."
    );
  });

  it("marks an old Standort without Punkt, lets it be saved untouched and hands nothing out", async () => {
    const wrapper = mountEingabe({ value: OLD_TEXT });
    await settle();

    expect(find(wrapper, "standort-punkt-fehlt").text()).toContain(
      "Punkt fehlt."
    );
    expect(find(wrapper, "standort-suche").find("input").element.value).toBe(
      OLD_TEXT
    );
    expect(lastCheck(wrapper).speicherbar).toBe(true);
    expect(wrapper.emitted("input")).toBeUndefined();
  });

  it("searches the old text with „Text suchen“", async () => {
    const wrapper = mountEingabe({ value: OLD_TEXT });

    await find(wrapper, "standort-text-suchen").trigger("click");
    await settle();

    expect(ApiGeoService.search).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ q: OLD_TEXT })
    );
  });

  it("measures against the stored Standort it is given", async () => {
    const wrapper = mountEingabe({
      value: { display_address: OLD_TEXT, meta: { additional: "Nord" } },
      gespeichert: OLD_TEXT,
    });

    expect(lastCheck(wrapper)).toEqual({
      speicherbar: false,
      grund: "altTextOhnePunkt",
      punktFehlt: true,
    });
  });

  it("hands the stored Standort back word for word once changed back", async () => {
    const wrapper = mountEingabe({ value: OLD_TEXT });

    await type(wrapper, "standort-zusatz", "Nord");
    await type(wrapper, "standort-zusatz", "");

    expect(lastInput(wrapper)).toBe(OLD_TEXT);
    expect(lastCheck(wrapper).speicherbar).toBe(true);
  });
});
