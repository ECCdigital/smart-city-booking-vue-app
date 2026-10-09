import { describe, expect, it, vi } from "vitest";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";
import ApiEventService from "@/services/api/ApiEventService";
import Bookable from "@/entities/bookable";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn(() => Promise.resolve({ data: [] })) },
}));

/*
 * The one overview of both modes (ECCdigital/tickets#364): a block per step,
 * a row per field with the field's name and value, its issues beneath, and
 * the way to the field on a click.
 */

const bookable = (overrides = {}) =>
  new Bookable({
    tenantId: "t1",
    title: "Saal",
    requiredFields: ["address", "zipCode", "city"],
    ...overrides,
  }).toPlain();

const mountSummary = (item, { propsData, ...options } = {}) =>
  mountEditing(BookableFlowSummary, {
    bookable: item,
    propsData,
    ...options,
  }).wrapper;

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

describe("BookableFlowSummary", () => {
  it("shows a block per step with the rows of its fields", () => {
    const wrapper = mountSummary(bookable());

    expect(find(wrapper, "flow-summary").text()).toContain("Übersicht");
    expect(find(wrapper, "overview-row-title").text()).toContain("Titel");
    expect(find(wrapper, "overview-row-title").text()).toContain("Saal");
    expect(find(wrapper, "overview-row-location").text()).toContain(
      "Nicht festgelegt"
    );
  });

  it("reads a value of several words as one, joined by commas", () => {
    const wrapper = mountSummary(
      bookable({
        requiresLogin: true,
        permittedRoles: ["r1", "r2"],
        permittedUsers: ["u1"],
      })
    );

    expect(find(wrapper, "overview-row-access").text()).toContain(
      "2 Rollen, 1 Person"
    );
  });

  it("shows an unused expert option only in expert mode", () => {
    const item = bookable();

    expect(
      find(
        mountSummary(item, { expertMode: true }),
        "overview-row-tags"
      ).exists()
    ).toBe(true);
    expect(
      find(
        mountSummary(item, { expertMode: false }),
        "overview-row-tags"
      ).exists()
    ).toBe(false);
    expect(
      find(
        mountSummary(bookable({ tags: ["intern"] }), { expertMode: false }),
        "overview-row-tags"
      ).text()
    ).toContain("intern");
  });

  it("shows an issue of the check at its row", () => {
    const wrapper = mountSummary(bookable({ title: "" }));

    expect(
      find(wrapper, "overview-row-title")
        .find("[data-test='overview-issue']")
        .text()
    ).toBe("Bitte einen Titel eingeben.");
  });

  it("asks for the field of a row clicked", async () => {
    const wrapper = mountSummary(
      bookable({
        priceCategories: [
          {
            priceEur: 25,
            interval: { start: null, end: null },
            fixedPrice: false,
            holidays: [],
            weekdays: [],
          },
        ],
      })
    );

    await find(wrapper, "overview-row-vat").trigger("click");
    await find(wrapper, "overview-row-isBookable").trigger("click");

    expect(wrapper.emitted("go")).toEqual([
      [
        {
          step: "price",
          tab: "pricing",
          section: "pricing-price",
          field: "vat",
          area: null,
        },
      ],
      [
        {
          step: "publication",
          tab: null,
          section: null,
          field: "isBookable",
          area: null,
        },
      ],
    ]);
  });

  it("asks for the first field of a block whose heading is clicked", async () => {
    const wrapper = mountSummary(bookable());

    await find(wrapper, "overview-heading-amount").trigger("click");

    expect(wrapper.emitted("go")[0][0]).toMatchObject({
      step: "amount",
      field: "amount",
    });
  });

  it("shows a step not visited yet as open, its heading still leads on", async () => {
    const wrapper = mountSummary(bookable(), {
      propsData: { visited: ["identity"], current: "identity" },
    });

    expect(find(wrapper, "flow-summary-price").text()).toContain("Noch offen");
    expect(find(wrapper, "overview-row-price").exists()).toBe(false);
    expect(
      find(wrapper, "flow-summary-identity").attributes("aria-current")
    ).toBe("step");

    await find(wrapper, "overview-heading-price").trigger("click");
    expect(wrapper.emitted("go")[0][0]).toMatchObject({ step: "price" });
  });

  it("marks no block without a current step", () => {
    const wrapper = mountSummary(bookable());

    expect(wrapper.find("[aria-current]").exists()).toBe(false);
  });

  it("names the event of a ticket by its title", async () => {
    ApiEventService.getEvents.mockResolvedValue({
      data: [{ id: "e1", information: { name: "Sommerfest" } }],
    });
    const wrapper = mountSummary(
      bookable({ type: "ticket", title: "Eintritt", eventId: "e1" })
    );
    await flushPromises();

    expect(find(wrapper, "overview-row-eventId").text()).toContain(
      "Sommerfest"
    );
  });
});
