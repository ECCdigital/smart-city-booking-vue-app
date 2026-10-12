import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));

vi.mock("@/components/commons/AddressLookup.vue", () => ({
  default: { name: "AddressLookup", render: (h) => h("div") },
}));

import ApiBookablesService from "@/services/api/ApiBookablesService";
import eventsModule from "@/store/modules/events";
import EventLocation from "@/views/Bookables/Events/Form/EventLocation.vue";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

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

const nextButton = (wrapper) =>
  wrapper
    .findAll("button")
    .filter((b) => b.text() === "Weiter")
    .at(0);

async function settle(wrapper) {
  await wrapper.vm.$refs.observer.validate({ silent: true });
  await flushPromises();
}

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
