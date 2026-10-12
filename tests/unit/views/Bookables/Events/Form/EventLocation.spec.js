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
  StandortEingabe: {
    name: "StandortEingabe",
    props: {
      value: { type: [Object, String], default: null },
      gespeichert: { type: [Object, String], default: undefined },
    },
    render(h) {
      return h("div", { attrs: { "data-test": "stub-StandortEingabe" } });
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

const standort = (wrapper) =>
  wrapper.findComponent({ name: "StandortEingabe" });

beforeEach(() => {
  vi.clearAllMocks();
  ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
});

describe("EventLocation - Standort", () => {
  it("edits the event's Standort with the input of a Standort, measured against the stored one", async () => {
    const { wrapper } = await mountLocation({
      event: { id: "e-1", eventLocation: {}, location: OLD_TEXT },
    });

    expect(standort(wrapper).props("value")).toBe(OLD_TEXT);
    expect(standort(wrapper).props("gespeichert")).toBe(OLD_TEXT);
    const headings = wrapper.findAll("h4").wrappers.map((h) => h.text());
    expect(headings).toContain("Standort");
    expect(headings).not.toContain("Adresse");
  });

  it("measures a new event's Standort against none", async () => {
    const { wrapper } = await mountLocation();

    expect(standort(wrapper).props("gespeichert")).toBeNull();
  });

  it("writes the Standort as the input hands it out into the store", async () => {
    const { wrapper, store } = await mountLocation();
    const location = {
      address: { city: "Guben", country_code: "DE" },
      display_address: "Guben",
      coordinates: { type: "Point", points: [14.71, 51.95] },
      meta: { source: "manual", additional: null },
    };

    standort(wrapper).vm.$emit("input", location);

    expect(store.state.events.form.location).toEqual(location);
  });
});
