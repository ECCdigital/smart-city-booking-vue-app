import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiEventService", () => ({
  default: {
    getEvent: vi.fn(),
    getEvents: vi.fn(),
    addEvent: vi.fn(),
    publicEventCountCheck: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiReviewService", () => ({
  default: { getReview: vi.fn() },
}));

import ApiEventService from "@/services/api/ApiEventService";
import eventsModule from "@/store/modules/events";
import EventEdit from "@/views/Bookables/Events/EventEdit.vue";

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

// What the simple page needs to save: one day, on site, no registration.
const FILLED = {
  information: {
    name: "Konzert",
    startDate: "2026-11-01",
    startTime: "18:00",
    endDate: "2026-11-01",
    endTime: "20:00",
  },
  eventLocation: { name: "Stadthalle", emailAddress: "info@example.org" },
  eventOrganizer: { name: "Stadt Guben" },
};

const stub = (name) => ({
  name,
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } }, [
      this.$slots.default,
    ]);
  },
});

const STUBS = Object.fromEntries(
  [
    "AdminLayout",
    "SaveBar",
    "UnsavedChangesDialog",
    "EditorNav",
    "EventFlow",
    "EventEditOverview",
    "EventEditBasics",
    "EventEditDate",
    "EventEditPlace",
    "EventEditPeople",
    "EventEditParticipation",
    "EventEditProgram",
    "EventEditMedia",
    "EventEditTickets",
    "EventEditPublication",
  ].map((name) => [name, stub(name)])
);

async function mountSimple(query = {}) {
  const store = new Vuex.Store({
    modules: {
      events: { ...eventsModule, state: eventsModule.state },
      tenants: {
        namespaced: true,
        getters: {
          currentTenantId: () => "t-1",
          currentSupervisionLevel: () => null,
        },
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
  const router = {
    push: vi.fn().mockResolvedValue(),
    replace: vi.fn().mockResolvedValue(),
    beforeEach: () => () => {},
  };
  const wrapper = mountComponent(EventEdit, {
    store,
    stubs: STUBS,
    mocks: {
      $route: { query, meta: { simpleEvent: true } },
      $router: router,
    },
  });
  await flushPromises();
  return { wrapper, store, router };
}

async function fill(store, location) {
  for (const [parent, fields] of Object.entries(FILLED)) {
    for (const [field, value] of Object.entries(fields)) {
      await store.dispatch("events/updateForm", { parent, field, value });
    }
  }
  await store.dispatch("events/updateForm", {
    field: "location",
    value: location,
  });
}

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

beforeEach(() => {
  vi.clearAllMocks();
  ApiEventService.addEvent.mockResolvedValue({});
  ApiEventService.publicEventCountCheck.mockResolvedValue(true);
});

describe("EventEdit: the simple page", () => {
  it("shows the main cards one below the other, without tabs or flow", async () => {
    const { wrapper } = await mountSimple();

    expect(find(wrapper, "event-simple-intro").exists()).toBe(true);
    const cards = find(wrapper, "event-simple")
      .findAll("[data-test^='stub-EventEdit']")
      .wrappers.map((card) => card.attributes("data-test"));
    expect(cards).toEqual([
      "stub-EventEditBasics",
      "stub-EventEditDate",
      "stub-EventEditPlace",
      "stub-EventEditPeople",
      "stub-EventEditParticipation",
      "stub-EventEditTickets",
      "stub-EventEditPublication",
    ]);
    expect(find(wrapper, "stub-EditorNav").exists()).toBe(false);
    expect(find(wrapper, "stub-EventFlow").exists()).toBe(false);
    expect(wrapper.vm.pageTitle).toBe("Veranstaltung einfach erstellen");
  });

  it("ends with „Sichtbarkeit“ and its switch", async () => {
    const { wrapper } = await mountSimple();

    const card = wrapper.find("#event-section-visibility");
    expect(card.text()).toContain("Sichtbarkeit");
    expect(card.find("[data-test='stub-EventEditPublication']").exists()).toBe(
      true
    );
  });

  it("stays simple once the event is saved for a ticket", async () => {
    ApiEventService.getEvent.mockResolvedValue({
      data: { id: "e-1", information: { name: "Konzert" } },
    });
    const { wrapper } = await mountSimple({ id: "e-1" });

    expect(find(wrapper, "event-simple").exists()).toBe(true);
    expect(find(wrapper, "stub-EventFlow").exists()).toBe(false);
  });

  it("saves a complete event and returns to the event list", async () => {
    const { wrapper, store, router } = await mountSimple();
    await fill(store, ADDRESS_WITH_POINT);

    await wrapper.vm.save();

    expect(ApiEventService.addEvent).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({ name: "events" });
  });

  it("refuses a save while a required field is missing", async () => {
    const { wrapper } = await mountSimple();

    expect(await wrapper.vm.save()).toBe(false);
    expect(ApiEventService.addEvent).not.toHaveBeenCalled();
  });

  it("marks no missing field before it was left or a save was tried", async () => {
    const { wrapper } = await mountSimple();
    const shown = () => wrapper.vm.issueState.list.map((issue) => issue.field);

    expect(wrapper.vm.issues.length).toBeGreaterThan(1);
    expect(shown()).toEqual([]);

    const field = document.createElement("div");
    field.dataset.field = "name";
    const input = document.createElement("input");
    field.appendChild(input);
    wrapper.vm.touch({ target: input });
    await wrapper.vm.$nextTick();
    expect(shown()).toEqual(["name"]);

    await wrapper.vm.save();
    await wrapper.vm.$nextTick();
    expect(shown()).toEqual(wrapper.vm.issues.map((issue) => issue.field));
  });

  it("refuses a location the backend would refuse", async () => {
    const { wrapper, store } = await mountSimple();
    await fill(store, ADDRESS_WITHOUT_POINT);

    expect(wrapper.vm.issues.map((issue) => issue.field)).toEqual(["location"]);
    await wrapper.vm.save();
    expect(ApiEventService.addEvent).not.toHaveBeenCalled();
  });
});
