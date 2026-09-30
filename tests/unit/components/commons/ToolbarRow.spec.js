import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import ToolbarRow from "@/components/commons/ToolbarRow.vue";

const VIEWS = [
  { value: "list", label: "Liste", icon: "mdi-list-box-outline" },
  { value: "calendar", label: "Kalender", icon: "mdi-calendar-blank-outline" },
];

function mountRow(propsData = {}, options = {}) {
  return mountComponent(ToolbarRow, { propsData, ...options });
}

/** The last value the row handed on with `event`, or undefined. */
const lastEmitted = (wrapper, event) => {
  const calls = wrapper.emitted(event) || [];
  return calls.length ? calls[calls.length - 1][0] : undefined;
};

describe("ToolbarRow — the views", () => {
  it("draws every view with its label and marks the active one", () => {
    const wrapper = mountRow({ views: VIEWS, view: "calendar" });

    const list = wrapper.find("[data-test='view-list']");
    const calendar = wrapper.find("[data-test='view-calendar']");
    expect(list.text()).toBe("Liste");
    expect(calendar.text()).toBe("Kalender");
    expect(list.attributes("aria-pressed")).toBe("false");
    expect(calendar.attributes("aria-pressed")).toBe("true");
  });

  it("hands on the view clicked, not the one already shown", async () => {
    const wrapper = mountRow({ views: VIEWS, view: "list" });

    await wrapper.find("[data-test='view-list']").trigger("click");
    expect(wrapper.emitted("update:view")).toBeUndefined();

    await wrapper.find("[data-test='view-calendar']").trigger("click");
    expect(lastEmitted(wrapper, "update:view")).toBe("calendar");
  });
});

const FIELDS = [
  { text: "Titel", value: "title" },
  { text: "Erstellt", value: "timeCreated" },
];

const fields = (wrapper) => wrapper.findAll("[data-test='sort-field']");
const field = (wrapper, label) =>
  fields(wrapper).wrappers.find((f) => f.text().startsWith(label));

describe("ToolbarRow — sorting", () => {
  it("spells the fields out after the caption, none active at first", () => {
    const wrapper = mountRow({ sortOptions: FIELDS, sortDir: "asc" });

    expect(wrapper.find("[data-test='sort']").text()).toMatch(
      /^Sortieren\s+Titel\s+Erstellt$/
    );
    expect(
      fields(wrapper).wrappers.map((f) => f.attributes("aria-pressed"))
    ).toEqual(["false", "false"]);
    expect(wrapper.find("[data-test='sort-reset']").exists()).toBe(false);
  });

  it("sorts by the field clicked", async () => {
    const wrapper = mountRow({ sortOptions: FIELDS, sortDir: "asc" });

    await field(wrapper, "Erstellt").trigger("click");

    expect(lastEmitted(wrapper, "update:sortBy")).toBe("timeCreated");
    expect(wrapper.emitted("update:sortDir")).toBeUndefined();
  });

  it("marks the active field with its direction", async () => {
    const wrapper = mountRow({
      sortOptions: FIELDS,
      sortBy: "timeCreated",
      sortDir: "asc",
    });
    const active = () => field(wrapper, "Erstellt");

    expect(active().attributes("aria-pressed")).toBe("true");
    expect(active().find(".v-icon").classes()).toContain("mdi-arrow-up");
    expect(field(wrapper, "Titel").find(".v-icon").exists()).toBe(false);

    await wrapper.setProps({ sortDir: "desc" });
    expect(active().find(".v-icon").classes()).toContain("mdi-arrow-down");
  });

  it("turns the direction when the active field is clicked again", async () => {
    const wrapper = mountRow({
      sortOptions: FIELDS,
      sortBy: "title",
      sortDir: "asc",
    });

    await field(wrapper, "Titel").trigger("click");
    expect(lastEmitted(wrapper, "update:sortDir")).toBe("desc");

    await wrapper.setProps({ sortDir: "desc" });
    await field(wrapper, "Titel").trigger("click");
    expect(lastEmitted(wrapper, "update:sortDir")).toBe("asc");
    expect(wrapper.emitted("update:sortBy")).toBeUndefined();
  });

  it("resets the sorting with the cross beside an active field", async () => {
    const wrapper = mountRow({
      sortOptions: FIELDS,
      sortBy: "title",
      sortDir: "asc",
    });

    await wrapper.find("[data-test='sort-reset']").trigger("click");

    expect(lastEmitted(wrapper, "update:sortBy")).toBeNull();
  });
});

/** A further action as a page hands it into the row's `actions` slot. */
const HISTORY = {
  render(h) {
    return h("button", { attrs: { "data-test": "history" } }, "Historie");
  },
};

describe("ToolbarRow — fixed places", () => {
  it("puts the views left and sorting, then the further actions right", () => {
    const wrapper = mountRow(
      { views: VIEWS, view: "list", sortOptions: FIELDS },
      { slots: { actions: HISTORY } }
    );

    const start = wrapper.find("[data-test='row-start']");
    const end = wrapper.find("[data-test='row-end']");
    expect(start.find("[data-test='view-list']").exists()).toBe(true);
    expect(end.text()).toMatch(/^Sortieren\s+Titel\s+Erstellt\s+Historie$/);
  });

  it("leaves the place of a missing element empty, the others keep theirs", () => {
    const wrapper = mountRow({}, { slots: { actions: HISTORY } });

    expect(wrapper.find("[data-test='row-start']").text()).toBe("");
    expect(wrapper.find("[data-test='sort']").exists()).toBe(false);
    expect(
      wrapper.find("[data-test='row-end'] [data-test='history']").exists()
    ).toBe(true);
  });
});
