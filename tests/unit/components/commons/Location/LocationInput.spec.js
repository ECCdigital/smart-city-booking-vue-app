import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import LocationInput from "@/components/commons/Location/LocationInput.vue";

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
const MapStub = {
  name: "LocationMap",
  props: {
    point: { type: Object, default: null },
    suggestedPoint: { type: Object, default: null },
    view: { type: Object, default: null },
    tenantId: { type: String, default: null },
  },
  render(h) {
    return h("div", { attrs: { "data-test": "stub-map" } });
  },
};

// A hit of `geo/search` or `geo/reverse`: the stored form of a location.
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
function mountInput(propsData = {}) {
  let wrapper = null;
  wrapper = mountComponent(LocationInput, {
    propsData: { value: null, tenantId: "t1", ...propsData },
    stubs: { LocationMap: MapStub },
    listeners: {
      input: (value) => wrapper.setProps({ value }),
    },
  });
  return wrapper;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const map = (wrapper) => wrapper.findComponent(MapStub);
const settle = () => vi.advanceTimersByTimeAsync(0);
const lastInput = (wrapper) => wrapper.emitted("input")?.slice(-1)[0][0];

async function type(wrapper, test, text) {
  await find(wrapper, test).find("input").setValue(text);
}

/** Types into the search and waits out its pause. */
async function search(wrapper, text) {
  await type(wrapper, "location-search", text);
  await vi.advanceTimersByTimeAsync(300);
  await settle();
}

const hits = (wrapper) => wrapper.findAll("[data-test='location-hit']");

describe("LocationInput - the search", () => {
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
    const wrapper = mountInput();
    map(wrapper).vm.$emit("moved", { lat: 51.95, lon: 14.71 });

    await type(wrapper, "location-search", "Ga");
    await vi.advanceTimersByTimeAsync(300);
    expect(ApiGeoService.search).not.toHaveBeenCalled();

    await type(wrapper, "location-search", "Gasstr");
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
    const wrapper = mountInput();

    await search(wrapper, "Gasstraße");

    expect(hits(wrapper)).toHaveLength(5);
    expect(hits(wrapper).at(0).text()).toContain("Gasstraße 4, 03172 Guben");
    expect(hits(wrapper).at(0).find(".v-chip").exists()).toBe(false);
    expect(hits(wrapper).at(1).find(".v-chip").text()).toBe("Polen");
  });

  it("fills the fields with a hit, sets the point, keeps the addition and reports the location", async () => {
    const wrapper = mountInput();
    await type(wrapper, "location-addition", "Halle 2");

    await search(wrapper, "Gasstraße 4");
    await hits(wrapper).at(0).trigger("click");

    expect(find(wrapper, "location-street").find("input").element.value).toBe(
      "Gasstraße"
    );
    expect(
      find(wrapper, "location-houseNumber").find("input").element.value
    ).toBe("4");
    expect(find(wrapper, "location-postcode").find("input").element.value).toBe(
      "03172"
    );
    expect(find(wrapper, "location-city").find("input").element.value).toBe(
      "Guben"
    );
    expect(find(wrapper, "location-addition").find("input").element.value).toBe(
      "Halle 2"
    );
    expect(map(wrapper).props("point")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });
    expect(lastInput(wrapper)).toEqual({
      ...STORED_GASSTRASSE,
      meta: { source: "photon", additional: "Halle 2" },
    });
  });

  it("puts the name of a place without street into the empty addition", async () => {
    ApiGeoService.search.mockResolvedValue([
      hit({
        postcode: "03172",
        city: "Guben",
        lat: 51.9531,
        lon: 14.7189,
        display_address: "Stadtpark, 03172 Guben",
      }),
    ]);
    const wrapper = mountInput();

    await search(wrapper, "Stadtpark");
    await hits(wrapper).at(0).trigger("click");

    expect(find(wrapper, "location-addition").find("input").element.value).toBe(
      "Stadtpark"
    );
    expect(lastInput(wrapper).meta.additional).toBe("Stadtpark");
  });

  it("is driven by keys: arrows choose, Enter takes, Escape closes", async () => {
    const wrapper = mountInput();
    await search(wrapper, "Guben");
    const input = find(wrapper, "location-search").find("input");

    await input.trigger("keydown", { key: "Escape" });
    expect(hits(wrapper)).toHaveLength(0);

    await input.trigger("keydown", { key: "ArrowDown" });
    expect(hits(wrapper)).toHaveLength(2);
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });

    expect(find(wrapper, "location-city").find("input").element.value).toBe(
      "Gubin"
    );
    expect(
      find(wrapper, "location-countryCode").find("input").element.value
    ).toBe("PL");
  });

  it("shows the country as a field only outside Germany", async () => {
    const wrapper = mountInput({ value: STORED_GASSTRASSE });

    expect(find(wrapper, "location-countryCode").exists()).toBe(false);
  });

  it("tells when the search is unavailable, and the fields keep working", async () => {
    ApiGeoService.search.mockRejectedValue(unavailable());
    const wrapper = mountInput();

    await search(wrapper, "Gasstraße");

    expect(wrapper.text()).toContain(
      "Suche gerade nicht erreichbar, setze den Punkt auf der Karte"
    );
    await type(wrapper, "location-city", "Guben");
    expect(lastInput(wrapper).address.city).toBe("Guben");
  });
});

describe("LocationInput - map and point", () => {
  const HALL = { lat: 51.95046, lon: 14.71528 };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    ApiGeoService.start.mockResolvedValue({ lat: 51.95, lon: 14.71, zoom: 12 });
    ApiGeoService.search.mockResolvedValue([GASSTRASSE]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("begins the map at the point and asks for no start view", async () => {
    const wrapper = mountInput({ value: STORED_GASSTRASSE });
    await settle();

    expect(ApiGeoService.start).not.toHaveBeenCalled();
    expect(map(wrapper).props("point")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });
  });

  it("asks once for the start view of a location without point", async () => {
    const wrapper = mountInput();
    await settle();

    expect(ApiGeoService.start).toHaveBeenCalledTimes(1);
    expect(ApiGeoService.start).toHaveBeenCalledWith("t1");
    expect(map(wrapper).props("view")).toEqual({
      lat: 51.95,
      lon: 14.71,
      zoom: 12,
    });
  });

  it("runs the reverse search on a click into the map and suggests the address, never overwriting it", async () => {
    ApiGeoService.reverse.mockResolvedValue(
      hit({
        street: "Kaltenborner Straße",
        house_number: "70",
        postcode: "03172",
        city: "Guben",
        lat: HALL.lat,
        lon: HALL.lon,
        display_address: "Kaltenborner Straße 70, 03172 Guben",
      })
    );
    const wrapper = mountInput({ value: STORED_GASSTRASSE });

    map(wrapper).vm.$emit("point-set", HALL);
    await settle();

    expect(ApiGeoService.reverse).toHaveBeenCalledWith("t1", {
      ...HALL,
      lang: "de",
    });
    expect(find(wrapper, "location-suggestion").text()).toContain(
      "Anschrift am neuen Punkt: Kaltenborner Straße 70, 03172 Guben"
    );
    expect(find(wrapper, "location-street").find("input").element.value).toBe(
      "Gasstraße"
    );
    expect(lastInput(wrapper).coordinates.points).toEqual([HALL.lon, HALL.lat]);
    expect(lastInput(wrapper).meta.source).toBe("manual");

    await find(wrapper, "location-suggestion-accept").trigger("click");

    expect(find(wrapper, "location-street").find("input").element.value).toBe(
      "Kaltenborner Straße"
    );
    expect(find(wrapper, "location-suggestion").exists()).toBe(false);
  });

  it("suggests nothing when the reverse search answers after a new input (user story 26)", async () => {
    let answer;
    ApiGeoService.reverse.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    const wrapper = mountInput({ value: STORED_GASSTRASSE });
    map(wrapper).vm.$emit("point-set", HALL);
    await settle();

    await type(wrapper, "location-houseNumber", "5");
    answer(
      hit({
        street: "Kaltenborner Straße",
        house_number: "70",
        city: "Guben",
        ...HALL,
      })
    );
    await settle();

    expect(find(wrapper, "location-suggestion").exists()).toBe(false);
  });

  it("keeps the address when the suggestion is declined", async () => {
    ApiGeoService.reverse.mockResolvedValue(
      hit({ street: "Kaltenborner Straße", city: "Guben", ...HALL })
    );
    const wrapper = mountInput({ value: STORED_GASSTRASSE });
    map(wrapper).vm.$emit("point-set", HALL);
    await settle();

    await find(wrapper, "location-suggestion-dismiss").trigger("click");

    expect(find(wrapper, "location-suggestion").exists()).toBe(false);
    expect(find(wrapper, "location-street").find("input").element.value).toBe(
      "Gasstraße"
    );
  });

  it("asks whether a point set by hand follows a changed address, with distance and a pale second pin", async () => {
    const byHand = {
      ...STORED_GASSTRASSE,
      coordinates: { type: "Point", points: [HALL.lon, HALL.lat] },
      meta: { source: "manual", additional: null },
    };
    ApiGeoService.search.mockResolvedValue([GASSTRASSE]);
    const wrapper = mountInput({ value: byHand });

    await type(wrapper, "location-houseNumber", "4a");
    await find(wrapper, "location-houseNumber").find("input").trigger("blur");
    await settle();

    expect(find(wrapper, "location-suggestion").text()).toMatch(
      /Die Anschrift liegt \d+ m vom Punkt\. Punkt zur Anschrift verschieben\?/
    );
    expect(map(wrapper).props("suggestedPoint")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });

    await find(wrapper, "location-suggestion-accept").trigger("click");
    expect(map(wrapper).props("point")).toEqual({
      lat: 51.950438,
      lon: 14.714485,
    });
  });

  it("runs the reverse search again after the location was read anew, as after a save", async () => {
    ApiGeoService.reverse.mockResolvedValue(null);
    const wrapper = mountInput({ value: STORED_GASSTRASSE });
    map(wrapper).vm.$emit("point-set", HALL);
    await settle();
    const saved = lastInput(wrapper);
    await wrapper.setProps({ value: { ...saved }, stored: saved });

    map(wrapper).vm.$emit("point-set", { lat: 51.951, lon: 14.716 });
    await settle();

    expect(ApiGeoService.reverse).toHaveBeenCalledTimes(2);
  });

  it("tells once when the map is unavailable", async () => {
    const wrapper = mountInput();

    map(wrapper).vm.$emit("tiles-unavailable");
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "location-map-unavailable").text()).toBe(
      "Karte gerade nicht erreichbar"
    );
  });

  it("sets a point from outside, from NUKI, and suggests the address", async () => {
    ApiGeoService.reverse.mockResolvedValue(GASSTRASSE);
    const wrapper = mountInput();

    wrapper.vm.setPoint({ lat: 51.950438, lon: 14.714485 });
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
    expect(find(wrapper, "location-suggestion").text()).toContain(
      "Gasstraße 4, 03172 Guben"
    );
    expect(wrapper.text()).toContain("Punkt von NUKI");
  });
});

describe("LocationInput - a place the search does not know", () => {
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

  it("offers to set the point on the map, puts the text in the addition and waits for the point", async () => {
    const wrapper = mountInput();
    await search(wrapper, "Neißewiese");

    const withoutHit = find(wrapper, "location-without-hit");
    expect(withoutHit.text()).toContain("„Neißewiese“ auf der Karte setzen");
    await withoutHit.trigger("click");

    expect(find(wrapper, "location-addition").find("input").element.value).toBe(
      "Neißewiese"
    );
    expect(find(wrapper, "location-placing").text()).toContain(
      "Klicke in die Karte, wo „Neißewiese“ liegt."
    );

    map(wrapper).vm.$emit("point-set", { lat: 51.953, lon: 14.7198 });
    await settle();

    expect(find(wrapper, "location-placing").exists()).toBe(false);
    expect(lastInput(wrapper).meta).toEqual({
      source: "manual",
      additional: "Neißewiese",
    });
  });

  it("names the place after hits as „Nicht dabei?“", async () => {
    ApiGeoService.search.mockResolvedValue([GASSTRASSE]);
    const wrapper = mountInput();

    await search(wrapper, "Gasstraße");

    expect(find(wrapper, "location-without-hit").text()).toContain(
      "Nicht dabei? „Gasstraße“ auf der Karte setzen"
    );
  });

  it("goes back to the search when cancelled", async () => {
    const wrapper = mountInput();
    await search(wrapper, "Neißewiese");
    await find(wrapper, "location-without-hit").trigger("click");

    await find(wrapper, "location-placing-cancel").trigger("click");
    await settle();

    expect(find(wrapper, "location-placing").exists()).toBe(false);
    expect(find(wrapper, "location-search").find("input").element.value).toBe(
      "Neißewiese"
    );
    expect(find(wrapper, "location-addition").find("input").element.value).toBe(
      ""
    );
  });
});

describe("LocationInput - whether it may be saved", () => {
  const OLD_TEXT = "Sportplatz Kaltenborner Straße, Guben";
  const lastCheck = (wrapper) => wrapper.emitted("check").slice(-1)[0][0];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    ApiGeoService.start.mockResolvedValue({ lat: 51.95, lon: 14.71, zoom: 12 });
    ApiGeoService.search.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports an address without point as not to be saved, with the reason", async () => {
    const wrapper = mountInput();

    await type(wrapper, "location-street", "Gasstraße");

    expect(lastCheck(wrapper)).toEqual({
      storable: false,
      reason: "addressWithoutPoint",
      pointMissing: false,
    });
    expect(lastInput(wrapper).address.street).toBe("Gasstraße");
  });

  // User story 40: „Punkt fehlt“ marks old data still to be completed; a
  // new or changed location without point shows the reason instead.
  it.each([
    ["a new location", null],
    ["an old one once changed", "Sportplatz Kaltenborner Straße, Guben"],
  ])("shows no „Punkt fehlt“ at %s without point", async (_, value) => {
    const wrapper = mountInput({ value });

    await type(wrapper, "location-street", "Gasstraße");

    expect(find(wrapper, "location-point-missing").exists()).toBe(false);
    expect(lastCheck(wrapper).storable).toBe(false);
  });

  it("reports an empty location as fine from the start", () => {
    const wrapper = mountInput();

    expect(wrapper.emitted("check")).toEqual([
      [{ storable: true, reason: null, pointMissing: false }],
    ]);
  });

  it("shows the reason at the input once a surrounding form validates", async () => {
    const wrapper = mountInput();
    await type(wrapper, "location-street", "Gasstraße");

    wrapper.findComponent({ name: "v-input" }).vm.validate(true);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(
      "Anschrift ohne Punkt. Setze den Punkt auf der Karte."
    );
  });

  it("marks an old location without point, lets it be saved untouched and hands nothing out", async () => {
    const wrapper = mountInput({ value: OLD_TEXT });
    await settle();

    expect(find(wrapper, "location-point-missing").text()).toContain(
      "Punkt fehlt."
    );
    expect(find(wrapper, "location-search").find("input").element.value).toBe(
      OLD_TEXT
    );
    expect(lastCheck(wrapper).storable).toBe(true);
    expect(wrapper.emitted("input")).toBeUndefined();
  });

  it("searches the old text with „Text suchen“", async () => {
    const wrapper = mountInput({ value: OLD_TEXT });

    await find(wrapper, "location-search-text").trigger("click");
    await settle();

    expect(ApiGeoService.search).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ q: OLD_TEXT })
    );
  });

  it("measures against the stored location it is given", async () => {
    const wrapper = mountInput({
      value: { display_address: OLD_TEXT, meta: { additional: "Nord" } },
      stored: OLD_TEXT,
    });

    expect(lastCheck(wrapper)).toEqual({
      storable: false,
      reason: "oldTextWithoutPoint",
      pointMissing: false,
    });
  });

  it("hands the stored location back word for word once changed back", async () => {
    const wrapper = mountInput({ value: OLD_TEXT });

    await type(wrapper, "location-addition", "Nord");
    await type(wrapper, "location-addition", "");

    expect(lastInput(wrapper)).toBe(OLD_TEXT);
    expect(lastCheck(wrapper).storable).toBe(true);
  });
});
