import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));

import ApiBookablesService from "@/services/api/ApiBookablesService";
import eventsModule from "@/store/modules/events";
import EventLocation from "@/views/Bookables/Events/Form/EventLocation.vue";

const OLD_TEXT = "Sportplatz Kaltenborner Straße, Guben";

const STUBS = {
  LocationInput: {
    name: "LocationInput",
    props: {
      value: { type: [Object, String], default: null },
      stored: { type: [Object, String], default: undefined },
    },
    render(h) {
      return h("div", { attrs: { "data-test": "stub-LocationInput" } });
    },
  },
  Pager: { name: "Pager", render: (h) => h("div") },
};

function createStore() {
  return new Vuex.Store({
    modules: {
      events: {
        ...eventsModule,
        state: () => JSON.parse(JSON.stringify(eventsModule.state)),
      },
    },
  });
}

async function mountLocation({ event } = {}) {
  const store = createStore();
  if (event) await store.dispatch("events/restoreFromApi", event);
  const wrapper = mountComponent(EventLocation, { store, stubs: STUBS });
  await flushPromises();
  return { wrapper, store };
}

const locationInput = (wrapper) =>
  wrapper.findComponent({ name: "LocationInput" });

beforeEach(() => {
  vi.clearAllMocks();
  ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
});

describe("EventLocation - location", () => {
  it("edits the event's location with the location input, measured against the stored one", async () => {
    const { wrapper } = await mountLocation({
      event: { id: "e-1", eventLocation: {}, location: OLD_TEXT },
    });

    expect(locationInput(wrapper).props("value")).toBe(OLD_TEXT);
    expect(locationInput(wrapper).props("stored")).toBe(OLD_TEXT);
    const headings = wrapper.findAll("h4").wrappers.map((h) => h.text());
    expect(headings).toContain("Standort");
    expect(headings).not.toContain("Adresse");
  });

  it("measures a new event's location against none", async () => {
    const { wrapper } = await mountLocation();

    expect(locationInput(wrapper).props("stored")).toBeNull();
  });

  it("writes the location as the input hands it out into the store", async () => {
    const { wrapper, store } = await mountLocation();
    const location = {
      address: { city: "Guben", country_code: "DE" },
      display_address: "Guben",
      coordinates: { type: "Point", points: [14.71, 51.95] },
      meta: { source: "manual", additional: null },
    };

    locationInput(wrapper).vm.$emit("input", location);

    expect(store.state.events.form.location).toEqual(location);
  });
});
