import { describe, expect, it } from "vitest";
import {
  heroBlock,
  heroImageBlock,
  heroRichtextBlock,
} from "@tests/unit/support/heroLayout";
import {
  HERO_PREVIEW_VIEWPORTS,
  heroPreviewWarningCount,
  heroPreviewWarningSummary,
  heroPreviewWarningTexts,
  isCurrentHeroPreviewReport,
  noHeroPreviewReports,
} from "@/utils/heroPreviewReport";

/** A report as a frame sends it, without the protocol envelope. */
function report(overrides = {}) {
  return { draftId: 1, viewport: "desktop", warnings: [], ...overrides };
}

function outside(id) {
  return { code: "outside-content-area", blockIds: [id] };
}

function overlap(a, b) {
  return { code: "overlap", blockIds: [a, b] };
}

/** The two reports of one Draft, as the two frames answer it. */
function reports({ desktop = null, mobile = null } = {}) {
  return { desktop, mobile };
}

describe("noHeroPreviewReports", () => {
  it("knows the two frames and nothing about either", () => {
    expect(noHeroPreviewReports()).toEqual({ desktop: null, mobile: null });
    expect(HERO_PREVIEW_VIEWPORTS).toEqual(["desktop", "mobile"]);
  });

  it("answers a new object, so two editors never share one", () => {
    expect(noHeroPreviewReports()).not.toBe(noHeroPreviewReports());
  });
});

describe("isCurrentHeroPreviewReport", () => {
  it("takes a report of the Draft that is showing", () => {
    expect(isCurrentHeroPreviewReport(report({ draftId: 7 }), 7)).toBe(true);
  });

  it("discards a report of a Draft that has been superseded", () => {
    expect(isCurrentHeroPreviewReport(report({ draftId: 6 }), 7)).toBe(false);
  });

  it("discards a report while no Draft has been resolved", () => {
    expect(isCurrentHeroPreviewReport(report({ draftId: 1 }), null)).toBe(
      false
    );
  });

  it("discards a report about a frame that is not one of the two", () => {
    expect(isCurrentHeroPreviewReport(report({ viewport: "watch" }), 1)).toBe(
      false
    );
  });
});

describe("heroPreviewWarningTexts", () => {
  const title = heroBlock({ id: "title", text: { de: "Willkommen" } });
  const subtitle = heroBlock({ id: "subtitle", text: { de: "Untertitel" } });
  const blocks = [title, subtitle];

  it("says nothing while no frame has reported", () => {
    expect(heroPreviewWarningTexts(noHeroPreviewReports(), blocks)).toEqual({});
  });

  it("names the desktop frame for a Block that leaves the Hero", () => {
    const texts = heroPreviewWarningTexts(
      reports({ desktop: report({ warnings: [outside("title")] }) }),
      blocks
    );

    expect(texts).toEqual({
      title: ["Ragt auf dem Desktop aus dem Kopfbereich heraus"],
    });
  });

  it("says a Block is cut off when the mobile frame reports it", () => {
    const texts = heroPreviewWarningTexts(
      reports({
        mobile: report({ viewport: "mobile", warnings: [outside("title")] }),
      }),
      blocks
    );

    expect(texts).toEqual({ title: ["Wird auf Mobilgeräten abgeschnitten"] });
  });

  it("gives both Blocks of an overlap a badge naming the other one", () => {
    const texts = heroPreviewWarningTexts(
      reports({
        desktop: report({ warnings: [overlap("title", "subtitle")] }),
      }),
      blocks
    );

    expect(texts).toEqual({
      title: ["Überlappt auf dem Desktop mit ‚Untertitel‘"],
      subtitle: ["Überlappt auf dem Desktop mit ‚Willkommen‘"],
    });
  });

  it("names an image Block by its alt text and a rich text by its first line", () => {
    const image = heroImageBlock({ id: "logo", alt: { de: "Das Logo" } });
    const prose = heroRichtextBlock({
      id: "prose",
      html: { de: "<p>Ein Absatz</p><p>und noch einer</p>" },
    });

    const texts = heroPreviewWarningTexts(
      reports({ desktop: report({ warnings: [overlap("logo", "prose")] }) }),
      [image, prose]
    );

    expect(texts.logo).toEqual(["Überlappt auf dem Desktop mit ‚Ein Absatz‘"]);
    expect(texts.prose).toEqual(["Überlappt auf dem Desktop mit ‚Das Logo‘"]);
  });

  it("falls back to the type of a Block that has no content yet", () => {
    const empty = heroBlock({ id: "fresh", text: { de: "" } });

    const texts = heroPreviewWarningTexts(
      reports({ desktop: report({ warnings: [overlap("title", "fresh")] }) }),
      [title, empty]
    );

    expect(texts.title).toEqual(["Überlappt auf dem Desktop mit ‚Text‘"]);
  });

  it("collects what both frames say about the same Block", () => {
    const texts = heroPreviewWarningTexts(
      reports({
        desktop: report({ warnings: [outside("title")] }),
        mobile: report({ viewport: "mobile", warnings: [outside("title")] }),
      }),
      blocks
    );

    expect(texts.title).toEqual([
      "Ragt auf dem Desktop aus dem Kopfbereich heraus",
      "Wird auf Mobilgeräten abgeschnitten",
    ]);
  });

  it("says the same thing once, however often a frame reports it", () => {
    const texts = heroPreviewWarningTexts(
      reports({
        desktop: report({ warnings: [outside("title"), outside("title")] }),
      }),
      blocks
    );

    expect(texts.title).toHaveLength(1);
  });

  it("has nothing to say about an overlap a mobile frame claims", () => {
    // The storefront measures overlaps on the desktop frame only: the rows
    // stack on mobile, so where a Block lands is not the author’s choice.
    const texts = heroPreviewWarningTexts(
      reports({
        mobile: report({
          viewport: "mobile",
          warnings: [overlap("title", "subtitle")],
        }),
      }),
      blocks
    );

    expect(texts).toEqual({});
  });

  it("ignores a warning code this editor version has no wording for", () => {
    const texts = heroPreviewWarningTexts(
      reports({
        desktop: report({
          warnings: [{ code: "too-loud", blockIds: ["title"] }],
        }),
      }),
      blocks
    );

    expect(texts).toEqual({});
  });
});

describe("heroPreviewWarningSummary", () => {
  it("counts the warnings of one frame", () => {
    expect(
      heroPreviewWarningSummary(
        report({ warnings: [outside("a"), overlap("a", "b")] })
      )
    ).toBe("2 Hinweise");
  });

  it("says so when a frame is clean", () => {
    expect(heroPreviewWarningSummary(report())).toBe("0 Hinweise");
  });

  it("keeps the singular for a single warning", () => {
    expect(
      heroPreviewWarningSummary(report({ warnings: [outside("a")] }))
    ).toBe("1 Hinweis");
  });

  it("says nothing about a frame that has not reported yet", () => {
    expect(heroPreviewWarningSummary(null)).toBe("");
  });
});

describe("heroPreviewWarningCount", () => {
  it("counts what a frame reported", () => {
    expect(heroPreviewWarningCount(report({ warnings: [outside("a")] }))).toBe(
      1
    );
  });

  it("counts nothing for a frame that has not reported", () => {
    expect(heroPreviewWarningCount(null)).toBe(0);
  });
});
