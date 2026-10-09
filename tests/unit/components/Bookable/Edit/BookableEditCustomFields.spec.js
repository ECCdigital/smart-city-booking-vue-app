import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";
import Bookable from "@/entities/bookable";
import BookableEditCustomFields from "@/components/Bookable/Edit/BookableEditCustomFields.vue";
import CustomFieldList from "@/components/CustomFields/CustomFieldList.vue";

vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getBookableCustomFields: vi.fn().mockResolvedValue([]) },
}));

const store = () =>
  new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenant: () => ({ id: "t1" }) },
      },
    },
  });

const bookable = (customFieldDefinitions) =>
  new Bookable({
    tenantId: "t1",
    title: "Saal",
    customFieldDefinitions,
  }).toPlain();

const definitionsShown = (definitions, saved) =>
  mountEditing(BookableEditCustomFields, {
    bookable: bookable(definitions),
    saved: saved && bookable(saved),
    expertMode: false,
    store: store(),
    stubs: { CustomFieldList: true },
  })
    .wrapper.text()
    .includes("Felder definieren");

const DEFINITION = { id: "f1", label: "Anlass", type: "text" };

describe("BookableEditCustomFields - Felder definieren without expert mode", () => {
  it("offers them while the bookable defines fields", () => {
    expect(definitionsShown([DEFINITION])).toBe(true);
  });

  it("leaves them out while it defines none", () => {
    expect(definitionsShown([])).toBe(false);
  });

  it("keeps them while the stored bookable defines fields", () => {
    expect(definitionsShown([], [DEFINITION])).toBe(true);
  });
});

describe("BookableEditCustomFields (Eigene Felder) on bookableEditing", () => {
  const STAGE = {
    id: "f1",
    caption: "Bühne",
    inputType: "string",
    _origin: "tenant",
    usageOptions: { context: "catalog" },
  };

  const mountArea = async (overrides = {}) => {
    const mounted = mountEditing(BookableEditCustomFields, {
      bookable: new Bookable({
        tenantId: "t1",
        title: "Saal",
        customFields: [STAGE],
        customFieldValues: [],
        customFieldDefinitions: [],
        ...overrides,
      }).toPlain(),
      store: store(),
      stubs: { CustomFieldList: true },
    });
    await flushPromises();
    return mounted;
  };

  it("changes nothing when it mounts", async () => {
    const { patches, bookable, stored } = await mountArea({
      customFieldValues: [{ fieldId: "f1", value: "Groß" }],
    });

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("sets a value with only the values as the patch", async () => {
    const { wrapper, patches, bookable, stored } = await mountArea();

    await wrapper.find(".field-row input").setValue("Klein");

    expect(lastPatch(patches)).toEqual({
      customFieldValues: [{ fieldId: "f1", value: "Klein" }],
    });
    expect(bookable).toEqual(stored);
  });

  it("hands on changed definitions as their own patch", async () => {
    const { wrapper, patches } = await mountArea();
    const definition = { id: "f9", caption: "Anlass", inputType: "string" };

    await wrapper
      .findAll(".v-tab")
      .wrappers.find((tab) => tab.text().includes("Felder definieren"))
      .trigger("click");
    await flushPromises();
    wrapper
      .findComponent(CustomFieldList)
      .vm.$emit("update:fields", [definition]);

    expect(lastPatch(patches)).toEqual({
      customFieldDefinitions: [definition],
    });
  });
});
