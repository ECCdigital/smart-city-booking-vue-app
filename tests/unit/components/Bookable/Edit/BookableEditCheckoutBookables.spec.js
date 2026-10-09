import { beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";
import { button } from "@tests/unit/support/vuetify";
import Bookable from "@/entities/bookable";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));

import BookableEditCheckoutBookables from "@/components/Bookable/Edit/BookableEditCheckoutBookables.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";

const OTHERS = [
  { id: "b1", title: "Saal", type: "room" },
  { id: "b2", title: "Beamer", type: "resource" },
  { id: "b3", title: "Bestuhlung", type: "resource" },
];

const bookable = (checkoutBookableIds = []) =>
  new Bookable({
    id: "b1",
    tenantId: "t1",
    title: "Saal",
    checkoutBookableIds,
  }).toPlain();

const BEAMER = { bookableId: "b2", mandatory: false };

async function mountArea(checkoutBookableIds) {
  const mounted = mountEditing(BookableEditCheckoutBookables, {
    bookable: bookable(checkoutBookableIds),
  });
  await flushPromises();
  return mounted;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

/** The titles the picker offers, as the opened menu lists them. */
async function openPicker(wrapper) {
  await wrapper
    .findComponent({ name: "v-autocomplete" })
    .find(".v-input__slot")
    .trigger("click");
  await Vue.nextTick();
  return Array.from(
    document.querySelectorAll(".menuable__content__active .v-list-item")
  );
}

describe("BookableEditCheckoutBookables (Zusatzobjekte)", () => {
  beforeEach(() => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: OTHERS });
  });

  it("changes nothing when it mounts", async () => {
    const { patches, bookable: handed, stored } = await mountArea([BEAMER]);

    expect(patches).toEqual([]);
    expect(handed).toEqual(stored);
  });

  it("lists the Zusatzobjekte by title", async () => {
    const { wrapper } = await mountArea([BEAMER]);

    expect(wrapper.text()).toContain("Beamer");
    expect(wrapper.text()).toContain(
      "Buchungsobjekte, die Sie als Zusatzobjekte festlegen"
    );
  });

  it("makes one mandatory with only the list as the patch", async () => {
    const {
      wrapper,
      patches,
      bookable: handed,
      stored,
    } = await mountArea([BEAMER]);

    await find(wrapper, "checkout-mandatory").find("input").trigger("click");

    expect(lastPatch(patches)).toEqual({
      checkoutBookableIds: [{ bookableId: "b2", mandatory: true }],
    });
    expect(handed).toEqual(stored);
  });

  it("removes one", async () => {
    const { wrapper, patches } = await mountArea([BEAMER]);

    await find(wrapper, "checkout-remove").trigger("click");

    expect(lastPatch(patches)).toEqual({ checkoutBookableIds: [] });
  });

  it("adds one the picker offers, neither itself nor one it has", async () => {
    const { wrapper, patches } = await mountArea([BEAMER]);

    const offered = await openPicker(wrapper);
    expect(offered.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Bestuhlung"),
    ]);
    offered[0].click();
    await Vue.nextTick();
    await button(wrapper, "Hinzufügen").trigger("click");

    expect(lastPatch(patches)).toEqual({
      checkoutBookableIds: [BEAMER, { bookableId: "b3", mandatory: false }],
    });
  });

  it("names a denied bookable list beside the picker", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    const { wrapper } = await mountArea([]);

    expect(wrapper.text()).toContain(
      "Keine Auswahl möglich – Sie haben keinen Zugriff auf Buchungsobjekte."
    );
  });
});
