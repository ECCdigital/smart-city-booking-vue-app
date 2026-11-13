import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getTags: vi.fn(), getFlags: vi.fn() },
}));

import ApiEventService from "@/services/api/ApiEventService";
import eventsModule from "@/store/modules/events";
import Information from "@/views/Bookables/Events/Form/Information.vue";

const stub = (name) => ({
  name,
  props: { value: null },
  render: (h) => h("div"),
});

const STUBS = {
  MediaReferenceField: stub("MediaReferenceField"),
  Tiptap: stub("Tiptap"),
  Pager: stub("Pager"),
};

async function mountInformation({ flags = [] } = {}) {
  const store = new Vuex.Store({
    modules: {
      events: { ...eventsModule, state: eventsModule.state },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t-1" },
      },
    },
  });
  await store.dispatch("events/updateForm", {
    parent: "information",
    field: "flags",
    value: flags,
  });
  const wrapper = mountComponent(Information, { store, stubs: STUBS });
  await flushPromises();
  return { wrapper, store };
}

const comboboxOf = (wrapper, label) =>
  wrapper
    .findAllComponents({ name: "v-combobox" })
    .wrappers.find((field) => field.props("label") === label);

beforeEach(() => {
  vi.clearAllMocks();
  ApiEventService.getTags.mockResolvedValue({ data: [] });
  ApiEventService.getFlags.mockResolvedValue({ data: [] });
});

describe("Information - Flags of the event", () => {
  it("suggests the flags of the tenant's events, not only its own", async () => {
    ApiEventService.getFlags.mockResolvedValue({
      data: ["Kinder", "Draußen", "Barrierefrei"],
    });

    const { wrapper } = await mountInformation({ flags: ["Kinder"] });

    expect(ApiEventService.getFlags).toHaveBeenCalled();
    expect(comboboxOf(wrapper, "Flags").props("items")).toEqual([
      "Kinder",
      "Draußen",
      "Barrierefrei",
    ]);
  });

  it("drops a flag with the cross of its chip", async () => {
    const { wrapper, store } = await mountInformation({
      flags: ["Kinder", "Draußen"],
    });

    await comboboxOf(wrapper, "Flags")
      .findAll(".v-chip__close")
      .at(0)
      .trigger("click");

    expect(store.state.events.form.information.flags).toEqual(["Draußen"]);
  });
});
