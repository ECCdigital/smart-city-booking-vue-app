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

  it.each([null, "pending", "rejected"])(
    "says under supervision with review %s what follows after the approval",
    (status) => {
      expect(
        publicationEffectKey(publication(true, true, status), "supervised")
      ).toBe(`${EFFECT}.after-approval.listed`);
      expect(
        publicationEffectKey(publication(true, false, status), "supervised")
      ).toBe(`${EFFECT}.after-approval.direct-link`);
      expect(
        publicationEffectKey(publication(false, true, status), "supervised")
      ).toBe(`${EFFECT}.after-approval.listed-not-bookable`);
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
    const keys = [
      ...[true, false].flatMap((isBookable) =>
        [true, false].flatMap((isPublic) =>
          ["free", "supervised", "pending", "declined"].map((level) =>
            publicationEffectKey(publication(isBookable, isPublic), level)
          )
        )
      ),
    ];
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
  const saved = (isBookable, isPublic) => ({ isBookable, isPublic });

  it("reads a new bookable saved Buchbar and Im Katalog as published, else as a draft", () => {
    expect(publicationOutcome(saved(true, true), null)).toBe("published");
    expect(publicationOutcome(saved(true, false), null)).toBe("draft");
    expect(publicationOutcome(saved(false, true), null)).toBe("draft");
    expect(publicationOutcome(saved(false, false), null)).toBe("draft");
  });

  it("reads an existing bookable whose switches stayed as kept", () => {
    expect(publicationOutcome(saved(true, true), saved(true, true))).toBe(
      "kept"
    );
    expect(publicationOutcome(saved(true, false), saved(true, false))).toBe(
      "kept"
    );
    expect(publicationOutcome(saved(false, false), { isBookable: false })).toBe(
      "kept"
    );
  });

  it("reads an existing bookable whose switches changed by what it is now", () => {
    expect(publicationOutcome(saved(true, true), saved(false, false))).toBe(
      "published"
    );
    expect(publicationOutcome(saved(false, false), saved(true, true))).toBe(
      "draft"
    );
  });
});
