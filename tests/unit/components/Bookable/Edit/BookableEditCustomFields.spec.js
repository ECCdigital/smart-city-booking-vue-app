import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditCustomFields from "@/components/Bookable/Edit/BookableEditCustomFields.vue";

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
