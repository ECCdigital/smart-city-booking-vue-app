import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import { activeDialog, dialogButton } from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiReviewService", () => ({
  default: { submit: vi.fn(), decide: vi.fn(), getReview: vi.fn() },
}));

vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { reviewViewer: vi.fn() },
}));

import ApiReviewService from "@/services/api/ApiReviewService";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import OfferReviewPanel from "@/components/Supervision/OfferReviewPanel.vue";

const SUBMITTED_AT = "2026-09-21T08:30:00.000Z";

const review = (overrides = {}) => ({
  status: null,
  submittedAt: null,
  decidedAt: null,
  decidedBy: null,
  reason: null,
  ...overrides,
});

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

function mountPanel(propsData = {}) {
  return mountComponent(OfferReviewPanel, {
    propsData: {
      tenantId: "t-1",
      offerType: "bookable",
      offerId: "b-1",
      review: review(),
      isPublic: false,
      supervisionLevel: "supervised",
      ...propsData,
    },
  });
}

function signInAs({ tenantOwner = false, instanceOwner = false }) {
  TenantPermissionService.reviewViewer.mockReturnValue({
    tenantOwner,
    instanceOwner,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs({ tenantOwner: true });
});

describe("OfferReviewPanel", () => {
  it("names status, submission time, reason and what the status means right now", () => {
    const wrapper = mountPanel({
      review: review({
        status: "rejected",
        submittedAt: SUBMITTED_AT,
        decidedAt: "2026-09-21T09:00:00.000Z",
        reason: "Bitte ein Bild ergänzen.",
      }),
      isPublic: true,
    });

    expect(TenantPermissionService.reviewViewer).toHaveBeenCalledWith("t-1");
    expect(find(wrapper, "review-status").text()).toBe("Abgelehnt");
    const time = new Date(SUBMITTED_AT).toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(find(wrapper, "review-submitted-at").text()).toContain(time);
    expect(find(wrapper, "review-decided-at").exists()).toBe(true);
    expect(find(wrapper, "review-reason").text()).toContain(
      "Bitte ein Bild ergänzen."
    );
    expect(find(wrapper, "review-effect").text()).toContain(
      "weder gelistet noch per Direktlink buchbar"
    );
  });

  it("lets the tenant owner submit without a publication wish and hands the new review up", async () => {
    const pending = review({ status: "pending", submittedAt: SUBMITTED_AT });
    ApiReviewService.submit.mockResolvedValue(pending);
    const wrapper = mountPanel({ isPublic: false });

    const button = find(wrapper, "review-action-submit");
    expect(button.text()).toBe("Zur Prüfung einreichen");
    await button.trigger("click");
    await flushPromises();

    expect(ApiReviewService.submit).toHaveBeenCalledWith(
      "t-1",
      "bookable",
      "b-1"
    );
    expect(wrapper.emitted("update:review")).toEqual([[pending]]);
  });

  it("offers the tenant owner a resubmission of a rejected offer, and nothing while it waits", async () => {
    const wrapper = mountPanel({ review: review({ status: "rejected" }) });
    expect(find(wrapper, "review-action-resubmit").text()).toBe(
      "Erneut einreichen"
    );

    await wrapper.setProps({ review: review({ status: "pending" }) });
    expect(wrapper.findAll("[data-test^='review-action-']").length).toBe(0);
  });

  it("asks the instance owner for an optional reason before rejecting", async () => {
    signInAs({ instanceOwner: true });
    const rejected = review({ status: "rejected", reason: "Bild fehlt" });
    ApiReviewService.decide.mockResolvedValue(rejected);
    const wrapper = mountPanel({ review: review({ status: "pending" }) });

    expect(find(wrapper, "review-action-approve").exists()).toBe(true);
    await find(wrapper, "review-action-reject").trigger("click");
    expect(ApiReviewService.decide).not.toHaveBeenCalled();

    const reason = activeDialog().querySelector("textarea");
    reason.value = "Bild fehlt";
    reason.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();
    dialogButton("Ablehnen").click();
    await flushPromises();

    expect(ApiReviewService.decide).toHaveBeenCalledWith(
      "t-1",
      "bookable",
      "b-1",
      { action: "reject", reason: "Bild fehlt" }
    );
    expect(wrapper.emitted("update:review")).toEqual([[rejected]]);
  });

  it("lets the instance owner withdraw an approval and correct a rejection", async () => {
    signInAs({ instanceOwner: true });
    const wrapper = mountPanel({ review: review({ status: "approved" }) });
    expect(find(wrapper, "review-action-withdraw").text()).toBe(
      "Freigabe zurückziehen"
    );

    await wrapper.setProps({ review: review({ status: "rejected" }) });
    expect(find(wrapper, "review-action-approve").text()).toBe("Freigeben");
    expect(find(wrapper, "review-action-resubmit").exists()).toBe(false);
  });

  it("explains an outdated action and catches up with the current review", async () => {
    signInAs({ instanceOwner: true });
    ApiReviewService.decide.mockRejectedValue(
      lifecycleError(409, "review_transition_invalid", {
        from: "rejected",
        action: "withdraw",
      })
    );
    const current = review({ status: "rejected" });
    ApiReviewService.getReview.mockResolvedValue(current);
    const wrapper = mountPanel({ review: review({ status: "approved" }) });

    await find(wrapper, "review-action-withdraw").trigger("click");
    dialogButton("Freigabe zurückziehen").click();
    await flushPromises();

    expect(find(wrapper, "review-error").text()).toContain(
      "passt nicht mehr zum aktuellen Prüfstatus"
    );
    expect(ApiReviewService.getReview).toHaveBeenCalledWith(
      "t-1",
      "bookable",
      "b-1"
    );
    expect(wrapper.emitted("update:review")).toEqual([[current]]);
  });

  it("says plainly when an action fails otherwise, and changes nothing", async () => {
    ApiReviewService.submit.mockRejectedValue(serverError());
    const wrapper = mountPanel();

    await find(wrapper, "review-action-submit").trigger("click");
    await flushPromises();

    expect(find(wrapper, "review-error").text()).toContain(
      "konnte nicht ausgeführt werden"
    );
    expect(ApiReviewService.getReview).not.toHaveBeenCalled();
    expect(wrapper.emitted("update:review")).toBeUndefined();
  });

  it("offers no action for an offer that is not stored yet", () => {
    const wrapper = mountPanel({ offerId: null });

    expect(wrapper.findAll("[data-test^='review-action-']").length).toBe(0);
    expect(find(wrapper, "review-unsaved").exists()).toBe(true);
  });

  it("stays quiet for the owner of a free tenant without a review status", () => {
    const wrapper = mountPanel({ supervisionLevel: "free" });

    expect(find(wrapper, "review-panel").exists()).toBe(false);
  });

  it("shows a free tenant's owner an existing status without explaining supervision", () => {
    const wrapper = mountPanel({
      supervisionLevel: "free",
      review: review({ status: "pending", submittedAt: SUBMITTED_AT }),
    });

    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
    expect(find(wrapper, "review-effect").exists()).toBe(false);
  });

  it("tells the instance owner that the status of a free tenant has no effect", () => {
    signInAs({ instanceOwner: true });
    const wrapper = mountPanel({ supervisionLevel: "free", isPublic: true });

    expect(find(wrapper, "review-effect").text()).toContain("ohne Wirkung");
  });
});
