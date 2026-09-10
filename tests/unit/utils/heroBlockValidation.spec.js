import { describe, expect, it } from "vitest";
import {
  HERO_TEXT_MAX_LENGTH,
  heroBlockIssues,
  heroHexRules,
  heroTextRules,
  invalidHeroBlockIds,
  isHeroBlockValid,
  isHeroColor,
  isHeroHexColor,
} from "@/utils/heroBlockValidation";
import { heroBlock } from "@tests/unit/support/heroLayout";

function tooLong() {
  return "a".repeat(HERO_TEXT_MAX_LENGTH + 1);
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

describe("heroBlockIssues of the types ticket 07 brings", () => {
  it("finds nothing wrong with a rich-text or an image Block yet", () => {
    expect(heroBlockIssues(heroBlock({ type: "richtext", html: {} }))).toEqual(
      []
    );
    expect(heroBlockIssues(heroBlock({ type: "image", image: null }))).toEqual(
      []
    );
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
