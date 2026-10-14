import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { addEvent: vi.fn() },
}));

import eventsModule from "@/store/modules/events";
import Pager from "@/components/Events/Form/Pager.vue";

async function mountLastStep({ format, url }) {
  const store = new Vuex.Store({
    modules: {
      events: {
        ...eventsModule,
        state: () => JSON.parse(JSON.stringify(eventsModule.state)),
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
  await store.dispatch("events/updateForm", { field: "format", value: format });
  await store.dispatch("events/updateForm", {
    parent: "eventLocation",
    field: "url",
    value: url,
  });
  return mountComponent(Pager, {
    store,
    propsData: { invalid: false },
    mocks: {
      $router: {
        currentRoute: { name: "event-create-images" },
        getRoutes: () => [],
        push: vi.fn(),
      },
    },
  });
}

const submit = (wrapper) => wrapper.find("[data-test='event-submit']");

beforeEach(() => {
  vi.clearAllMocks();
});

// An existing event reaches the last step through the stepper without
// passing „Veranstaltungsort“, so „Absenden“ checks the link itself.
describe("Pager", () => {
  it.each([
    ["Hybrid without a link", 1, ""],
    ["Online with an http link", 2, "http://meet.example/abc"],
  ])("does not send %s", async (_label, format, url) => {
    const wrapper = await mountLastStep({ format, url });

    expect(submit(wrapper).attributes("disabled")).toBe("disabled");
  });

  it.each([
    ["Präsenz without a link", 0, ""],
    ["Online with an https link", 2, "https://meet.example/abc"],
  ])("sends %s", async (_label, format, url) => {
    const wrapper = await mountLastStep({ format, url });

    expect(submit(wrapper).attributes("disabled")).toBeUndefined();
  });
});
