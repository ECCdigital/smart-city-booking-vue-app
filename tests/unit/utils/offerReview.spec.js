import { describe, expect, it } from "vitest";
import {
  publicationWishHintKey,
  reviewActions,
  reviewBadge,
  reviewEffectKey,
  reviewStatusView,
  showsReview,
} from "@/utils/offerReview";

const TENANT_OWNER = { tenantOwner: true, instanceOwner: false };
const INSTANCE_OWNER = { tenantOwner: false, instanceOwner: true };
const MANAGER = { tenantOwner: false, instanceOwner: false };

const review = (status) => ({ status });

describe("reviewStatusView", () => {
  it.each([
    [null, "supervision.review.status.none", "grey"],
    ["pending", "supervision.review.status.pending", "warning"],
    ["approved", "supervision.review.status.approved", "success"],
    ["rejected", "supervision.review.status.rejected", "error"],
  ])("status %s reads as %s in %s", (status, labelKey, color) => {
    expect(reviewStatusView(review(status))).toEqual({
      status,
      labelKey,
      color,
    });
  });

  it("reads a missing review and an unknown status as no review status", () => {
    expect(reviewStatusView(undefined).status).toBe(null);
    expect(reviewStatusView(null).status).toBe(null);
    expect(reviewStatusView(review("published")).status).toBe(null);
  });
});

// Spec §4: the transitions, by who may trigger them.
describe("reviewActions", () => {
  it.each([
    [null, TENANT_OWNER, ["submit"]],
    ["pending", TENANT_OWNER, []],
    ["approved", TENANT_OWNER, []],
    ["rejected", TENANT_OWNER, ["resubmit"]],
    // The backend lets the instance owner submit too; without it an offer
    // nobody submitted could never be approved by him.
    [null, INSTANCE_OWNER, ["submit"]],
    ["pending", INSTANCE_OWNER, ["approve", "reject"]],
    ["approved", INSTANCE_OWNER, ["withdraw"]],
    ["rejected", INSTANCE_OWNER, ["approve"]],
    [null, MANAGER, []],
    ["pending", MANAGER, []],
    ["approved", MANAGER, []],
    ["rejected", MANAGER, []],
  ])("status %s for %o offers %j", (status, viewer, expected) => {
    expect(reviewActions(review(status), viewer)).toEqual(expected);
  });

  it("offers an instance owner who owns the tenant the correction, not a resubmission", () => {
    const both = { tenantOwner: true, instanceOwner: true };
    expect(reviewActions(review("rejected"), both)).toEqual(["approve"]);
  });

  it("offers nothing without a viewer", () => {
    expect(reviewActions(review(null))).toEqual([]);
  });
});

// Spec §5.1: the decision matrix, row by row.
describe("reviewEffectKey", () => {
  const STATUSES = [null, "pending", "approved", "rejected"];
  const rows = [];
  for (const status of STATUSES) {
    rows.push(["blocked", status, false, "blocked"]);
    rows.push(["blocked", status, true, "blocked"]);
  }
  for (const status of [null, "pending", "rejected"]) {
    rows.push(["supervised", status, false, "not-reachable"]);
    rows.push(["supervised", status, true, "not-reachable"]);
  }
  rows.push(["supervised", "approved", false, "direct-link-only"]);
  rows.push(["supervised", "approved", true, "listed"]);

  it.each(rows)(
    "level %s, status %s, wish %s: %s",
    (level, status, isPublic, expected) => {
      expect(reviewEffectKey({ review: review(status), isPublic }, level)).toBe(
        `supervision.review.effect.${expected}`
      );
    }
  );

  it("names no effect for a free tenant", () => {
    expect(
      reviewEffectKey({ review: review("approved"), isPublic: true }, "free")
    ).toBe(null);
  });

  it("names no effect while the level is unknown", () => {
    expect(reviewEffectKey({ review: review("approved") }, undefined)).toBe(
      null
    );
    expect(reviewEffectKey({ review: review("approved") }, "open")).toBe(null);
  });
});

describe("showsReview", () => {
  it("shows nothing for a free tenant - no status, no viewer changes that", () => {
    expect(showsReview(review(null), "free", TENANT_OWNER)).toBe(false);
    expect(showsReview(review("rejected"), "free", TENANT_OWNER)).toBe(false);
    expect(showsReview(review(null), "free", INSTANCE_OWNER)).toBe(false);
    expect(showsReview(review("pending"), "free", INSTANCE_OWNER)).toBe(false);
  });

  it("always shows under supervision", () => {
    expect(showsReview(review(null), "supervised", TENANT_OWNER)).toBe(true);
    expect(showsReview(review(null), "blocked", TENANT_OWNER)).toBe(true);
  });

  it("shows only what is certain while the level is unknown", () => {
    expect(showsReview(review(null), undefined, TENANT_OWNER)).toBe(false);
    expect(showsReview(review("pending"), undefined, MANAGER)).toBe(true);
    expect(showsReview(review(null), undefined, INSTANCE_OWNER)).toBe(true);
  });
});

describe("reviewBadge", () => {
  it.each(["supervised", "blocked"])(
    "names the status of a submitted offer under %s",
    (level) => {
      expect(reviewBadge(review("pending"), level).color).toBe("warning");
      expect(reviewBadge(review("rejected"), level).color).toBe("error");
      expect(reviewBadge(review("approved"), level).color).toBe("success");
      expect(reviewBadge(review(null), level)).toBe(null);
    }
  );

  it("keeps free tenants and an unknown level quiet", () => {
    expect(reviewBadge(review("pending"), "free")).toBe(null);
    expect(reviewBadge(review("approved"), undefined)).toBe(null);
  });
});

describe("publicationWishHintKey", () => {
  it("warns that the wish alone does not publish under supervised and blocked", () => {
    expect(publicationWishHintKey("supervised")).toBe(
      "supervision.review.wish-hint.supervised"
    );
    expect(publicationWishHintKey("blocked")).toBe(
      "supervision.review.wish-hint.blocked"
    );
  });

  it("says nothing for free or an unknown level", () => {
    expect(publicationWishHintKey("free")).toBe(null);
    expect(publicationWishHintKey(undefined)).toBe(null);
  });
});
