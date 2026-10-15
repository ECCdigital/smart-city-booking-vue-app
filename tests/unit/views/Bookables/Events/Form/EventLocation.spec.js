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

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

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
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
}

async function mountStep({ format = 0, url = "", id = null } = {}) {
  const store = createStore();
  const update = (payload) => store.dispatch("events/updateForm", payload);
  // Name and mail are required on this step too; filled, only the link
  // decides whether „Weiter“ is open.
  await update({ parent: "eventLocation", field: "name", value: "Rathaus" });
  await update({
    parent: "eventLocation",
    field: "emailAddress",
    value: "info@example.org",
  });
  await update({ parent: "eventLocation", field: "url", value: url });
  await update({ field: "format", value: format });
  await update({ field: "id", value: id });
  const wrapper = mountComponent(EventLocation, {
    store,
    stubs: { LocationInput: STUBS.LocationInput },
    mocks: {
      $router: {
        currentRoute: { name: "event-create-event-location" },
        getRoutes: () => [],
        push: vi.fn(),
      },
    },
  });
  await flushPromises();
  return { wrapper, store };
}

async function mountLocation({ event } = {}) {
  const store = createStore();
  if (event) await store.dispatch("events/restoreFromApi", event);
  const wrapper = mountComponent(EventLocation, { store, stubs: STUBS });
  await flushPromises();
  return { wrapper, store };
}

const nextButton = (wrapper) =>
  wrapper
    .findAll("button")
    .filter((b) => b.text() === "Weiter")
    .at(0);

async function settle(wrapper) {
  await wrapper.vm.$refs.observer.validate({ silent: true });
  await flushPromises();
}

const locationInput = (wrapper) =>
  wrapper.findComponent({ name: "LocationInput" });

beforeEach(() => {
  vi.clearAllMocks();
  ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
});

describe("EventLocation", () => {
  it("asks a presence event for no link", async () => {
    const { wrapper } = await mountStep({ format: 0 });
    await settle(wrapper);

    expect(find(wrapper, "event-url").exists()).toBe(false);
    expect(nextButton(wrapper).attributes("disabled")).toBeUndefined();
  });

  it.each([
    ["Hybrid", 1],
    ["Online", 2],
  ])("makes the link required for %s", async (_name, format) => {
    const { wrapper } = await mountStep({ format });
    await settle(wrapper);

    expect(find(wrapper, "event-url").exists()).toBe(true);
    expect(wrapper.text()).toContain("Veranstaltungslink zur Teilnahme*");
    expect(nextButton(wrapper).attributes("disabled")).toBe("disabled");

    await find(wrapper, "event-url").setValue("");
    await find(wrapper, "event-url").trigger("blur");
    await settle(wrapper);
    expect(wrapper.text()).toContain(
      "Veranstaltungslink zur Teilnahme* muss ausgefüllt sein."
    );
  });

  it.each(["http://meet.example/abc", "meet.example/abc"])(
    "refuses %s with a hint at the field",
    async (url) => {
      const { wrapper } = await mountStep({ format: 1 });

      await find(wrapper, "event-url").setValue(url);
      await find(wrapper, "event-url").trigger("blur");
      await settle(wrapper);

      expect(wrapper.text()).toContain(
        "Der Link muss eine gültige https-Adresse sein."
      );
      expect(nextButton(wrapper).attributes("disabled")).toBe("disabled");
    }
  );

  it("opens the step for a valid https link", async () => {
    const { wrapper, store } = await mountStep({ format: 2 });

    await find(wrapper, "event-url").setValue("https://meet.example/abc");
    await settle(wrapper);

    expect(store.state.events.form.eventLocation.url).toBe(
      "https://meet.example/abc"
    );
    expect(nextButton(wrapper).attributes("disabled")).toBeUndefined();
  });

  it("names the missing link of an existing event at once", async () => {
    const { wrapper } = await mountStep({ format: 1, id: "e-1" });
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Veranstaltungslink zur Teilnahme* muss ausgefüllt sein."
    );
  });
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

describe("EventLocation - participation link and location together", () => {
  it("asks a hybrid event for the link and its location on the same step", async () => {
    const { wrapper } = await mountStep({ format: 1 });

    expect(find(wrapper, "event-url").exists()).toBe(true);
    expect(locationInput(wrapper).exists()).toBe(true);
  });
});
