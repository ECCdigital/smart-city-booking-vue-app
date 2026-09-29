import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import AppList from "@/components/commons/AppList.vue";

const COLUMNS = [
  { key: "name", label: "Name", width: "120px" },
  { key: "count", label: "Anzahl", align: "end" },
];
const ROWS = [
  { id: "a", name: "Alpha", count: 3 },
  { id: "b", name: "Beta", count: 7 },
];

function mountList(propsData = {}, options = {}) {
  return mountComponent(AppList, {
    propsData: { columns: COLUMNS, items: ROWS, ...propsData },
    ...options,
  });
}

const rowTexts = (wrapper) =>
  wrapper
    .findAll("[data-test='list-row']")
    .wrappers.map((row) => row.text().replace(/\s+/g, " "));

describe("AppList", () => {
  it("draws the column heads and one row per item, on one grid", () => {
    const wrapper = mountList();

    expect(wrapper.text()).toContain("Name");
    expect(wrapper.text()).toContain("Anzahl");
    expect(rowTexts(wrapper)).toEqual(["Alpha 3", "Beta 7"]);
    expect(wrapper.attributes("style")).toContain(
      "--app-list-columns: 120px minmax(0, 1fr)"
    );
  });

  it("lets a cell slot draw a column", () => {
    const wrapper = mountList(
      {},
      {
        scopedSlots: {
          "cell.count": "<em>{{ props.value }} Stück</em>",
        },
      }
    );

    expect(rowTexts(wrapper)[0]).toBe("Alpha 3 Stück");
  });

  it("says so when there is nothing to list, but not while loading", async () => {
    const wrapper = mountList({ items: [], emptyText: "Noch nichts." });
    expect(wrapper.find("[data-test='list-empty']").text()).toBe(
      "Noch nichts."
    );

    await wrapper.setProps({ loading: true });
    expect(wrapper.find("[data-test='list-empty']").exists()).toBe(false);
  });

  it("keeps the rows, dimmed, while a reload runs", () => {
    const wrapper = mountList({ loading: true });

    expect(rowTexts(wrapper)).toHaveLength(2);
    expect(wrapper.classes()).toContain("app-list--loading");
  });

  it("shows a failed load instead of the rows and offers a retry to a listener", async () => {
    const wrapper = mountList(
      { errorMessage: "Keine Berechtigung." },
      { listeners: { retry: () => {} } }
    );

    expect(wrapper.find("[data-test='list-error']").text()).toContain(
      "Keine Berechtigung."
    );
    expect(rowTexts(wrapper)).toHaveLength(0);

    await wrapper.find("[data-test='list-retry']").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("offers no retry without a listener", () => {
    const wrapper = mountList({ errorMessage: "Keine Berechtigung." });

    expect(wrapper.find("[data-test='list-retry']").exists()).toBe(false);
  });

  it("pages when the total exceeds one page, and asks the caller for the next one", async () => {
    const wrapper = mountList({ page: 2, pageSize: 25, total: 60 });

    expect(wrapper.find("[data-test='list-range']").text()).toBe(
      "26–50 von 60"
    );
    expect(wrapper.text()).toContain("Seite 2 von 3");

    await wrapper.find("[data-test='list-next']").trigger("click");
    await wrapper.find("[data-test='list-previous']").trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[3], [1]]);
  });

  it("has no footer when everything fits on one page", () => {
    const wrapper = mountList({ page: 1, pageSize: 25, total: 2 });

    expect(wrapper.find("[data-test='list-range']").exists()).toBe(false);
  });

  it("disables the edge of the pages", () => {
    const wrapper = mountList({ page: 3, pageSize: 25, total: 60 });

    expect(
      wrapper.find("[data-test='list-next']").attributes("disabled")
    ).toBeDefined();
    expect(
      wrapper.find("[data-test='list-previous']").attributes("disabled")
    ).toBeUndefined();
  });
});
