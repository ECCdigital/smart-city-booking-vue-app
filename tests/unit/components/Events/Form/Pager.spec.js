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

async function mountLastStep({ format, url, location } = {}) {
  const store = new Vuex.Store({
    modules: {
      events: {
        ...eventsModule,
        state: eventsModule.state,
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
  if (format !== undefined) {
    await store.dispatch("events/updateForm", {
      field: "format",
      value: format,
    });
  }
  if (url !== undefined) {
    await store.dispatch("events/updateForm", {
      parent: "eventLocation",
      field: "url",
      value: url,
    });
  }
  if (location !== undefined) {
    await store.dispatch("events/updateForm", {
      field: "location",
      value: location,
    });
  }
  const wrapper = mountComponent(Pager, {
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
  await flushPromises();
  return wrapper;
}

const submit = (wrapper) => wrapper.find("[data-test='event-submit']");

beforeEach(() => {
  vi.clearAllMocks();
  ApiEventService.addEvent.mockResolvedValue({});
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

describe("Pager - location", () => {
  it("locks „Absenden“ of a new event while its location may not be saved, and says why", async () => {
    const wrapper = await mountLastStep({ location: ADDRESS_WITHOUT_POINT });

    expect(submit(wrapper).attributes("disabled")).toBe("disabled");
    expect(wrapper.find("[data-test='location-refusal']").text()).toBe(
      "Anschrift ohne Punkt. Setze den Punkt auf der Karte."
    );
  });

  it.each([
    ["removed", null],
    ["untouched", undefined],
  ])("sends a new event whose location is %s", async (_, location) => {
    const wrapper = await mountLastStep({ location });

    expect(submit(wrapper).attributes("disabled")).toBeUndefined();
    await submit(wrapper).trigger("click");
    await flushPromises();

    expect(ApiEventService.addEvent).toHaveBeenCalled();
  });
});

describe("Pager - participation link and location together", () => {
  it("locks „Absenden“ of a hybrid event with a valid link while its location may not be saved", async () => {
    const wrapper = await mountLastStep({
      format: 1,
      url: "https://meet.example/abc",
      location: ADDRESS_WITHOUT_POINT,
    });

    expect(submit(wrapper).attributes("disabled")).toBe("disabled");
    expect(wrapper.find("[data-test='location-refusal']").exists()).toBe(true);
  });

  it("locks „Absenden“ of a hybrid event without a link even when its location may be saved", async () => {
    const wrapper = await mountLastStep({ format: 1, url: "", location: null });

    expect(submit(wrapper).attributes("disabled")).toBe("disabled");
    expect(wrapper.find("[data-test='location-refusal']").exists()).toBe(false);
  });
});
