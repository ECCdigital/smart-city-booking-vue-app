import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  resetViewportWidth,
  setViewportWidth,
} from "@tests/unit/support/viewport";
import ApiEventService from "@/services/api/ApiEventService";
import Bookable from "@/entities/bookable";
import BookableFlow from "@/components/Bookable/Flow/BookableFlow.vue";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn() },
}));

// The steps with their own API calls and editors are stood in for; amount
// and approval are drawn for real.
const stepStub = (name) => ({
  name,
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } });
  },
});

const STUBS = {
  BookableFlowIdentity: stepStub("BookableFlowIdentity"),
  BookableFlowAvailability: stepStub("BookableFlowAvailability"),
  BookableFlowPrice: stepStub("BookableFlowPrice"),
  BookableFlowPermission: stepStub("BookableFlowPermission"),
  TenantReadinessCheck: stepStub("TenantReadinessCheck"),
  RouterLink: true,
};

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", type: "room", ...overrides }).toPlain();

const mountFlow = (propsData = {}) =>
  mountComponent(BookableFlow, {
    propsData: { bookable: bookable(), isNew: true, ...propsData },
    stubs: STUBS,
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

async function walkToLastStep(wrapper) {
  for (let step = 0; step < 5; step += 1) {
    await find(wrapper, "flow-next").trigger("click");
  }
}

describe("BookableFlow", () => {
  it("starts with the identity and holds the way on until there is a name", () => {
    const wrapper = mountFlow();

    expect(find(wrapper, "flow-count").text()).toBe("Schritt 1 von 6");
    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
    expect(find(wrapper, "flow-name-missing").exists()).toBe(true);
    expect(find(wrapper, "flow-next").attributes("disabled")).toBeDefined();
    expect(
      find(wrapper, "flow-dot-price").attributes("disabled")
    ).toBeDefined();
  });

  it("goes on step by step once named and marks the steps left behind", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    await find(wrapper, "flow-next").trigger("click");

    expect(find(wrapper, "flow-count").text()).toBe("Schritt 2 von 6");
    expect(find(wrapper, "flow-title-heading").text()).toBe("Verfügbarkeit");
    expect(find(wrapper, "flow-dot-identity").classes()).toContain(
      "bookable-flow__dot--done"
    );

    await find(wrapper, "flow-back").trigger("click");
    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
  });

  it("jumps to any step through its dot", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    await find(wrapper, "flow-dot-approval").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe("Freigabe");
    expect(find(wrapper, "flow-approval").exists()).toBe(true);
  });

  it("hands every change of a step to the editor", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });
    await find(wrapper, "flow-dot-approval").trigger("click");

    await find(wrapper, "flow-approval-auto").trigger("click");

    const [changed] = wrapper.emitted("update:bookable").slice(-1)[0];
    expect(changed.autoCommitBooking).toBe(true);
    expect(changed.title).toBe("Saal");
  });

  it("saves only at the end, with or without the publication wish", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    expect(find(wrapper, "flow-save-only").exists()).toBe(false);
    await walkToLastStep(wrapper);

    await find(wrapper, "flow-save-only").trigger("click");
    await find(wrapper, "flow-save-publish").trigger("click");

    expect(wrapper.emitted("save")).toEqual([[false], [true]]);
  });

  it.each([
    [null, "Speichern und veröffentlichen"],
    ["supervised", "Speichern und zur Prüfung einreichen"],
    ["pending", "Speichern und Veröffentlichung vormerken"],
  ])("words the closing action for the level %s", async (level, label) => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }), level });
    await walkToLastStep(wrapper);

    expect(find(wrapper, "flow-save-publish").text()).toBe(label);
  });

  it("names a failed save beside the buttons", async () => {
    const wrapper = mountFlow({
      bookable: bookable({ title: "Saal" }),
      saveFailed: true,
    });

    expect(find(wrapper, "flow-save-failed").text()).toContain(
      "konnte nicht gespeichert werden"
    );
  });

  it("lets the onboarding skip the first bookable and keeps its level in view", async () => {
    const wrapper = mountFlow({ onboarding: true, level: "supervised" });

    expect(find(wrapper, "supervision-notice").text()).toContain(
      "beaufsichtigt"
    );
    await find(wrapper, "flow-skip").trigger("click");

    expect(wrapper.emitted("skip")).toHaveLength(1);
  });

  it("offers no skip outside the onboarding", () => {
    expect(find(mountFlow(), "flow-skip").exists()).toBe(false);
  });

  describe("after the save", () => {
    const mountDone = (propsData) =>
      mountFlow({
        bookable: bookable({ id: "b1", title: "Saal" }),
        ...propsData,
      });

    it("says what became of the publication", () => {
      expect(
        find(mountDone({ outcome: "published" }), "flow-done-title").text()
      ).toBe("Veröffentlicht");
      expect(
        find(
          mountDone({ outcome: "published", level: "supervised" }),
          "flow-done-title"
        ).text()
      ).toBe("Zur Prüfung eingereicht");
      expect(
        find(mountDone({ outcome: "draft" }), "flow-done-title").text()
      ).toBe("Als Entwurf gespeichert");
      expect(
        find(mountDone({ outcome: "kept" }), "flow-done-title").text()
      ).toBe("Gespeichert");
    });

    it("shows the readiness check and names payment for a paid offer only", () => {
      const free = mountDone({ outcome: "draft" });
      expect(find(free, "stub-TenantReadinessCheck").exists()).toBe(true);
      expect(find(free, "setup-legal").exists()).toBe(true);
      expect(free.text()).not.toContain("Zahlung");

      const paid = mountFlow({
        bookable: bookable({
          id: "b1",
          title: "Saal",
          priceCategories: [{ priceEur: 12 }],
        }),
        outcome: "draft",
      });
      expect(find(paid, "setup-payment").exists()).toBe(true);
    });

    it("opens an optional section of the editor", async () => {
      const wrapper = mountDone({ outcome: "draft" });

      await find(wrapper, "flow-section-notes").trigger("click");

      expect(wrapper.emitted("open-section")[0][0]).toEqual({
        key: "notes",
        tabKey: "additional",
        sectionId: "additional-notes",
      });
    });

    it("leads on to another bookable or to the overview", async () => {
      const wrapper = mountDone({ outcome: "published" });

      await find(wrapper, "flow-another").trigger("click");
      await find(wrapper, "flow-overview").trigger("click");

      expect(wrapper.emitted("another")).toHaveLength(1);
      expect(wrapper.emitted("overview")).toHaveLength(1);
    });
  });
});

describe("BookableFlow on a wide screen", () => {
  beforeEach(() => setViewportWidth(1264));
  afterEach(() => resetViewportWidth());

  const blockOf = (wrapper, step) => find(wrapper, `flow-summary-${step}`);
  const openBlocks = (wrapper) =>
    wrapper
      .findAll("[data-test^='flow-summary-']")
      .filter((block) => block.text().includes("Noch offen"));

  it("keeps today's column without an overview below 1264px", () => {
    setViewportWidth(1263);
    const wrapper = mountFlow();

    expect(find(wrapper, "flow-progress").exists()).toBe(true);
    expect(find(wrapper, "flow-summary").exists()).toBe(false);
  });

  it("puts the overview beside the step from 1264px, the dots above it", () => {
    const wrapper = mountFlow();

    expect(find(wrapper, "flow-progress").exists()).toBe(true);
    expect(find(wrapper, "flow-summary").text()).toContain("Übersicht");
    const blocks = wrapper.findAll("[data-test^='flow-summary-']").wrappers;
    expect(blocks.map((block) => block.attributes("data-test"))).toEqual([
      "flow-summary-identity",
      "flow-summary-availability",
      "flow-summary-price",
      "flow-summary-amount",
      "flow-summary-permission",
      "flow-summary-approval",
    ]);
    [
      "Identität",
      "Verfügbarkeit",
      "Preis",
      "Anzahl & Kapazität",
      "Berechtigung",
      "Freigabe",
    ].forEach((title, idx) => expect(blocks[idx].text()).toContain(title));
  });

  it("shows the identity with values and the other five steps as open", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    expect(blockOf(wrapper, "identity").text()).toContain("Saal");
    expect(blockOf(wrapper, "identity").attributes("aria-current")).toBe(
      "step"
    );
    expect(openBlocks(wrapper)).toHaveLength(5);

    await find(wrapper, "flow-next").trigger("click");

    expect(openBlocks(wrapper)).toHaveLength(4);
    expect(blockOf(wrapper, "availability").text()).not.toContain("Noch offen");
    expect(blockOf(wrapper, "availability").attributes("aria-current")).toBe(
      "step"
    );
  });

  it("shows an existing bookable without an open step", () => {
    const wrapper = mountFlow({
      bookable: bookable({ id: "b1", title: "Saal" }),
      isNew: false,
    });

    expect(openBlocks(wrapper)).toHaveLength(0);
    expect(blockOf(wrapper, "approval").text()).toContain("wird geprüft");
  });

  it("shows a new value as soon as the bookable changes", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    await wrapper.setProps({ bookable: bookable({ title: "Großer Saal" }) });

    expect(blockOf(wrapper, "identity").text()).toContain("Großer Saal");
  });

  it("goes to the step of a block clicked", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    await blockOf(wrapper, "approval").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe("Freigabe");
    expect(blockOf(wrapper, "approval").text()).toContain("wird geprüft");
    expect(find(wrapper, "flow-dot-identity").classes()).toContain(
      "bookable-flow__dot--done"
    );
  });

  it("holds in the identity without a title and names what is missing", async () => {
    const wrapper = mountFlow();

    await blockOf(wrapper, "price").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
    expect(find(wrapper, "flow-name-missing").text()).toBe(
      "Ein Name fehlt noch"
    );
    expect(openBlocks(wrapper)).toHaveLength(5);
  });

  it("shows only the confirmation once there is an outcome", () => {
    setViewportWidth(1904);
    const wrapper = mountFlow({
      bookable: bookable({ id: "b1", title: "Saal" }),
      outcome: "published",
    });

    expect(find(wrapper, "flow-done-title").exists()).toBe(true);
    expect(find(wrapper, "flow-summary").exists()).toBe(false);
  });

  it("starts over with open steps for another bookable", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });
    await blockOf(wrapper, "approval").trigger("click");
    await wrapper.setProps({
      bookable: bookable({ id: "b1", title: "Saal" }),
      isNew: false,
      outcome: "published",
    });

    // „Weiteres Buchungsobjekt anlegen“: the editor drops the outcome and
    // hands in a new bookable.
    await find(wrapper, "flow-another").trigger("click");
    await wrapper.setProps({
      bookable: bookable(),
      isNew: true,
      outcome: null,
    });

    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
    expect(openBlocks(wrapper)).toHaveLength(5);
  });

  it("names the event of a ticket by its title", async () => {
    ApiEventService.getEvents.mockResolvedValue({
      data: [{ id: "e1", information: { name: "Sommerfest" } }],
    });
    const wrapper = mountFlow({
      bookable: bookable({ type: "ticket", title: "Eintritt", eventId: "e1" }),
    });
    await flushPromises();

    expect(ApiEventService.getEvents).toHaveBeenCalledWith("t1");
    expect(blockOf(wrapper, "identity").text()).toContain("Sommerfest");
  });
});
