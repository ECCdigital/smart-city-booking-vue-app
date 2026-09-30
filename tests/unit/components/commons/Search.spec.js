import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import Search from "@/components/commons/Search.vue";

const ROOMS = [
  { title: "Beta", timeCreated: 2 },
  { title: "Alpha", timeCreated: 3 },
  { title: "Gamma", timeCreated: 1 },
];

const SORT_OPTIONS = [
  { text: "Titel", value: "title" },
  { text: "Erstellt", value: "timeCreated" },
];

function mountSearch(propsData = {}, options = {}) {
  return mountComponent(Search, {
    propsData: {
      items: ROOMS,
      keys: ["title"],
      fields: "Titel",
      showFilters: false,
      sortable: true,
      sortOptions: SORT_OPTIONS,
      ...propsData,
    },
    ...options,
  });
}

/** The titles of the list the search last handed on, in order. */
function listed(wrapper) {
  const calls = wrapper.emitted("input");
  return calls[calls.length - 1][0].map((room) => room.title);
}

async function clickField(wrapper, label) {
  await wrapper
    .findAll("[data-test='sort-field']")
    .wrappers.find((field) => field.text().startsWith(label))
    .trigger("click");
}

/**
 * The bookable lists sort in the row beneath the search band: a field sorts
 * by it, clicked again it turns, the cross resets to the list's own order.
 * The direction stays when another field is picked, as it did with the
 * separate arrows before ECCdigital/tickets#57.
 */
describe("Search — sorting in the row beneath the band", () => {
  it("lists in the items' own order until a field is picked", () => {
    const wrapper = mountSearch();

    expect(listed(wrapper)).toEqual(["Beta", "Alpha", "Gamma"]);
  });

  it("sorts ascending by the field picked, descending once it is clicked again", async () => {
    const wrapper = mountSearch();

    await clickField(wrapper, "Titel");
    expect(listed(wrapper)).toEqual(["Alpha", "Beta", "Gamma"]);

    await clickField(wrapper, "Titel");
    expect(listed(wrapper)).toEqual(["Gamma", "Beta", "Alpha"]);
  });

  it("keeps the direction when another field is picked", async () => {
    const wrapper = mountSearch();
    await clickField(wrapper, "Titel");
    await clickField(wrapper, "Titel");

    await clickField(wrapper, "Erstellt");

    expect(listed(wrapper)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("goes back to the items' own order with the cross", async () => {
    const wrapper = mountSearch();
    await clickField(wrapper, "Titel");

    await wrapper.find("[data-test='sort-reset']").trigger("click");

    expect(listed(wrapper)).toEqual(["Beta", "Alpha", "Gamma"]);
  });

  it("draws no row on a list that does not sort", () => {
    const wrapper = mountSearch({ sortable: false });

    expect(wrapper.find(".scb-toolbar").exists()).toBe(false);
  });
});

/** A further action as a page hands it to the search: the iCal export. */
const EXPORT = {
  render(h) {
    return h("button", { attrs: { "data-test": "export" } }, "Exportieren");
  },
};

describe("Search — further actions in the row", () => {
  it("puts a page's actions right of the sorting", () => {
    const wrapper = mountSearch({}, { slots: { actions: EXPORT } });

    expect(wrapper.find("[data-test='row-end']").text()).toMatch(
      /Titel\s+Erstellt\s+Exportieren$/
    );
  });

  it("draws the row for actions alone, without sorting", () => {
    const wrapper = mountSearch(
      { sortable: false },
      { slots: { actions: EXPORT } }
    );

    expect(wrapper.find("[data-test='sort']").exists()).toBe(false);
    expect(
      wrapper.find("[data-test='row-end'] [data-test='export']").exists()
    ).toBe(true);
  });
});
