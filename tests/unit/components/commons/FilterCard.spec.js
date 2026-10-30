import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import FilterCard from "@/components/commons/FilterCard.vue";

const STATUS = {
  key: "status",
  label: "Status",
  options: [
    { value: "active", label: "Aktiv", icon: "mdi-check" },
    { value: "pending", label: "Ausstehend", icon: "mdi-clock-outline" },
  ],
  selected: [],
};

const TYPE = {
  key: "type",
  label: "Typ",
  multiple: false,
  segmented: true,
  empty: "all",
  options: [
    { value: "all", label: "Alle" },
    { value: "door", label: "Türen" },
  ],
  selected: "all",
};

const ATTENDEES = {
  key: "attendees",
  label: "Teilnehmeranzahl",
  range: true,
  selected: { from: null, to: null },
};

function mountCard(sections) {
  return mountComponent(FilterCard, { propsData: { sections } });
}

const head = (wrapper) => wrapper.find("[data-test='filter-head']").text();

/** The row of an option, found by its label. */
const row = (wrapper, label) =>
  wrapper
    .findAll("[data-test='filter-row']")
    .wrappers.find((candidate) => candidate.text() === label);

/** The changes the card has raised so far, as [key, selection]. */
const changes = (wrapper) => wrapper.emitted("change") || [];

describe("FilterCard", () => {
  it("names in its head how many restrictions are active", async () => {
    const wrapper = mountCard([STATUS, TYPE]);
    expect(head(wrapper)).toContain("Keine Filter ausgewählt");

    await wrapper.setProps({
      sections: [
        { ...STATUS, selected: ["active", "pending"] },
        { ...TYPE, selected: "door" },
      ],
    });
    expect(head(wrapper)).toContain("3 Filter aktiv");
  });

  it("ticks and unticks a row, handing on the section's next selection", async () => {
    const wrapper = mountCard([{ ...STATUS, selected: ["pending"] }]);
    expect(row(wrapper, "Ausstehend").attributes("aria-pressed")).toBe("true");
    expect(row(wrapper, "Aktiv").attributes("aria-pressed")).toBe("false");

    await row(wrapper, "Aktiv").trigger("click");
    await row(wrapper, "Ausstehend").trigger("click");

    expect(changes(wrapper)).toEqual([
      ["status", ["pending", "active"]],
      ["status", []],
    ]);
  });

  it("picks one option of a single choice, and lifts it when picked again", async () => {
    const LEVEL = {
      key: "level",
      label: "Aufsichtsstufe",
      multiple: false,
      options: [
        { value: "free", label: "frei" },
        { value: "supervised", label: "beaufsichtigt" },
      ],
      selected: "supervised",
    };
    const wrapper = mountCard([LEVEL]);
    expect(row(wrapper, "beaufsichtigt").attributes("aria-pressed")).toBe(
      "true"
    );
    expect(row(wrapper, "frei").attributes("aria-pressed")).toBe("false");

    await row(wrapper, "frei").trigger("click");
    await row(wrapper, "beaufsichtigt").trigger("click");

    expect(changes(wrapper)).toEqual([
      ["level", "free"],
      ["level", null],
    ]);
  });

  it("draws a segmented single choice as a switch", async () => {
    const wrapper = mountCard([TYPE]);
    const segments = wrapper.findAll("[data-test='filter-segment']");
    expect(segments.wrappers.map((segment) => segment.text())).toEqual([
      "Alle",
      "Türen",
    ]);
    expect(wrapper.find("[data-test='filter-row']").exists()).toBe(false);

    await segments.at(1).trigger("click");

    expect(changes(wrapper)).toEqual([["type", "door"]]);
  });

  it("resets one section with its own link, offered only while it restricts", async () => {
    const wrapper = mountCard([{ ...STATUS, selected: ["active"] }, TYPE]);
    const resets = wrapper.findAll("[data-test='filter-section-reset']");
    expect(resets).toHaveLength(1);

    await resets.at(0).trigger("click");

    expect(changes(wrapper)).toEqual([["status", []]]);
  });

  it("resets every restricting section with „Alle zurücksetzen“, offered only while something restricts", async () => {
    const wrapper = mountCard([STATUS, TYPE]);
    expect(wrapper.find("[data-test='filter-reset-all']").exists()).toBe(false);

    await wrapper.setProps({
      sections: [
        { ...STATUS, selected: ["active"] },
        { ...TYPE, selected: "door" },
      ],
    });
    await wrapper.find("[data-test='filter-reset-all']").trigger("click");

    expect(changes(wrapper)).toEqual([
      ["status", []],
      ["type", "all"],
    ]);
  });

  it("says so when a section has nothing to offer", () => {
    const wrapper = mountCard([
      { key: "tags", label: "Tags", options: [], selected: [] },
    ]);

    expect(wrapper.find("[data-test='filter-empty']").text()).toBe(
      "Keine Einträge"
    );
  });

  it("draws a range as the fields von and bis, handing on the bound typed", async () => {
    const wrapper = mountCard([
      { ...ATTENDEES, selected: { from: 5, to: null } },
    ]);
    const from = wrapper.find("[data-test='filter-range-from']");
    const to = wrapper.find("[data-test='filter-range-to']");
    expect(from.element.value).toBe("5");
    expect(to.element.value).toBe("");

    to.setValue("20");
    from.setValue("");

    expect(changes(wrapper)).toEqual([
      ["attendees", { from: 5, to: 20 }],
      ["attendees", { from: null, to: null }],
    ]);
  });

  it("counts a range bounded on either side as one restriction and resets it to open", async () => {
    const wrapper = mountCard([
      { ...ATTENDEES, selected: { from: null, to: 20 } },
    ]);
    expect(head(wrapper)).toContain("1 Filter aktiv");

    await wrapper.find("[data-test='filter-section-reset']").trigger("click");

    expect(changes(wrapper)).toEqual([["attendees", { from: null, to: null }]]);
  });
});
