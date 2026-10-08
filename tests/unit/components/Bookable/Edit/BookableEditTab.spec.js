import { describe, expect, it } from "vitest";
import Vuex from "vuex";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditTab from "@/components/Bookable/Edit/BookableEditTab.vue";
import { BOOKABLE_EDIT_TABS } from "@/components/Bookable/Edit/bookableEditTabs";

// The areas stand aside: each has its own spec. A stub shows what it got.
const area = (name) => ({
  name,
  props: ["bookable", "sectionTarget"],
  render(h) {
    return h(
      "button",
      {
        attrs: {
          "data-test": `area-${name}`,
          "data-section-target": this.sectionTarget || "",
        },
        on: { click: () => this.$emit("update:bookable", { touched: name }) },
      },
      name
    );
  },
});

const AREAS = [
  "BookableEditAccessLocks",
  "BookableEditCheckoutBookables",
  "BookableEditHierarchy",
  "BookableEditPermissions",
  "BookableEditGroupBooking",
  "BookableEditCancellation",
  "BookableEditAttachments",
  "BookableEditCustomFields",
  "BookableEditRequiredFields",
  "BookableEditBookingNotes",
];
const stubs = Object.fromEntries(AREAS.map((name) => [name, area(name)]));

const tab = (key) => BOOKABLE_EDIT_TABS.find((entry) => entry.key === key);

// A new bookable as BookableEdit creates it, Pflichtfelder as the backend's
// schema has them: no expert option in use.
const bookable = (overrides = {}) =>
  new Bookable({
    id: "b1",
    tenantId: "t1",
    title: "Saal",
    requiredFields: ["address", "zipCode", "city"],
    ...overrides,
  }).toPlain();

const mountTab = (key, { overrides, expertMode, sectionTarget } = {}) =>
  mountEditing(BookableEditTab, {
    bookable: bookable(overrides),
    expertMode,
    propsData: { tab: tab(key), sectionTarget },
    store: new Vuex.Store({}),
    stubs,
  });

/** The cards of the tab: their headings, in order. */
const cardTitles = (wrapper) =>
  wrapper
    .findAll(".section-card .section-header")
    .wrappers.map((title) => title.text());

const CARD_TABS = [
  "accessLocks",
  "relatedBookables",
  "permissions",
  "attachments",
  "customFields",
  "additional",
];

describe("BookableEditTab - a tab of the editing page made of cards", () => {
  it("frames each area as a card under its name, under the tab's", () => {
    const { wrapper } = mountTab("relatedBookables");

    expect(wrapper.find(".base-section").text()).toContain("Abhängigkeiten");
    expect(cardTitles(wrapper)).toEqual(["Zusatzobjekte", "Hierarchie"]);
    expect(
      wrapper
        .find("#be-section-related-hierarchy")
        .find("[data-test='area-BookableEditHierarchy']")
        .exists()
    ).toBe(true);
  });

  it("names the areas the same way across the tabs", () => {
    const titles = CARD_TABS.flatMap((key) =>
      cardTitles(mountTab(key).wrapper)
    );

    expect(titles).toEqual([
      "Schließsysteme",
      "Zusatzobjekte",
      "Hierarchie",
      "Serienbuchung",
      "Stornierung",
      "Anhänge",
      "Eigene Felder",
      "Pflichtfelder",
      "Buchungshinweise",
    ]);
  });

  it("keeps the rest of Berechtigungen ahead of its areas, unframed", () => {
    const { wrapper } = mountTab("permissions");
    const rest = wrapper.find("[data-test='area-BookableEditPermissions']");

    expect(rest.exists()).toBe(true);
    expect(rest.element.closest(".section-card")).toBeNull();
    expect(
      rest.element.compareDocumentPosition(
        wrapper.find("#be-section-permissions-group-booking").element
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("hands an area's patch on as it is", async () => {
    const { wrapper, patches } = mountTab("additional");

    await wrapper
      .find("[data-test='area-BookableEditBookingNotes']")
      .trigger("click");

    expect(patches).toEqual([{ touched: "BookableEditBookingNotes" }]);
  });

  it("hands the section to open on to Eigene Felder", () => {
    const { wrapper } = mountTab("customFields", {
      sectionTarget: "customFields-definitions",
    });

    expect(
      wrapper
        .find("[data-test='area-BookableEditCustomFields']")
        .attributes("data-section-target")
    ).toBe("customFields-definitions");
  });
});

describe("BookableEditTab - without expert mode", () => {
  const shown = (key, overrides) =>
    cardTitles(mountTab(key, { overrides, expertMode: false }).wrapper);

  it("leaves out the unused expert areas", () => {
    expect(shown("permissions")).toEqual(["Serienbuchung"]);
    expect(shown("additional")).toEqual(["Buchungshinweise"]);
  });

  it("shows an expert area in use on its own", () => {
    expect(shown("relatedBookables", { relatedBookableIds: ["b3"] })).toEqual([
      "Hierarchie",
    ]);
    expect(
      shown("permissions", {
        cancellationPolicy: { userCancellable: false },
      })
    ).toEqual(["Serienbuchung", "Stornierung"]);
  });

  it("always shows Serienbuchung, Anhänge, Eigene Felder and Buchungshinweise", () => {
    expect(
      ["permissions", "attachments", "customFields", "additional"].map((key) =>
        shown(key)
      )
    ).toEqual([
      ["Serienbuchung"],
      ["Anhänge"],
      ["Eigene Felder"],
      ["Buchungshinweise"],
    ]);
  });
});
