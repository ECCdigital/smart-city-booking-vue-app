import { beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";
import { button } from "@tests/unit/support/vuetify";
import Bookable from "@/entities/bookable";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));

import BookableEditHierarchy from "@/components/Bookable/Edit/BookableEditHierarchy.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";

const OTHERS = [
  { id: "b1", title: "Halle", type: "room" },
  { id: "b2", title: "Hallenteil A", type: "room" },
  { id: "b3", title: "Hallenteil B", type: "room" },
  { id: "b4", title: "Hallenteil C", type: "room" },
];

const bookable = (relatedBookableIds = []) =>
  new Bookable({
    id: "b1",
    tenantId: "t1",
    title: "Halle",
    relatedBookableIds,
  }).toPlain();

async function mountArea(relatedBookableIds) {
  const mounted = mountEditing(BookableEditHierarchy, {
    bookable: bookable(relatedBookableIds),
  });
  await flushPromises();
  return mounted;
}

const titledButton = (wrapper, title) =>
  wrapper.find(`[title='${title}'] button`);

describe("BookableEditHierarchy (Hierarchie)", () => {
  beforeEach(() => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: OTHERS });
  });

  it("changes nothing when it mounts", async () => {
    const { patches, bookable: handed, stored } = await mountArea(["b2"]);

    expect(patches).toEqual([]);
    expect(handed).toEqual(stored);
  });

  it("explains parent and children and lists the children", async () => {
    const { wrapper } = await mountArea(["b2"]);

    expect(wrapper.text()).toContain("Wie funktioniert die Hierarchie?");
    expect(wrapper.text()).toContain("Hallenteil A");
  });

  it("moves a child down with only the list as the patch", async () => {
    const {
      wrapper,
      patches,
      bookable: handed,
      stored,
    } = await mountArea(["b2", "b3"]);

    await titledButton(wrapper, "Nach unten verschieben").trigger("click");

    expect(lastPatch(patches)).toEqual({ relatedBookableIds: ["b3", "b2"] });
    expect(handed).toEqual(stored);
  });

  it("removes a child", async () => {
    const { wrapper, patches } = await mountArea(["b2"]);

    await titledButton(wrapper, "Löschen").trigger("click");

    expect(lastPatch(patches)).toEqual({ relatedBookableIds: [] });
  });

  it("adds a child the picker offers, neither itself nor one it has", async () => {
    const { wrapper, patches } = await mountArea(["b2"]);

    await wrapper
      .findComponent({ name: "v-autocomplete" })
      .find(".v-input__slot")
      .trigger("click");
    await Vue.nextTick();
    const offered = Array.from(
      document.querySelectorAll(".menuable__content__active .v-list-item")
    );
    expect(offered.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Hallenteil B"),
      expect.stringContaining("Hallenteil C"),
    ]);
    offered[1].click();
    await Vue.nextTick();
    await button(wrapper, "Hinzufügen").trigger("click");

    expect(lastPatch(patches)).toEqual({ relatedBookableIds: ["b2", "b4"] });
  });

  it("names a denied bookable list beside the picker", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    const { wrapper } = await mountArea([]);

    expect(wrapper.text()).toContain(
      "Keine Auswahl möglich – Sie haben keinen Zugriff auf Buchungsobjekte."
    );
  });
});
