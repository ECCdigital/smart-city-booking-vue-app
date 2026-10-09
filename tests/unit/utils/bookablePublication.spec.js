import { describe, expect, it } from "vitest";
import i18n from "@/language/index";
import {
  publicationEffectKey,
  publicationOutcome,
  submitsOnSave,
} from "@/utils/bookablePublication";

const EFFECT = "bookable.publication.effect";

const publication = (isBookable, isPublic, status = null) => ({
  isBookable,
  isPublic,
  review: status ? { status } : null,
});

describe("publicationEffectKey", () => {
  // The four combinations of „Buchbar“ and „Im Katalog listen“, where no
  // review stands in the way.
  it.each([
    [true, true, "listed"],
    [true, false, "direct-link"],
    [false, true, "listed-not-bookable"],
    [false, false, "hidden"],
  ])(
    "reads Buchbar %s and Im Katalog %s of a free tenant as %s",
    (isBookable, isPublic, effect) => {
      expect(
        publicationEffectKey(publication(isBookable, isPublic), "free")
      ).toBe(`${EFFECT}.${effect}`);
    }
  );

  it("reads an unknown level as free, as the flow words it", () => {
    expect(publicationEffectKey(publication(true, true), null)).toBe(
      `${EFFECT}.listed`
    );
    expect(publicationEffectKey(publication(true, false), "whatever")).toBe(
      `${EFFECT}.direct-link`
    );
  });

  it("ignores a review left over from a supervised time under a free tenant", () => {
    expect(
      publicationEffectKey(publication(true, true, "rejected"), "free")
    ).toBe(`${EFFECT}.listed`);
  });

  it.each([
    [true, true, "listed"],
    [true, false, "direct-link"],
    [false, true, "listed-not-bookable"],
    [false, false, "hidden"],
  ])(
    "reads Buchbar %s and Im Katalog %s of an approved offer under supervision as %s",
    (isBookable, isPublic, effect) => {
      expect(
        publicationEffectKey(
          publication(isBookable, isPublic, "approved"),
          "supervised"
        )
      ).toBe(`${EFFECT}.${effect}`);
    }
  );

  // Saving submits the wish (`submitsOnSave`), or the review runs already.
  it.each([
    [null, true, true, "listed"],
    [null, false, true, "listed-not-bookable"],
    ["pending", true, true, "listed"],
    ["pending", true, false, "direct-link"],
    ["pending", false, true, "listed-not-bookable"],
  ])(
    "says under supervision with review %s what follows after the approval (Buchbar %s, Im Katalog %s)",
    (status, isBookable, isPublic, effect) => {
      expect(
        publicationEffectKey(
          publication(isBookable, isPublic, status),
          "supervised"
        )
      ).toBe(`${EFFECT}.after-approval.${effect}`);
    }
  );

  // Without the wish saving submits nothing: no approval comes to promise.
  it("says under supervision without a review or the wish that nothing is submitted", () => {
    expect(publicationEffectKey(publication(true, false), "supervised")).toBe(
      `${EFFECT}.unsubmitted`
    );
  });

  // A rejected offer keeps its status on save; nothing is submitted again.
  it.each([
    [true, true],
    [true, false],
    [false, true],
  ])(
    "says under supervision that a rejected offer is not reachable (Buchbar %s, Im Katalog %s)",
    (isBookable, isPublic) => {
      expect(
        publicationEffectKey(
          publication(isBookable, isPublic, "rejected"),
          "supervised"
        )
      ).toBe(`${EFFECT}.rejected`);
    }
  );

  it.each(["supervised", "pending", "declined"])(
    "needs no approval to say that nothing is reachable under %s with both switches off",
    (level) => {
      expect(publicationEffectKey(publication(false, false), level)).toBe(
        `${EFFECT}.hidden`
      );
    }
  );

  it.each(["pending", "declined"])(
    "names the tenant's level %s that keeps everything back, approved or not",
    (level) => {
      expect(publicationEffectKey(publication(true, true), level)).toBe(
        `${EFFECT}.${level}`
      );
      expect(
        publicationEffectKey(publication(true, false, "approved"), level)
      ).toBe(`${EFFECT}.${level}`);
    }
  );

  it("reads only `true` as on", () => {
    expect(
      publicationEffectKey({ isBookable: undefined, isPublic: "yes" }, "free")
    ).toBe(`${EFFECT}.hidden`);
  });

  it("has a German text for every effect", () => {
    const keys = [null, "pending", "approved", "rejected"].flatMap((status) =>
      [true, false].flatMap((isBookable) =>
        [true, false].flatMap((isPublic) =>
          ["free", "supervised", "pending", "declined"].map((level) =>
            publicationEffectKey(
              publication(isBookable, isPublic, status),
              level
            )
          )
        )
      )
    );
    keys.forEach((key) => expect(i18n.te(key, "de")).toBe(true));
  });
});

describe("submitsOnSave", () => {
  // The backend submits an offer without a Prüfstatus on its first
  // Veröffentlichungswunsch, whatever the level; only a supervised tenant
  // reads about it.
  it.each(["supervised", "pending", "declined"])(
    "says under %s that saving the wish without a review submits it",
    (level) => {
      expect(submitsOnSave(publication(false, true), level)).toBe(true);
      expect(submitsOnSave({ isPublic: true }, level)).toBe(true);
      expect(submitsOnSave(publication(true, true, "unknown"), level)).toBe(
        true
      );
    }
  );

  it("says nothing once there is a review", () => {
    ["pending", "approved", "rejected"].forEach((status) =>
      expect(submitsOnSave(publication(true, true, status), "supervised")).toBe(
        false
      )
    );
  });

  it("says nothing without the wish, since saving then submits nothing", () => {
    expect(submitsOnSave(publication(true, false), "supervised")).toBe(false);
  });

  it("says nothing to a free tenant or while the level is unknown", () => {
    expect(submitsOnSave(publication(true, true), "free")).toBe(false);
    expect(submitsOnSave(publication(true, true), null)).toBe(false);
  });
});

describe("publicationOutcome", () => {
  const saved = (isBookable, isPublic, status = null) => ({
    isBookable,
    isPublic,
    review: status ? { status } : null,
  });

  it.each([
    [true, true, "published"],
    [true, false, "direct-link"],
    [false, true, "listed-not-bookable"],
    [false, false, "draft"],
  ])(
    "reads a new bookable of a free tenant saved Buchbar %s and Im Katalog %s as %s",
    (isBookable, isPublic, outcome) => {
      expect(
        publicationOutcome(saved(isBookable, isPublic), null, "free")
      ).toBe(outcome);
    }
  );

  it("reads an unknown level as free", () => {
    expect(publicationOutcome(saved(true, false), null, null)).toBe(
      "direct-link"
    );
  });

  it("reads an existing bookable whose switches stayed as kept", () => {
    expect(
      publicationOutcome(saved(true, true), saved(true, true), "free")
    ).toBe("kept");
    expect(
      publicationOutcome(saved(true, false), saved(true, false), "free")
    ).toBe("kept");
    expect(
      publicationOutcome(saved(false, false), { isBookable: false }, "free")
    ).toBe("kept");
  });

  it("reads an existing bookable whose switches changed by what it is now", () => {
    expect(
      publicationOutcome(saved(true, true), saved(false, false), "free")
    ).toBe("published");
    expect(
      publicationOutcome(saved(false, false), saved(true, true), "free")
    ).toBe("draft");
  });

  // The backend answers the save with the review it started.
  it("reads a save that submitted the offer under supervision as submitted", () => {
    expect(
      publicationOutcome(saved(false, true, "pending"), null, "supervised")
    ).toBe("submitted");
    expect(
      publicationOutcome(
        saved(true, true, "pending"),
        saved(true, true),
        "supervised"
      )
    ).toBe("submitted");
  });

  it("reads an approved offer switched on under supervision as published", () => {
    expect(
      publicationOutcome(
        saved(true, true, "approved"),
        saved(false, false, "approved"),
        "supervised"
      )
    ).toBe("published");
  });

  it("reads an offer in review whose switches changed as in review", () => {
    expect(
      publicationOutcome(
        saved(true, true, "pending"),
        saved(false, true, "pending"),
        "supervised"
      )
    ).toBe("in-review");
  });

  it("reads an offer without approval or submission under supervision as a draft", () => {
    expect(publicationOutcome(saved(true, false), null, "supervised")).toBe(
      "draft"
    );
    expect(
      publicationOutcome(
        saved(true, true, "rejected"),
        saved(false, true, "rejected"),
        "supervised"
      )
    ).toBe("draft");
  });

  it.each(["pending", "declined"])(
    "reads the wish of a tenant whose level is %s as noted",
    (level) => {
      expect(publicationOutcome(saved(true, true), null, level)).toBe("noted");
      expect(publicationOutcome(saved(true, false), null, level)).toBe("draft");
    }
  );
});
