import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getTags: vi.fn(), addEvent: vi.fn() },
}));

import ApiEventService from "@/services/api/ApiEventService";
import eventsModule from "@/store/modules/events";
import SimpleEventCreator from "@/views/Bookables/Events/SimpleEventCreator.vue";

const ADDRESS_WITHOUT_POINT = {
  address: {
    street: "Gasstraße",
    house_number: "4",
    postcode: "03172",
    city: "Guben",
    country_code: "DE",
  },
  display_address: "Gasstraße 4, 03172 Guben",
  meta: { source: "manual", additional: null },
};
const ADDRESS_WITH_POINT = {
  ...ADDRESS_WITHOUT_POINT,
  coordinates: { type: "Point", points: [14.7213, 51.9526] },
};

const stub = (name, props = {}) => ({
  name,
  props: { value: null, ...props },
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } });
  },
});

const STUBS = {
  StandortEingabe: stub("StandortEingabe", {
    value: { type: [Object, String], default: null },
    gespeichert: { type: [Object, String], default: undefined },
  }),
  MediaReferenceField: stub("MediaReferenceField"),
  Tiptap: stub("Tiptap"),
};

const FILLED = {
  information: {
    name: "Konzert",
    startDate: "2026-11-01",
    startTime: "18:00",
    endDate: "2026-11-01",
    endTime: "20:00",
  },
  eventLocation: { name: "Stadthalle" },
  eventOrganizer: {
    name: "Stadt Guben",
    contactPersonName: "Erika Muster",
    contactPersonPhoneNumber: "03561 1234",
    contactPersonEmailAddress: "erika@example.org",
  },
};

async function mountCreator(location) {
  const store = new Vuex.Store({
    modules: {
      events: {
        ...eventsModule,
        state: () => JSON.parse(JSON.stringify(eventsModule.state)),
      },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t-1" },
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
  for (const [parent, fields] of Object.entries(FILLED)) {
    for (const [field, value] of Object.entries(fields)) {
      await store.dispatch("events/updateForm", { parent, field, value });
    }
  }
  if (location !== undefined) {
    await store.dispatch("events/updateForm", {
      field: "location",
      value: location,
    });
  }
  const wrapper = mountComponent(SimpleEventCreator, {
    store,
    stubs: STUBS,
    mocks: { $router: { push: vi.fn() } },
  });
  await flushPromises();
  return { wrapper, store };
}

const submit = (wrapper) =>
  wrapper
    .findAll("button")
    .filter((b) => b.text() === "Absenden")
    .at(0);
const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

beforeEach(() => {
  vi.clearAllMocks();
  ApiEventService.getTags.mockResolvedValue({ data: [] });
  ApiEventService.addEvent.mockResolvedValue({});
});

describe("SimpleEventCreator - Standort", () => {
  it("edits the Standort with the input of a Standort, measured against none", async () => {
    const { wrapper } = await mountCreator(ADDRESS_WITH_POINT);
    const standort = wrapper.findComponent({ name: "StandortEingabe" });

    expect(standort.props("value")).toEqual(ADDRESS_WITH_POINT);
    expect(standort.props("gespeichert")).toBeNull();
    const headings = wrapper.findAll("h4").wrappers.map((h) => h.text());
    expect(headings).not.toContain("Adresse");
  });

  it("writes the Standort as the input hands it out into the store", async () => {
    const { wrapper, store } = await mountCreator();

    wrapper
      .findComponent({ name: "StandortEingabe" })
      .vm.$emit("input", ADDRESS_WITH_POINT);

    expect(store.state.events.form.location).toEqual(ADDRESS_WITH_POINT);
  });

  it("starts a new event with an empty Standort that names the postcode „postcode“", async () => {
    const { store } = await mountCreator();

    expect(store.state.events.form.location.address).toHaveProperty(
      "postcode",
      null
    );
    expect(store.state.events.form.location.address).not.toHaveProperty(
      "post_code"
    );
  });

  it("sends a Standort with Anschrift and Punkt", async () => {
    const { wrapper } = await mountCreator(ADDRESS_WITH_POINT);

    expect(submit(wrapper).attributes("disabled")).toBeUndefined();
    expect(find(wrapper, "location-refusal").exists()).toBe(false);
    await submit(wrapper).trigger("click");
    await flushPromises();

    expect(ApiEventService.addEvent).toHaveBeenCalled();
  });

  it("locks „Absenden“ while the Standort may not be saved, and says why", async () => {
    const { wrapper } = await mountCreator(ADDRESS_WITHOUT_POINT);

    expect(submit(wrapper).attributes("disabled")).toBe("disabled");
    expect(find(wrapper, "location-refusal").text()).toBe(
      "Anschrift ohne Punkt. Setze den Punkt auf der Karte."
    );
  });
});
