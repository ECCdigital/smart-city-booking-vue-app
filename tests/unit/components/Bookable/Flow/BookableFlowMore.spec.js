import { describe, expect, it } from "vitest";
import Vuex from "vuex";
import { lastPatch, mountEditing } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableFlowMore from "@/components/Bookable/Flow/BookableFlowMore.vue";

// The areas stand aside: each has its own spec. A stub says it is there and
// hands on a change.
const area = (name) => ({
  name,
  props: ["bookable"],
  render(h) {
    return h(
      "button",
      {
        attrs: { "data-test": `area-${name}` },
        on: { click: () => this.$emit("update:bookable", { touched: name }) },
      },
      name
    );
  },
});

const stubs = Object.fromEntries(
  [
    "BookableEditAccessLocks",
    "BookableEditCheckoutBookables",
    "BookableEditHierarchy",
    "BookableEditGroupBooking",
    "BookableEditCancellation",
    "BookableEditAttachments",
    "BookableEditCustomFields",
    "BookableEditRequiredFields",
    "BookableEditBookingNotes",
  ].map((name) => [name, area(name)])
);

// A new bookable as BookableEdit creates it, Pflichtfelder as the backend's
// schema has them: no area in use.
const bookable = (overrides = {}) =>
  new Bookable({
    id: "b1",
    tenantId: "t1",
    title: "Saal",
    requiredFields: ["address", "zipCode", "city"],
    ...overrides,
  }).toPlain();

const mountMore = ({ overrides, expertMode, saved } = {}) =>
  mountEditing(BookableFlowMore, {
    bookable: bookable(overrides),
    expertMode,
    saved,
    store: new Vuex.Store({}),
    stubs,
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const rowKeys = (wrapper) =>
  wrapper
    .findAll("[data-test^='more-area-'][data-area]")
    .wrappers.map((row) => row.attributes("data-area"));
const shows = (wrapper, name) => find(wrapper, `area-${name}`).exists();

describe("BookableFlowMore - the step „Weitere Einstellungen“", () => {
  it("has a row per area in the order of the tabs", () => {
    const { wrapper } = mountMore({ expertMode: true });

    expect(rowKeys(wrapper)).toEqual([
      "accessLocks",
      "checkoutBookables",
      "hierarchy",
      "groupBooking",
      "cancellation",
      "attachments",
      "customFields",
      "requiredFields",
      "bookingNotes",
    ]);
  });

  it("names each row by its area, with its hint and „Nicht genutzt“ while unused", () => {
    const { wrapper } = mountMore({ expertMode: true });
    const row = find(wrapper, "more-area-checkoutBookables");

    expect(row.text()).toContain("Zusatzobjekte");
    expect(row.text()).toContain(
      "Zusatzbuchungen, die im Checkout mit angeboten werden."
    );
    expect(find(wrapper, "more-area-checkoutBookables-state").text()).toBe(
      "Nicht genutzt"
    );
  });

  it("sums up a used area in its row", () => {
    const { wrapper } = mountMore({
      expertMode: true,
      overrides: {
        checkoutBookableIds: ["b2", "b3"],
        groupBooking: { enabled: true, permittedRoles: ["r1"] },
      },
    });

    expect(find(wrapper, "more-area-checkoutBookables-state").text()).toBe(
      "2 Zusatzobjekte"
    );
    expect(find(wrapper, "more-area-groupBooking-state").text()).toBe(
      "Erlaubt, nur für 1 Rolle"
    );
  });

  it("opens exactly the used areas, each with its component", () => {
    const { wrapper } = mountMore({
      expertMode: true,
      overrides: {
        attachments: [{ type: "file", title: "AGB", url: "https://x/agb" }],
        cancellationPolicy: { userCancellable: false },
      },
    });

    expect(shows(wrapper, "BookableEditAttachments")).toBe(true);
    expect(shows(wrapper, "BookableEditCancellation")).toBe(true);
    expect(shows(wrapper, "BookableEditGroupBooking")).toBe(false);
    expect(shows(wrapper, "BookableEditAccessLocks")).toBe(false);
  });

  it("opens and closes a row on its title", async () => {
    const { wrapper } = mountMore({ expertMode: true });
    const toggle = find(wrapper, "more-area-groupBooking-toggle");

    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");

    expect(shows(wrapper, "BookableEditGroupBooking")).toBe(true);
    expect(toggle.attributes("aria-expanded")).toBe("true");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");
  });

  it("leaves out the unused expert areas without expert mode, not the others", () => {
    const { wrapper } = mountMore({ expertMode: false });

    expect(rowKeys(wrapper)).toEqual([
      "groupBooking",
      "attachments",
      "customFields",
      "bookingNotes",
    ]);
  });

  it("keeps a used expert area without expert mode", () => {
    const { wrapper } = mountMore({
      expertMode: false,
      overrides: { relatedBookableIds: ["b9"] },
    });

    expect(rowKeys(wrapper)).toContain("hierarchy");
    expect(shows(wrapper, "BookableEditHierarchy")).toBe(true);
  });

  it("hands on every change of an area and changes nothing by itself", async () => {
    const {
      wrapper,
      patches,
      bookable: handed,
      stored,
    } = mountMore({
      expertMode: true,
    });
    expect(patches).toEqual([]);

    await find(wrapper, "more-area-bookingNotes-toggle").trigger("click");
    await find(wrapper, "area-BookableEditBookingNotes").trigger("click");

    expect(lastPatch(patches)).toEqual({ touched: "BookableEditBookingNotes" });
    expect(handed).toEqual(stored);
  });
});
