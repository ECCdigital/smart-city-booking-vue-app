import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@tests/unit/support/api";
import { lastPatch, mountEditing } from "@tests/unit/support/bookableEditing";
import { switchByLabel, toggleSwitch } from "@tests/unit/support/vuetify";
import Bookable from "@/entities/bookable";

vi.mock("@/services/api/ApiReviewService", () => ({
  default: { submit: vi.fn(), decide: vi.fn(), getReview: vi.fn() },
}));

vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    reviewViewer: vi.fn(() => ({ tenantOwner: true, instanceOwner: false })),
  },
}));

import ApiReviewService from "@/services/api/ApiReviewService";
import BookableEditPublication from "@/components/Bookable/Edit/BookableEditPublication.vue";

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

const BUCHBAR = "Buchbar";
const IM_KATALOG = "Im Katalog listen";
const SUBMITS = "Beim Speichern wird das Angebot zur Prüfung eingereicht.";

const bookable = (overrides = {}) =>
  new Bookable({
    id: "b1",
    tenantId: "t1",
    title: "Saal",
    isBookable: false,
    isPublic: false,
    review: null,
    ...overrides,
  }).toPlain();

function mountPublication({ level = "free", ...overrides } = {}) {
  return mountEditing(BookableEditPublication, {
    bookable: bookable(overrides),
    propsData: { level },
  });
}

const isOn = (wrapper, label) => switchByLabel(wrapper, label).vm.isActive;
const effect = (wrapper) => find(wrapper, "publication-effect").text();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BookableEditPublication", () => {
  it("asks who can find and book the bookable, with two switches", () => {
    const { wrapper } = mountPublication({ isBookable: true });

    expect(find(wrapper, "publication-question").text()).toBe(
      "Wer kann das Buchungsobjekt finden und buchen?"
    );
    expect(isOn(wrapper, BUCHBAR)).toBe(true);
    expect(isOn(wrapper, IM_KATALOG)).toBe(false);
  });

  it("hands on each switch on its own, as a partial patch", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountPublication({
      isBookable: true,
    });

    await toggleSwitch(wrapper, IM_KATALOG);
    expect(lastPatch(patches)).toEqual({ isPublic: true });

    await toggleSwitch(wrapper, BUCHBAR);
    expect(lastPatch(patches)).toEqual({ isBookable: false });

    expect(handedIn).toEqual(stored);
    expect(isOn(wrapper, BUCHBAR)).toBe(false);
    expect(isOn(wrapper, IM_KATALOG)).toBe(true);
  });

  it.each([
    [true, true, "Das Buchungsobjekt steht im Katalog und ist buchbar."],
    [
      true,
      false,
      "Das Buchungsobjekt steht nicht im Katalog, ist aber per Direktlink buchbar.",
    ],
    [
      false,
      true,
      "Das Buchungsobjekt steht im Katalog, ist aber nicht buchbar.",
    ],
    [
      false,
      false,
      "Das Buchungsobjekt steht nicht im Katalog und ist nicht buchbar.",
    ],
  ])(
    "says for a free tenant with Buchbar %s and Im Katalog %s what follows",
    (isBookable, isPublic, text) => {
      const { wrapper } = mountPublication({ isBookable, isPublic });

      expect(effect(wrapper)).toBe(text);
    }
  );

  it("follows the switches with its line at once", async () => {
    const { wrapper } = mountPublication({ isBookable: true });

    await toggleSwitch(wrapper, IM_KATALOG);

    expect(effect(wrapper)).toBe(
      "Das Buchungsobjekt steht im Katalog und ist buchbar."
    );
  });

  it("keeps a free tenant free of supervision texts", () => {
    const { wrapper } = mountPublication({ isPublic: true, review: null });

    expect(find(wrapper, "publication-wish-hint").exists()).toBe(false);
    expect(find(wrapper, "review-panel").exists()).toBe(false);
    expect(wrapper.text()).not.toContain(SUBMITS);
  });

  it("shows the review under supervision with one line of what follows", () => {
    const { wrapper } = mountPublication({
      level: "supervised",
      isBookable: true,
      isPublic: true,
      review: { status: "pending" },
    });

    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
    expect(effect(wrapper)).toContain(
      "Nach der Freigabe steht das Buchungsobjekt im Katalog und ist buchbar."
    );
    expect(find(wrapper, "review-effect").exists()).toBe(false);
    expect(find(wrapper, "publication-wish-hint").text()).toContain(
      "braucht zusätzlich eine Freigabe"
    );
  });

  it("says under supervision that saving submits the wish of a bookable without review", async () => {
    const { wrapper } = mountPublication({
      id: undefined,
      level: "supervised",
      isBookable: true,
    });
    expect(wrapper.text()).not.toContain(SUBMITS);

    await toggleSwitch(wrapper, IM_KATALOG);

    expect(find(wrapper, "publication-submits").text()).toBe(SUBMITS);
    expect(find(wrapper, "review-unsaved").exists()).toBe(false);
  });

  it.each([
    ["supervised", "braucht zusätzlich eine Freigabe"],
    [
      "pending",
      "Der Veröffentlichungswunsch wird vorgemerkt; bis zur Freigabe durch den Betreiber wird nichts öffentlich",
    ],
    ["declined", "abgewiesen: Der Veröffentlichungswunsch wird vorgemerkt"],
  ])(
    "says under %s that the publication wish alone does not publish",
    (level, text) => {
      const { wrapper } = mountPublication({ level });

      expect(find(wrapper, "publication-wish-hint").text()).toContain(text);
    }
  );

  it("offers a new bookable no review action", () => {
    const { wrapper } = mountPublication({
      id: undefined,
      level: "supervised",
    });

    expect(wrapper.findAll("[data-test^='review-action-']").length).toBe(0);
  });

  it("takes a new review into the bookable as a patch", async () => {
    const pending = { status: "pending", submittedAt: "2026-09-21T08:30:00Z" };
    ApiReviewService.submit.mockResolvedValue(pending);
    const { wrapper, patches } = mountPublication({ level: "supervised" });

    await find(wrapper, "review-action-submit").trigger("click");
    await flushPromises();

    expect(ApiReviewService.submit).toHaveBeenCalledWith(
      "t1",
      "bookable",
      "b1"
    );
    expect(lastPatch(patches)).toEqual({ review: pending });
    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
  });
});
