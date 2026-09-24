import { describe, expect, it } from "vitest";
import i18n from "@/language/index";
import {
  INITIAL_SUPERVISION_LEVELS,
  OFFER_TYPES,
  PUBLIC_SUPERVISION_LEVELS,
  REVIEW_STATUS,
  SUPERVISION_LEVELS,
  SUPERVISION_LEVEL_VALUES,
  effectiveLevel,
  historyActorLabelKey,
  historyEventLabelKey,
  historyStateLabelKey,
  knownReviewStatus,
  levelColor,
  levelLabelKey,
  offerTypeLabelKey,
  reviewStatusColor,
  reviewStatusLabelKey,
  selectableLevels,
} from "@/utils/supervision";

describe("supervision levels", () => {
  it("names the four levels of the backend", () => {
    expect(SUPERVISION_LEVEL_VALUES).toEqual([
      "free",
      "supervised",
      "pending",
      "declined",
    ]);
  });

  it("starts a self-created tenant at any level but declined", () => {
    expect(INITIAL_SUPERVISION_LEVELS).toEqual([
      "free",
      "supervised",
      "pending",
    ]);
  });

  it("projects only a free or supervised tenant to the public", () => {
    expect(PUBLIC_SUPERVISION_LEVELS).toEqual(["free", "supervised"]);
  });

  it("reads a tenant without a stored level as free", () => {
    expect(effectiveLevel({ supervisionLevel: "pending" })).toBe("pending");
    expect(effectiveLevel({ supervisionLevel: "declined" })).toBe("declined");
    expect(effectiveLevel({})).toBe("free");
    expect(effectiveLevel({ supervisionLevel: null })).toBe("free");
    expect(effectiveLevel(null)).toBe("free");
  });

  it("never reads an unknown stored level as free", () => {
    expect(effectiveLevel({ supervisionLevel: "locked" })).toBe("locked");
  });

  it("labels every level in German", () => {
    expect(i18n.t(levelLabelKey("free"))).toBe("frei");
    expect(i18n.t(levelLabelKey("supervised"))).toBe("beaufsichtigt");
    expect(i18n.t(levelLabelKey("pending"))).toBe("Freigabe ausstehend");
    expect(i18n.t(levelLabelKey("declined"))).toBe("abgewiesen");
    expect(i18n.t(levelLabelKey(undefined))).toBe("frei");
  });

  it("has no label key for a level it does not know: the caller shows the raw value", () => {
    expect(levelLabelKey("locked")).toBeNull();
  });

  it("colours the chip by level", () => {
    expect(levelColor("free")).toBe("success");
    expect(levelColor("supervised")).toBe("warning");
    expect(levelColor("pending")).toBe("warning");
    expect(levelColor("declined")).toBe("error");
    expect(levelColor(undefined)).toBe("success");
  });

  it("colours a level it does not know neutrally", () => {
    expect(levelColor("locked")).toBe("grey");
    expect(levelColor("constructor")).toBe("grey");
  });

  it("offers every level but the effective one for a change", () => {
    expect(selectableLevels("supervised")).toEqual(["free", "pending"]);
    expect(selectableLevels(undefined)).toEqual(["supervised", "pending"]);
  });

  it("never offers declined as the target of a change", () => {
    expect(selectableLevels("pending")).toEqual(["free", "supervised"]);
    expect(selectableLevels("declined")).toEqual([
      "free",
      "supervised",
      "pending",
    ]);
  });

  it("offers every regular level while the effective one is unknown", () => {
    expect(selectableLevels("locked")).toEqual([
      "free",
      "supervised",
      "pending",
    ]);
  });
});

describe("review statuses", () => {
  it("labels every status, and none, in German", () => {
    expect(i18n.t(reviewStatusLabelKey(REVIEW_STATUS.PENDING))).toBe(
      "ausstehend"
    );
    expect(i18n.t(reviewStatusLabelKey(REVIEW_STATUS.APPROVED))).toBe(
      "freigegeben"
    );
    expect(i18n.t(reviewStatusLabelKey(REVIEW_STATUS.REJECTED))).toBe(
      "abgelehnt"
    );
    expect(i18n.t(reviewStatusLabelKey(null))).toBe("kein Prüfstatus");
  });

  it("colours the chip by status", () => {
    expect(reviewStatusColor("pending")).toBe("warning");
    expect(reviewStatusColor("approved")).toBe("success");
    expect(reviewStatusColor("rejected")).toBe("error");
    expect(reviewStatusColor(null)).toBe("grey");
  });
});

describe("supervision history", () => {
  it("labels every event type of the backend in German", () => {
    const labels = [
      "tenant.created",
      "tenant.levelInitialized",
      "tenant.levelChanged",
      "review.submitted",
      "review.approved",
      "review.rejected",
      "review.withdrawn",
    ].map((eventType) => i18n.t(historyEventLabelKey(eventType)));

    expect(labels).toEqual([
      "Mandant angelegt",
      "Aufsichtsstufe übernommen",
      "Aufsichtsstufe geändert",
      "Zur Prüfung eingereicht",
      "Freigegeben",
      "Abgelehnt",
      "Freigabe zurückgezogen",
    ]);
  });

  it("falls back to a neutral label for an unknown event type", () => {
    expect(i18n.t(historyEventLabelKey("review.escalated"))).toBe("Ereignis");
  });

  it("reads the states of a level event as levels, of a review event as statuses", () => {
    expect(
      i18n.t(historyStateLabelKey("tenant.levelChanged", "supervised"))
    ).toBe("beaufsichtigt");
    expect(i18n.t(historyStateLabelKey("review.approved", "approved"))).toBe(
      "freigegeben"
    );
    expect(i18n.t(historyStateLabelKey("review.submitted", null))).toBe(
      "kein Prüfstatus"
    );
  });

  it("has no state label where a level event names none", () => {
    expect(historyStateLabelKey("tenant.created", null)).toBeNull();
  });

  it("names the migration and the system where no user acted", () => {
    expect(
      i18n.t(
        historyActorLabelKey({ origin: "migration", actor: { type: "system" } })
      )
    ).toBe("Migration");
    expect(
      i18n.t(historyActorLabelKey({ origin: "api", actor: { type: "system" } }))
    ).toBe("System");
    expect(
      historyActorLabelKey({
        origin: "api",
        actor: { type: "user", userId: "u-1" },
      })
    ).toBeNull();
  });

  it("keeps the level constants the onboarding already uses", () => {
    expect(SUPERVISION_LEVELS).toEqual({
      FREE: "free",
      SUPERVISED: "supervised",
      PENDING: "pending",
      DECLINED: "declined",
    });
  });
});

describe("offer types", () => {
  it("labels the two offer types in German", () => {
    expect(i18n.t(offerTypeLabelKey(OFFER_TYPES.BOOKABLE))).toBe(
      "Buchungsobjekt"
    );
    expect(i18n.t(offerTypeLabelKey(OFFER_TYPES.EVENT))).toBe("Veranstaltung");
  });

  it("has no label key for a type it does not know", () => {
    expect(offerTypeLabelKey("ticket")).toBeNull();
    expect(offerTypeLabelKey(undefined)).toBeNull();
  });
});

describe("knownReviewStatus", () => {
  it("reads a missing or unknown status as none", () => {
    expect(knownReviewStatus("pending")).toBe("pending");
    expect(knownReviewStatus("approved")).toBe("approved");
    expect(knownReviewStatus("rejected")).toBe("rejected");
    expect(knownReviewStatus("draft")).toBeNull();
    expect(knownReviewStatus(undefined)).toBeNull();
  });
});
