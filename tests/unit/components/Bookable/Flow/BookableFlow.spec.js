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
import { FLOW_STEPS } from "@/utils/bookableFlow";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn() },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    reviewViewer: vi.fn(() => ({ tenantOwner: true, instanceOwner: false })),
  },
}));

// The steps with their own API calls and editors are stood in for; amount,
// approval and publication are drawn for real. „Weitere Einstellungen“ has
// its own spec.
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
  BookableFlowMore: stepStub("BookableFlowMore"),
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

// „Weiter“ until there is none: robust to steps added before the last.
async function walkToLastStep(wrapper) {
  while (find(wrapper, "flow-next").exists()) {
    await find(wrapper, "flow-next").trigger("click");
  }
}

describe("BookableFlow", () => {
  // „Weiter“ never holds (ECCdigital/tickets#354): a missing title is a
  // message at its field once the save is refused, not a lock.
  it("starts with the identity and goes on without a name", async () => {
    const wrapper = mountFlow();
    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
    expect(find(wrapper, "flow-next").attributes("disabled")).toBeUndefined();
    expect(
      find(wrapper, "flow-dot-price").attributes("disabled")
    ).toBeUndefined();

    await find(wrapper, "flow-next").trigger("click");
    expect(find(wrapper, "flow-title-heading").text()).toBe("Verfügbarkeit");
  });

  it("goes on step by step once named and marks the steps left behind", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    await find(wrapper, "flow-next").trigger("click");
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
    expect(changed).toEqual({ autoCommitBooking: true });
  });

  // ECCdigital/tickets#363: optional, between Bestätigung and
  // Veröffentlichung.
  it("goes through „Weitere Einstellungen“ after the approval without input", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });
    await find(wrapper, "flow-dot-approval").trigger("click");

    await find(wrapper, "flow-next").trigger("click");
    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Weitere Einstellungen"
    );
    expect(find(wrapper, "stub-BookableFlowMore").exists()).toBe(true);

    await find(wrapper, "flow-next").trigger("click");
    expect(find(wrapper, "flow-title-heading").text()).toBe("Veröffentlichung");
    expect(wrapper.emitted("update:bookable")).toBeUndefined();
  });

  // ECCdigital/tickets#362: one „Speichern“; what becomes public is the
  // publication step's switches, not a variant of the button.
  it("saves only at the end, with one „Speichern“", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    expect(find(wrapper, "flow-save").exists()).toBe(false);
    await walkToLastStep(wrapper);

    const buttons = find(wrapper, "flow-footer-actions").findAll("button");
    expect(buttons.wrappers.map((button) => button.text())).toEqual([
      "Speichern",
    ]);
    await find(wrapper, "flow-save").trigger("click");

    expect(wrapper.emitted("save")).toEqual([[]]);
  });

  it("ends with the publication, both switches as the bookable has them", async () => {
    const wrapper = mountFlow({
      bookable: bookable({ title: "Saal", isBookable: true, isPublic: false }),
    });
    await walkToLastStep(wrapper);

    expect(find(wrapper, "flow-title-heading").text()).toBe("Veröffentlichung");
    expect(find(wrapper, "publication-question").text()).toBe(
      "Wer kann das Buchungsobjekt finden und buchen?"
    );
    expect(find(wrapper, "publication-effect").text()).toBe(
      "Das Buchungsobjekt steht nicht im Katalog, ist aber per Direktlink buchbar."
    );
  });

  it("hands the publication the tenant's level and its patches on", async () => {
    const wrapper = mountFlow({
      bookable: bookable({ title: "Saal" }),
      level: "supervised",
    });
    await walkToLastStep(wrapper);

    expect(find(wrapper, "publication-wish-hint").exists()).toBe(true);
    await find(wrapper, "publication-public").find("input").trigger("click");

    const [changed] = wrapper.emitted("update:bookable").slice(-1)[0];
    expect(changed).toEqual({ isPublic: true });
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

    it("links each area to its row in „Weitere Einstellungen“", async () => {
      const wrapper = mountDone({ outcome: "draft" });
      const link = find(wrapper, "flow-done-area-bookingNotes");
      expect(link.text()).toContain("Buchungshinweise");
      expect(link.text()).toContain(
        "Kurze Hinweise im Checkout und in der Bestätigungsmail."
      );

      await link.trigger("click");

      expect(wrapper.emitted("open-area")).toEqual([["bookingNotes"]]);
    });

    it("links the expert options in use without expert mode, no others", () => {
      const saved = bookable({
        id: "b1",
        title: "Saal",
        cancellationPolicy: { userCancellable: false },
        requiredFields: ["address", "zipCode", "city"],
      });
      const wrapper = mountComponent(BookableFlow, {
        propsData: { bookable: saved, isNew: false, outcome: "draft" },
        provide: { bookableExpertMode: { enabled: false, stored: saved } },
        stubs: STUBS,
      });

      expect(find(wrapper, "flow-done-area-cancellation").exists()).toBe(true);
      expect(find(wrapper, "flow-done-area-hierarchy").exists()).toBe(false);
      expect(find(wrapper, "flow-done-area-requiredFields").exists()).toBe(
        false
      );
      expect(find(wrapper, "flow-done-area-groupBooking").exists()).toBe(true);
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
    expect(find(wrapper, "flow-steps").exists()).toBe(false);
  });

  it("puts the overview beside the step from 1264px, the dots above it", () => {
    const wrapper = mountFlow();

    expect(find(wrapper, "flow-progress").exists()).toBe(true);
    expect(find(wrapper, "flow-steps").exists()).toBe(false);
    expect(find(wrapper, "flow-summary").text()).toContain("Übersicht");
    const blocks = wrapper.findAll("[data-test^='flow-summary-']").wrappers;
    expect(blocks.map((block) => block.attributes("data-test"))).toEqual([
      "flow-summary-identity",
      "flow-summary-availability",
      "flow-summary-price",
      "flow-summary-amount",
      "flow-summary-permission",
      "flow-summary-approval",
      "flow-summary-more",
      "flow-summary-publication",
    ]);
    [
      "Identität",
      "Verfügbarkeit",
      "Preis",
      "Anzahl & Kapazität",
      "Berechtigung",
      "Freigabe",
      "Weitere Einstellungen",
      "Veröffentlichung",
    ].forEach((title, idx) => expect(blocks[idx].text()).toContain(title));
  });

  it("shows the identity with values and the other steps as open", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    expect(blockOf(wrapper, "identity").text()).toContain("Saal");
    expect(blockOf(wrapper, "identity").attributes("aria-current")).toBe(
      "step"
    );
    expect(openBlocks(wrapper)).toHaveLength(FLOW_STEPS.length - 1);

    await find(wrapper, "flow-next").trigger("click");

    expect(openBlocks(wrapper)).toHaveLength(FLOW_STEPS.length - 2);
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

  it("goes to the step of a block clicked, also without a title", async () => {
    const wrapper = mountFlow();

    await blockOf(wrapper, "price").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe("Preis");
  });

  it("shows only the confirmation once there is an outcome", () => {
    setViewportWidth(1904);
    const wrapper = mountFlow({
      bookable: bookable({ id: "b1", title: "Saal" }),
      outcome: "published",
    });

    expect(find(wrapper, "flow-done-title").exists()).toBe(true);
    expect(find(wrapper, "flow-summary").exists()).toBe(false);
    expect(find(wrapper, "flow-steps").exists()).toBe(false);
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
    expect(openBlocks(wrapper)).toHaveLength(FLOW_STEPS.length - 1);
  });

  it("names the event of a ticket by its title", async () => {
    ApiEventService.getEvents.mockResolvedValue({
      data: [{ id: "e1", information: { name: "Sommerfest" } }],
    });
    const wrapper = mountFlow({
      bookable: bookable({ type: "ticket", title: "Eintritt", eventId: "e1" }),
    });
    await flushPromises();

    expect(blockOf(wrapper, "identity").text()).toContain("Sommerfest");
  });
});

describe("BookableFlow on an extra wide screen", () => {
  beforeEach(() => setViewportWidth(1904));
  afterEach(() => resetViewportWidth());

  const entryOf = (wrapper, step) => find(wrapper, `flow-steps-${step}`);

  it("puts the step list left instead of the dots, the overview beside the step", () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });

    expect(find(wrapper, "flow-progress").exists()).toBe(false);
    expect(find(wrapper, "flow-summary").exists()).toBe(true);
    const list = find(wrapper, "flow-steps");
    expect(list.element.tagName).toBe("NAV");
    expect(list.attributes("aria-label")).toBe("Fortschritt");
    expect(list.text()).toContain("Abschluss");
    [
      "Identität",
      "Verfügbarkeit",
      "Preis",
      "Anzahl & Kapazität",
      "Berechtigung",
      "Freigabe",
      "Weitere Einstellungen",
      "Veröffentlichung",
    ].forEach((title) => expect(list.text()).toContain(title));
    expect(entryOf(wrapper, "identity").attributes("aria-current")).toBe(
      "step"
    );
    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
  });

  it("goes to the step clicked in the list and marks the one left as done", async () => {
    const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });
    expect(entryOf(wrapper, "identity").text()).toContain("aktuell");
    expect(entryOf(wrapper, "price").text()).toContain("offen");

    await entryOf(wrapper, "price").trigger("click");
    expect(find(wrapper, "flow-title-heading").text()).toBe("Preis");
    expect(entryOf(wrapper, "price").attributes("aria-current")).toBe("step");
    expect(entryOf(wrapper, "identity").attributes("aria-current")).toBe(
      undefined
    );
    expect(entryOf(wrapper, "identity").text()).toContain("erledigt");
    expect(entryOf(wrapper, "availability").text()).toContain("offen");
  });

  it("goes to the step clicked in the list, also without a title", async () => {
    const wrapper = mountFlow();

    expect(entryOf(wrapper, "price").attributes("disabled")).toBeUndefined();
    await entryOf(wrapper, "price").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe("Preis");
  });

  it("switches between list and dots with the window, keeping the step", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountFlow({ bookable: bookable({ title: "Saal" }) });
      await entryOf(wrapper, "availability").trigger("click");
      const step = find(wrapper, "stub-BookableFlowAvailability").element;

      setViewportWidth(1903);
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(200);
      await wrapper.vm.$nextTick();

      expect(find(wrapper, "flow-steps").exists()).toBe(false);
      expect(find(wrapper, "flow-progress").exists()).toBe(true);
      expect(find(wrapper, "flow-dot-identity").classes()).toContain(
        "bookable-flow__dot--done"
      );
      expect(find(wrapper, "stub-BookableFlowAvailability").element).toBe(step);

      setViewportWidth(1904);
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(200);
      await wrapper.vm.$nextTick();

      expect(find(wrapper, "flow-progress").exists()).toBe(false);
      expect(entryOf(wrapper, "availability").attributes("aria-current")).toBe(
        "step"
      );
      expect(find(wrapper, "stub-BookableFlowAvailability").element).toBe(step);
    } finally {
      vi.useRealTimers();
    }
  });
});
