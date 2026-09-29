import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import SearchBar from "@/components/commons/SearchBar.vue";

function mountBar(propsData = {}, options = {}) {
  return mountComponent(SearchBar, {
    propsData: { fields: "Titel oder ID", ...propsData },
    ...options,
  });
}

const input = (wrapper) => wrapper.find("input");

/** The queries the bar has handed on so far, oldest first. */
const handedOn = (wrapper) =>
  (wrapper.emitted("input") || []).map(([query]) => query);

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("names the fields it searches in the placeholder", () => {
    const wrapper = mountBar({ fields: "Name oder ID" });

    expect(input(wrapper).attributes("placeholder")).toBe(
      "Suchen nach Name oder ID …"
    );
  });

  it("hands the query on only after a pause of 300 ms", async () => {
    const wrapper = mountBar();

    await input(wrapper).setValue("Ra");
    vi.advanceTimersByTime(200);
    await input(wrapper).setValue("Raum");
    vi.advanceTimersByTime(299);
    expect(handedOn(wrapper)).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(handedOn(wrapper)).toEqual(["Raum"]);
  });

  it("shows a query the page sets, at mount and later", async () => {
    const wrapper = mountBar({ value: "Erika" });
    expect(input(wrapper).element.value).toBe("Erika");

    await wrapper.setProps({ value: "Max" });
    expect(input(wrapper).element.value).toBe("Max");
  });

  it("shows the cross only while there is text, and the cross empties the field at once", async () => {
    const wrapper = mountBar();
    expect(wrapper.find("[data-test='search-clear']").exists()).toBe(false);

    await input(wrapper).setValue("Raum");
    vi.advanceTimersByTime(300);
    const cross = wrapper.find("[data-test='search-clear']");
    expect(cross.exists()).toBe(true);

    await input(wrapper).setValue("Raum 2");
    await cross.trigger("click");
    await wrapper.vm.$nextTick();

    expect(input(wrapper).element.value).toBe("");
    expect(handedOn(wrapper)).toEqual(["Raum", ""]);
    vi.advanceTimersByTime(300);
    expect(handedOn(wrapper)).toEqual(["Raum", ""]);
    expect(wrapper.find("[data-test='search-clear']").exists()).toBe(false);
  });

  it("hands an emptied field on at once, as the cross does", async () => {
    const wrapper = mountBar({ value: "Raum" });

    await input(wrapper).setValue("");

    expect(handedOn(wrapper)).toEqual([""]);
  });

  describe("the funnel", () => {
    const STATUS = {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Aktiv" },
        { value: "pending", label: "Ausstehend" },
      ],
      selected: [],
    };

    const funnel = (wrapper) => wrapper.find("[data-test='search-filter']");
    const badge = (wrapper) =>
      wrapper.find("[data-test='search-filter-badge'] .v-badge__badge");

    it("is not there on a page without filters", () => {
      expect(funnel(mountBar()).exists()).toBe(false);
      expect(funnel(mountBar({ filters: [] })).exists()).toBe(false);
    });

    it("counts the active restrictions and is tinted while one applies", async () => {
      const wrapper = mountBar({ filters: [STATUS] });
      expect(funnel(wrapper).exists()).toBe(true);
      expect(badge(wrapper).isVisible()).toBe(false);
      expect(funnel(wrapper).classes()).not.toContain(
        "scb-search__filter--active"
      );

      await wrapper.setProps({
        filters: [{ ...STATUS, selected: ["active", "pending"] }],
      });

      expect(badge(wrapper).isVisible()).toBe(true);
      expect(badge(wrapper).text()).toBe("2");
      expect(funnel(wrapper).classes()).toContain("scb-search__filter--active");
    });

    it("opens the filter card and hands a change of it on", async () => {
      const wrapper = mountBar({ filters: [STATUS] });

      await funnel(wrapper).trigger("click");
      await wrapper.vm.$nextTick();
      const row = document.querySelector(
        ".v-menu__content [data-test='filter-row']"
      );
      row.click();

      expect(wrapper.emitted("filter")).toEqual([["status", ["active"]]]);
    });
  });
});
