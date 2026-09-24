import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiReviewService", () => ({
  default: { submit: vi.fn(), decide: vi.fn(), getReview: vi.fn() },
}));

vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    reviewViewer: vi.fn(() => ({ tenantOwner: true, instanceOwner: false })),
  },
}));

import ApiReviewService from "@/services/api/ApiReviewService";
import BookableEditStatus from "@/components/Bookable/Edit/BookableEditStatus.vue";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

function mountStatus({ bookable = {}, supervisionLevel = "supervised" } = {}) {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentSupervisionLevel: () => supervisionLevel },
      },
    },
  });
  return mountComponent(BookableEditStatus, {
    store,
    propsData: {
      bookable: {
        id: "b-1",
        tenantId: "t-1",
        isBookable: true,
        isPublic: false,
        autoCommitBooking: true,
        review: { status: null },
        ...bookable,
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BookableEditStatus", () => {
  it("docks the review of the bookable next to the publication wish", () => {
    const wrapper = mountStatus({
      bookable: { review: { status: "pending" }, isPublic: true },
    });

    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
    expect(find(wrapper, "review-effect").text()).toContain(
      "weder gelistet noch per Direktlink buchbar"
    );
  });

  it("takes the new review into the bookable without touching the unsaved edits", async () => {
    const pending = { status: "pending", submittedAt: "2026-09-21T08:30:00Z" };
    ApiReviewService.submit.mockResolvedValue(pending);
    const wrapper = mountStatus({ bookable: { title: "Unsaved title" } });

    await find(wrapper, "review-action-submit").trigger("click");
    await flushPromises();

    expect(ApiReviewService.submit).toHaveBeenCalledWith(
      "t-1",
      "bookable",
      "b-1"
    );
    expect(wrapper.props("bookable").review).toEqual(pending);
    expect(wrapper.props("bookable").title).toBe("Unsaved title");
    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
  });

  it("offers a new bookable no review action", () => {
    const wrapper = mountStatus({ bookable: { id: undefined } });

    expect(wrapper.findAll("[data-test^='review-action-']").length).toBe(0);
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
    (supervisionLevel, text) => {
      const wrapper = mountStatus({ supervisionLevel });

      expect(find(wrapper, "publication-wish-hint").text()).toContain(text);
    }
  );

  it("keeps a free tenant free of supervision texts", () => {
    const wrapper = mountStatus({ supervisionLevel: "free" });

    expect(find(wrapper, "publication-wish-hint").exists()).toBe(false);
    expect(find(wrapper, "review-panel").exists()).toBe(false);
  });
});
