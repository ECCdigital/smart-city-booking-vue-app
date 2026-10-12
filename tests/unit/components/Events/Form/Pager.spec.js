import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { addEvent: vi.fn() },
}));

import ApiEventService from "@/services/api/ApiEventService";
import eventsModule from "@/store/modules/events";
import Pager from "@/components/Events/Form/Pager.vue";

const ADDRESS_WITHOUT_POINT = {
  address: { city: "Guben", country_code: "DE" },
  display_address: "Guben",
  meta: { source: "manual", additional: null },
};

async function mountLastStep(location) {
  const store = new Vuex.Store({
    modules: {
      events: {
        ...eventsModule,
        state: () => JSON.parse(JSON.stringify(eventsModule.state)),
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
  if (location !== undefined) {
    await store.dispatch("events/updateForm", {
      field: "location",
      value: location,
    });
  }
  const wrapper = mountComponent(Pager, {
    store,
    mocks: {
      $router: {
        currentRoute: { name: "event-create-images" },
        push: vi.fn(),
      },
    },
  });
  await flushPromises();
  return wrapper;
}

const submit = (wrapper) =>
  wrapper
    .findAll("button")
    .filter((b) => b.text() === "Absenden")
    .at(0);

beforeEach(() => {
  vi.clearAllMocks();
  ApiEventService.addEvent.mockResolvedValue({});
});

describe("Pager - Standort", () => {
  it("locks „Absenden“ of a new event while its Standort may not be saved, and says why", async () => {
    const wrapper = await mountLastStep(ADDRESS_WITHOUT_POINT);

    expect(submit(wrapper).attributes("disabled")).toBe("disabled");
    expect(wrapper.find("[data-test='location-refusal']").text()).toBe(
      "Anschrift ohne Punkt. Setze den Punkt auf der Karte."
    );
  });

  it.each([
    ["removed", null],
    ["untouched", undefined],
  ])("sends a new event whose Standort is %s", async (_, location) => {
    const wrapper = await mountLastStep(location);

    expect(submit(wrapper).attributes("disabled")).toBeUndefined();
    await submit(wrapper).trigger("click");
    await flushPromises();

    expect(ApiEventService.addEvent).toHaveBeenCalled();
  });
});
