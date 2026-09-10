import { describe, expect, it } from "vitest";
import {
  HERO_RICHTEXT_MAX_LENGTH,
  HERO_TEXT_MAX_LENGTH,
  heroBlockIssues,
  heroHexRules,
  heroImageRules,
  heroRichtextRules,
  heroTextRules,
  invalidHeroBlockIds,
  isHeroBlockValid,
  isHeroColor,
  isHeroHexColor,
} from "@/utils/heroBlockValidation";
import {
  heroBlock,
  heroImageBlock,
  heroRichtextBlock,
} from "@tests/unit/support/heroLayout";

function tooLong() {
  return "a".repeat(HERO_TEXT_MAX_LENGTH + 1);
}

/** A rich text whose HTML is one character past the 10 000 of the contract. */
function tooMuchHtml() {
  return `<p>${"a".repeat(HERO_RICHTEXT_MAX_LENGTH - 6)}</p>`;
}

/** What a rule answers a value: `true`, or the message it fails with. */
function apply(rules, value) {
  return rules.map((rule) => rule(value)).find((answer) => answer !== true);
}

describe("isHeroHexColor", () => {
  it("takes six digits with a hash", () => {
    expect(isHeroHexColor("#1a2b3c")).toBe(true);
    expect(isHeroHexColor("#ABCDEF")).toBe(true);
  });

  it("refuses shorthand, alpha and anything without a hash", () => {
    expect(isHeroHexColor("#abc")).toBe(false);
    expect(isHeroHexColor("#1a2b3c80")).toBe(false);
    expect(isHeroHexColor("1a2b3c")).toBe(false);
    expect(isHeroHexColor("")).toBe(false);
    expect(isHeroHexColor(null)).toBe(false);
  });
});

describe("isHeroColor", () => {
  it("takes the four named tokens", () => {
    for (const token of ["default", "primary", "secondary", "white"]) {
      expect(isHeroColor(token)).toBe(true);
    }
  });

  it("takes a hex value and refuses anything else", () => {
    expect(isHeroColor("#001122")).toBe(true);
    expect(isHeroColor("accent")).toBe(false);
    expect(isHeroColor(undefined)).toBe(false);
  });
});

describe("heroBlockIssues of a text Block", () => {
  it("finds nothing wrong with a filled Block", () => {
    expect(heroBlockIssues(heroBlock())).toEqual([]);
    expect(isHeroBlockValid(heroBlock())).toBe(true);
  });

  it("names the missing German text", () => {
    const block = heroBlock({ text: { de: "   ", en: "Welcome" } });

    expect(heroBlockIssues(block)).toEqual(["Der Text auf Deutsch fehlt."]);
    expect(isHeroBlockValid(block)).toBe(false);
  });

  it("names an over-long text in any locale", () => {
    const german = heroBlock({ text: { de: tooLong() } });
    const english = heroBlock({ text: { de: "Kurz", en: tooLong() } });
    const message = `Der Text ist länger als ${HERO_TEXT_MAX_LENGTH} Zeichen.`;

    expect(heroBlockIssues(german)).toContain(message);
    expect(heroBlockIssues(english)).toEqual([message]);
  });

  it("names a custom colour that is not a hex value", () => {
    const block = heroBlock({ color: "#12345" });

    expect(heroBlockIssues(block)).toEqual([
      "Die Farbe ist kein gültiger Hex-Wert.",
    ]);
  });
});

describe("heroBlockIssues of a rich-text Block", () => {
  it("finds nothing wrong with a filled Block", () => {
    expect(heroBlockIssues(heroRichtextBlock())).toEqual([]);
  });

  it("names the missing German text", () => {
    expect(heroBlockIssues(heroRichtextBlock({ html: {} }))).toEqual([
      "Der Text auf Deutsch fehlt.",
    ]);
  });

  it("reads markup without text in it as empty", () => {
    // What an emptied TipTap answers, and what an author sees as nothing.
    expect(
      heroBlockIssues(heroRichtextBlock({ html: { de: "<p></p>" } }))
    ).toEqual(["Der Text auf Deutsch fehlt."]);
  });

  it("names an over-long rich text in any locale", () => {
    const message = "Der Text ist länger als 10000 Zeichen.";

    expect(
      heroBlockIssues(heroRichtextBlock({ html: { de: tooMuchHtml() } }))
    ).toContain(message);
    expect(
      heroBlockIssues(
        heroRichtextBlock({ html: { de: "<p>Kurz</p>", en: tooMuchHtml() } })
      )
    ).toEqual([message]);
  });

  it("names a custom colour that is not a hex value", () => {
    expect(heroBlockIssues(heroRichtextBlock({ color: "#12345" }))).toEqual([
      "Die Farbe ist kein gültiger Hex-Wert.",
    ]);
  });
});

describe("heroBlockIssues of an image Block", () => {
  it("finds nothing wrong with a filled Block", () => {
    expect(heroBlockIssues(heroImageBlock())).toEqual([]);
  });

  it("names the missing image", () => {
    expect(heroBlockIssues(heroImageBlock({ image: null }))).toEqual([
      "Es ist kein Bild aus der Mediathek ausgewählt.",
    ]);
  });

  it("refuses an address outside the Mediathek, which the contract rejects", () => {
    const block = heroImageBlock({
      image: { source: "external", url: "https://example.org/logo.png" },
    });

    expect(heroBlockIssues(block)).toEqual([
      "Es ist kein Bild aus der Mediathek ausgewählt.",
    ]);
  });

  it("takes a reference the export enriched with url and size", () => {
    const block = heroImageBlock({
      image: {
        source: "media",
        mediaId: "m1",
        url: "/api/v2/instance/media/m1/file",
        width: 800,
        height: 200,
      },
    });

    expect(heroBlockIssues(block)).toEqual([]);
  });

  it("names the missing and the over-long alt text", () => {
    expect(heroBlockIssues(heroImageBlock({ alt: { de: "  " } }))).toEqual([
      "Der Alternativtext auf Deutsch fehlt.",
    ]);
    expect(
      heroBlockIssues(heroImageBlock({ alt: { de: "Logo", en: tooLong() } }))
    ).toEqual([
      `Der Alternativtext ist länger als ${HERO_TEXT_MAX_LENGTH} Zeichen.`,
    ]);
  });
});

describe("invalidHeroBlockIds", () => {
  it("names every Block the save would be refused for", () => {
    const blocks = [
      heroBlock({ id: "a" }),
      heroBlock({ id: "b", text: { de: "" } }),
      heroBlock({ id: "c", color: "#nope" }),
    ];

    expect(invalidHeroBlockIds(blocks)).toEqual(["b", "c"]);
  });

  it("takes an empty layout", () => {
    expect(invalidHeroBlockIds([])).toEqual([]);
    expect(invalidHeroBlockIds(null)).toEqual([]);
  });
});

describe("heroTextRules", () => {
  it("requires the German text and refuses an over-long one", () => {
    const rules = heroTextRules("de");

    expect(apply(rules, "Willkommen")).toBeUndefined();
    expect(apply(rules, "  ")).toBe("Pflichtfeld");
    expect(apply(rules, tooLong())).toBe(
      `Höchstens ${HERO_TEXT_MAX_LENGTH} Zeichen.`
    );
  });

  it("lets the English text stay empty but not grow past the limit", () => {
    const rules = heroTextRules("en");

    expect(apply(rules, "")).toBeUndefined();
    expect(apply(rules, tooLong())).toBe(
      `Höchstens ${HERO_TEXT_MAX_LENGTH} Zeichen.`
    );
  });
});

describe("heroRichtextRules", () => {
  it("requires text in the German markup and caps the HTML at 10 000", () => {
    const rules = heroRichtextRules("de");

    expect(apply(rules, "<p>Willkommen</p>")).toBeUndefined();
    expect(apply(rules, "<p></p>")).toBe("Pflichtfeld");
    expect(apply(rules, tooMuchHtml())).toBe("Höchstens 10000 Zeichen.");
  });

  it("lets the English rich text stay empty", () => {
    expect(apply(heroRichtextRules("en"), "")).toBeUndefined();
  });
});

describe("heroImageRules", () => {
  it("takes a reference to a medium and refuses everything else", () => {
    const message = "Bitte ein Bild aus der Mediathek wählen.";

    expect(
      apply(heroImageRules, { source: "media", mediaId: "m1" })
    ).toBeUndefined();
    expect(apply(heroImageRules, null)).toBe(message);
    expect(
      apply(heroImageRules, { source: "external", url: "https://e.org/a.png" })
    ).toBe(message);
  });
});

describe("heroHexRules", () => {
  it("takes a six-digit hex and refuses the rest", () => {
    expect(apply(heroHexRules, "#1a2b3c")).toBeUndefined();
    expect(apply(heroHexRules, "rot")).toBe(
      "Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c."
    );
  });
});

describe("heroBlockIssues and an absent colour", () => {
  it("takes a Block without a colour, which the backend fills with the default", () => {
    const block = heroBlock();
    delete block.color;

    expect(heroBlockIssues(block)).toEqual([]);
  });
});
