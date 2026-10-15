import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import Vuex from "vuex";
import lodash from "lodash";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiEventService", () => ({
  default: {
    getEvent: vi.fn(),
    addEvent: vi.fn(),
    publicEventCountCheck: vi.fn(),
  },
}));

vi.mock("@/services/api/ApiReviewService", () => ({
  default: { submit: vi.fn(), decide: vi.fn(), getReview: vi.fn() },
}));

vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    reviewViewer: vi.fn(() => ({ tenantOwner: true, instanceOwner: false })),
  },
}));

vi.mock("@/layouts/Form.vue", () => ({
  default: {
    name: "FormLayout",
    render(h) {
      return h("div", [this.$slots.default, this.$slots.sidebar]);
    },
  },
}));

vi.mock("@/components/MultiStepper", () => ({
  default: { name: "MultiStepper", render: (h) => h("div") },
}));

import ApiEventService from "@/services/api/ApiEventService";
import ApiReviewService from "@/services/api/ApiReviewService";
import eventsModule from "@/store/modules/events";
import EventCreate from "@/views/Bookables/Events/EventCreate.vue";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

function storedEvent(overrides = {}) {
  return {
    id: "e-1",
    tenantId: "t-1",
    isPublic: false,
    information: {
      name: "Konzert",
      startDate: "2020-05-01",
      endDate: "2020-05-01",
    },
    eventOrganizer: { speakers: [] },
    attendees: { priceCategories: [] },
    schedules: [],
    review: { status: null },
    ...overrides,
  };
}

function createStore(supervisionLevel) {
  return new Vuex.Store({
    modules: {
      events: {
        ...eventsModule,
        state: () => JSON.parse(JSON.stringify(eventsModule.state)),
      },
      tenants: {
        namespaced: true,
        getters: {
          currentTenantId: () => "t-1",
          currentSupervisionLevel: () => supervisionLevel,
        },
      },
      loading: {
        namespaced: true,
        getters: { isLoading: () => false },
        actions: { start: () => {}, stop: () => {} },
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
}

async function mountEditor({
  event = storedEvent(),
  supervisionLevel = "supervised",
  routeName = "event-create-information",
} = {}) {
  if (event) {
    ApiEventService.getEvent.mockResolvedValue({ data: event });
  }
  const store = createStore(supervisionLevel);
  const wrapper = mountComponent(EventCreate, {
    store,
    stubs: { "router-view": true },
    mocks: {
      $route: { name: routeName, query: event ? { id: event.id } : {} },
      $router: { push: vi.fn() },
    },
  });
  await flushPromises();
  return { wrapper, store };
}

beforeAll(() => {
  global._ = lodash;
});

afterAll(() => {
  delete global._;
});

beforeEach(() => {
  vi.clearAllMocks();
  ApiEventService.publicEventCountCheck.mockResolvedValue(true);
  ApiEventService.addEvent.mockResolvedValue({});
});

describe("EventCreate", () => {
  it("docks the review of the event next to the publication wish", async () => {
    const { wrapper } = await mountEditor({
      event: storedEvent({ isPublic: true, review: { status: "pending" } }),
    });

    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
    expect(find(wrapper, "review-effect").text()).toContain(
      "weder gelistet noch per Direktlink buchbar"
    );
  });

  it("keeps the review out of the form that gets saved", async () => {
    const { store } = await mountEditor({
      event: storedEvent({ review: { status: "approved" } }),
    });

    expect(store.getters["events/form"]).not.toHaveProperty("review");
    expect(store.getters["events/form"].information.name).toBe("Konzert");
  });

  it("takes a submission into the display without losing unsaved edits", async () => {
    const pending = { status: "pending", submittedAt: "2026-09-21T08:30:00Z" };
    ApiReviewService.submit.mockResolvedValue(pending);
    const { wrapper, store } = await mountEditor();
    await store.dispatch("events/updateForm", {
      parent: "information",
      field: "name",
      value: "Unsaved name",
    });

    await find(wrapper, "review-action-submit").trigger("click");
    await flushPromises();

    expect(ApiReviewService.submit).toHaveBeenCalledWith("t-1", "event", "e-1");
    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
    expect(store.getters["events/form"].information.name).toBe("Unsaved name");
    expect(wrapper.text()).toContain("Änderungen übernehmen");
  });

  it("does not read a submission as an unsaved change", async () => {
    ApiReviewService.submit.mockResolvedValue({ status: "pending" });
    const { wrapper } = await mountEditor();

    await find(wrapper, "review-action-submit").trigger("click");
    await flushPromises();

    expect(wrapper.text()).not.toContain("Änderungen übernehmen");
  });

  it("keeps an event that is over reviewable", async () => {
    const { wrapper } = await mountEditor({
      event: storedEvent({ review: { status: null } }),
    });

    const submit = find(wrapper, "review-action-submit");
    expect(submit.exists()).toBe(true);
    expect(submit.attributes("disabled")).toBeUndefined();
  });

  it("shows the status the save left behind", async () => {
    const pending = { status: "pending", submittedAt: "2026-09-21T08:30:00Z" };
    ApiReviewService.getReview.mockResolvedValue(pending);
    const { wrapper, store } = await mountEditor();
    await store.dispatch("events/updateForm", {
      field: "isPublic",
      value: true,
    });
    await flushPromises();

    await wrapper.vm.submitForm();
    await flushPromises();

    expect(ApiReviewService.getReview).toHaveBeenCalledWith(
      "t-1",
      "event",
      "e-1"
    );
    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
  });

  it("offers a new event no review action", async () => {
    const { wrapper } = await mountEditor({ event: null });

    expect(find(wrapper, "review-panel").exists()).toBe(true);
    expect(wrapper.findAll("[data-test^='review-action-']").length).toBe(0);
  });

  // The backend assigns a new event's id and answers the create without a
  // body. The editor never has to show the review of a just-created event:
  // its only save is the pager's „Absenden“, which leaves for the event list.
  it("saves a new event through the pager only, never from the sidebar", async () => {
    const { wrapper, store } = await mountEditor({ event: null });

    await store.dispatch("events/updateForm", {
      field: "isPublic",
      value: true,
    });
    await flushPromises();

    expect(wrapper.text()).not.toContain("Änderungen übernehmen");
  });

  it("forgets the review of the last event when a new one is started", async () => {
    const first = await mountEditor({
      event: storedEvent({ review: { status: "approved" } }),
    });
    await first.store.dispatch("events/clearForm");

    expect(first.store.getters["events/review"]).toBe(null);
  });

  it.each([
    ["supervised", "braucht zusätzlich eine Freigabe durch den Betreiber"],
    [
      "pending",
      "wartet auf die Freigabe durch den Betreiber: Der Veröffentlichungswunsch wird vorgemerkt; bis dahin wird nichts öffentlich",
    ],
    ["declined", "abgewiesen: Der Veröffentlichungswunsch wird vorgemerkt"],
  ])(
    "says under %s that the publication wish alone does not publish",
    async (supervisionLevel, text) => {
      const { wrapper } = await mountEditor({ supervisionLevel });

      expect(find(wrapper, "publication-wish-hint").text()).toContain(text);
    }
  );

  describe("participation link", () => {
    // Any change brings up „Änderungen übernehmen“.
    async function edit(store, parent, field, value) {
      await store.dispatch("events/updateForm", { parent, field, value });
      await flushPromises();
    }
    const rename = (store) => edit(store, "information", "name", "Lesung");

    it.each([
      ["Hybrid", 1],
      ["Online", 2],
    ])(
      "holds back the save of a %s event without a link",
      async (_name, format) => {
        const { wrapper, store } = await mountEditor({
          event: storedEvent({ format, eventLocation: { url: "" } }),
        });
        await rename(store);

        expect(find(wrapper, "event-save").attributes("disabled")).toBe(
          "disabled"
        );
        expect(find(wrapper, "participation-link-hint").text()).toContain(
          "gültigen https-Link zur Teilnahme"
        );
      }
    );

    it("holds back the save of an event with an http link", async () => {
      const { wrapper, store } = await mountEditor({
        event: storedEvent({
          format: 1,
          eventLocation: { url: "http://meet.example/abc" },
        }),
      });
      await rename(store);

      expect(find(wrapper, "event-save").attributes("disabled")).toBe(
        "disabled"
      );
    });

    it("saves once a valid link is entered", async () => {
      const { wrapper, store } = await mountEditor({
        event: storedEvent({ format: 2, eventLocation: { url: "" } }),
      });
      await edit(store, "eventLocation", "url", "https://meet.example/abc");

      expect(find(wrapper, "participation-link-hint").exists()).toBe(false);
      await find(wrapper, "event-save").trigger("click");
      await flushPromises();

      expect(ApiEventService.addEvent).toHaveBeenCalled();
    });

    it("saves a presence event without a link", async () => {
      const { wrapper, store } = await mountEditor({
        event: storedEvent({ format: 0, eventLocation: { url: "" } }),
      });
      await rename(store);

      expect(
        find(wrapper, "event-save").attributes("disabled")
      ).toBeUndefined();
      expect(find(wrapper, "participation-link-hint").exists()).toBe(false);
    });
  });

  it("keeps a free tenant free of supervision texts", async () => {
    const { wrapper } = await mountEditor({ supervisionLevel: "free" });

    expect(find(wrapper, "publication-wish-hint").exists()).toBe(false);
    expect(find(wrapper, "review-panel").exists()).toBe(false);
  });
});

describe("EventCreate - location", () => {
  const OLD_TEXT = "Sportplatz Kaltenborner Straße, Guben";
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
  const save = (wrapper) =>
    wrapper
      .findAll("button")
      .filter((b) => b.text() === "Änderungen übernehmen")
      .at(0);

  it("locks „Änderungen übernehmen“ while the location may not be saved, and says why", async () => {
    const { wrapper, store } = await mountEditor();

    await store.dispatch("events/updateForm", {
      field: "location",
      value: ADDRESS_WITHOUT_POINT,
    });
    await flushPromises();

    expect(save(wrapper).attributes("disabled")).toBe("disabled");
    expect(find(wrapper, "location-refusal").text()).toBe(
      "Anschrift ohne Punkt. Setze den Punkt auf der Karte."
    );
  });

  it("saves an event with an old location without point, sending it back word for word", async () => {
    let sent;
    ApiEventService.addEvent.mockImplementation(() => {
      sent = store.state.events.form.location;
      return Promise.resolve({});
    });
    const { wrapper, store } = await mountEditor({
      event: storedEvent({ location: OLD_TEXT }),
    });

    await store.dispatch("events/updateForm", {
      parent: "information",
      field: "name",
      value: "Neuer Name",
    });
    await flushPromises();

    expect(save(wrapper).attributes("disabled")).toBeUndefined();
    expect(find(wrapper, "location-refusal").exists()).toBe(false);
    await save(wrapper).trigger("click");
    await flushPromises();

    expect(ApiEventService.addEvent).toHaveBeenCalled();
    expect(sent).toBe(OLD_TEXT);
  });

  it("measures the location against the saved one after a save", async () => {
    const { wrapper, store } = await mountEditor({
      event: storedEvent({ location: OLD_TEXT }),
    });
    await store.dispatch("events/updateForm", {
      field: "location",
      value: {
        ...ADDRESS_WITHOUT_POINT,
        coordinates: { type: "Point", points: [14.7213, 51.9526] },
      },
    });
    await flushPromises();
    await save(wrapper).trigger("click");
    await flushPromises();

    await store.dispatch("events/updateForm", {
      field: "location",
      value: OLD_TEXT,
    });
    await flushPromises();

    expect(save(wrapper).attributes("disabled")).toBe("disabled");
    expect(find(wrapper, "location-refusal").text()).toBe(
      "Standort ohne Punkt. Suche den Text oder setze den Punkt auf der Karte."
    );
  });
});
