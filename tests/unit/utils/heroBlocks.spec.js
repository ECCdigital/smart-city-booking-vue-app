import { describe, expect, it } from "vitest";
import {
  HERO_ZONES,
  MAX_HERO_BLOCKS,
  canMoveHeroBlock,
  createHeroBlock,
  duplicateHeroBlock,
  heroBlockGroups,
  heroBlockSummary,
  heroBlockType,
  heroBlockZoneCounts,
  heroLocalizedText,
  heroUntranslatedBlockIds,
  insertHeroBlock,
  moveHeroBlock,
  newHeroBlockId,
  removeHeroBlock,
  setHeroBlockZone,
  setHeroLocalizedText,
  sortHeroBlocks,
  updateHeroBlock,
} from "@/utils/heroBlocks";
import { heroBlock } from "@tests/unit/support/heroLayout";

/** A Block that is only its id and its Zone — the two the rules act on. */
function block(id, zone = "middle-center", overrides = {}) {
  return heroBlock({ id, zone, ...overrides });
}

function ids(blocks) {
  return blocks.map((entry) => entry.id);
}

describe("sortHeroBlocks", () => {
  it("orders the Zones from top left to bottom right", () => {
    const blocks = [
      block("c", "bottom-right"),
      block("a", "top-left"),
      block("b", "middle-center"),
    ];

    expect(ids(sortHeroBlocks(blocks))).toEqual(["a", "b", "c"]);
  });

  it("keeps the order inside a Zone", () => {
    const blocks = [
      block("second", "top-left"),
      block("first", "top-left"),
      block("third", "top-left"),
    ];

    expect(ids(sortHeroBlocks(blocks))).toEqual(["second", "first", "third"]);
  });

  it("runs through the nine Zones in the order of the contract", () => {
    const blocks = HERO_ZONES.map((zone, index) => block(`b${index}`, zone));

    expect(ids(sortHeroBlocks(blocks.slice().reverse()))).toEqual(ids(blocks));
  });

  it("keeps a Block whose Zone is not one of the nine, at the end", () => {
    const blocks = [block("odd", "somewhere"), block("a", "top-left")];

    expect(ids(sortHeroBlocks(blocks))).toEqual(["a", "odd"]);
  });

  it("leaves the given array untouched", () => {
    const blocks = [block("b", "bottom-left"), block("a", "top-left")];

    sortHeroBlocks(blocks);

    expect(ids(blocks)).toEqual(["b", "a"]);
  });
});

describe("heroBlockGroups", () => {
  it("hides the Zones without a Block", () => {
    const groups = heroBlockGroups([
      block("a", "middle-left"),
      block("b", "top-left"),
    ]);

    expect(groups.map((group) => group.zone)).toEqual([
      "top-left",
      "middle-left",
    ]);
  });

  it("names the groups the way the spec does", () => {
    const groups = heroBlockGroups([
      block("a", "middle-left"),
      block("b", "bottom-right"),
      block("c", "top-center"),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Oben zentriert",
      "Mitte links",
      "Unten rechts",
    ]);
  });

  it("carries the Blocks of a Zone in canonical order", () => {
    const groups = heroBlockGroups([
      block("second", "top-left"),
      block("elsewhere", "bottom-left"),
      block("first", "top-left"),
    ]);

    expect(ids(groups[0].blocks)).toEqual(["second", "first"]);
  });

  it("has no group at all without Blocks", () => {
    expect(heroBlockGroups([])).toEqual([]);
  });
});

describe("createHeroBlock", () => {
  it("fills every default of a text Block", () => {
    expect(createHeroBlock("text", "top-left", "new")).toEqual({
      id: "new",
      type: "text",
      zone: "top-left",
      outerSpacing: "none",
      innerSpacing: "none",
      width: "auto",
      panel: "none",
      homeOnly: false,
      hideOnMobile: false,
      text: { de: "" },
      size: "md",
      color: "default",
      weight: "normal",
      shadow: false,
    });
  });

  it("fills every default of a rich-text Block", () => {
    expect(createHeroBlock("richtext", "middle-center", "new")).toMatchObject({
      type: "richtext",
      html: { de: "" },
      color: "default",
      shadow: false,
    });
  });

  it("fills every default of an image Block, still without a medium", () => {
    expect(createHeroBlock("image", "middle-right", "new")).toMatchObject({
      type: "image",
      image: null,
      alt: { de: "" },
      maxHeight: "md",
      invertInDarkMode: false,
    });
  });

  it("takes a fresh id when it is given none", () => {
    const first = createHeroBlock("text", "top-left");
    const second = createHeroBlock("text", "top-left");

    expect(first.id).not.toBe(second.id);
  });
});

describe("newHeroBlockId", () => {
  it("is a uuid v4 and passes the id format of the contract", () => {
    const id = newHeroBlockId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });
});

describe("heroBlockType", () => {
  it("names the three types the way the spec does", () => {
    expect(
      ["text", "richtext", "image"].map((type) => heroBlockType(type).label)
    ).toEqual(["Text", "Formatierter Text", "Bild"]);
  });

  it("falls back for a type it does not know", () => {
    expect(heroBlockType("something").label).toBe("Block");
  });
});

describe("heroBlockSummary", () => {
  it("reads the German text of a text Block", () => {
    expect(
      heroBlockSummary(heroBlock({ text: { de: "Willkommen", en: "Welcome" } }))
    ).toBe("Willkommen");
  });

  it("reads the German alt text of an image Block", () => {
    expect(
      heroBlockSummary(
        heroBlock({ type: "image", text: undefined, alt: { de: "Das Logo" } })
      )
    ).toBe("Das Logo");
  });

  it("reads the first line of a rich text without its markup", () => {
    expect(
      heroBlockSummary(
        heroBlock({
          type: "richtext",
          text: undefined,
          html: { de: "<p>Erste <strong>Zeile</strong></p><p>Zweite</p>" },
        })
      )
    ).toBe("Erste Zeile");
  });

  it("resolves the entities a sanitised rich text carries", () => {
    expect(
      heroBlockSummary(
        heroBlock({
          type: "richtext",
          text: undefined,
          html: { de: "<p>Sport &amp; Freizeit</p>" },
        })
      )
    ).toBe("Sport & Freizeit");
  });

  it("is empty while the Block has no German content yet", () => {
    expect(heroBlockSummary(createHeroBlock("text", "top-left", "new"))).toBe(
      ""
    );
    expect(heroBlockSummary(createHeroBlock("image", "top-left", "new"))).toBe(
      ""
    );
  });
});

describe("moveHeroBlock", () => {
  it("moves a Block up inside its group", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("c", "top-left"),
    ];

    expect(ids(moveHeroBlock(blocks, "c", "up"))).toEqual(["a", "c", "b"]);
  });

  it("moves a Block down inside its group", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("c", "top-left"),
    ];

    expect(ids(moveHeroBlock(blocks, "a", "down"))).toEqual(["b", "a", "c"]);
  });

  it("never leaves the group — the Blocks of other Zones stay where they are", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("elsewhere", "bottom-right"),
    ];

    const moved = moveHeroBlock(blocks, "b", "down");

    expect(ids(moved)).toEqual(["a", "b", "elsewhere"]);
    expect(moved[1].zone).toBe("top-left");
  });

  it("does nothing at the edges of the group", () => {
    const blocks = [block("a", "top-left"), block("b", "top-left")];

    expect(ids(moveHeroBlock(blocks, "a", "up"))).toEqual(["a", "b"]);
    expect(ids(moveHeroBlock(blocks, "b", "down"))).toEqual(["a", "b"]);
  });

  it("answers an unknown id with the canonical order", () => {
    const blocks = [block("b", "bottom-left"), block("a", "top-left")];

    expect(ids(moveHeroBlock(blocks, "gone", "up"))).toEqual(["a", "b"]);
  });
});

describe("canMoveHeroBlock", () => {
  it("says no at the edges of the group and yes in between", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("c", "top-left"),
    ];

    expect(canMoveHeroBlock(blocks, "a", "up")).toBe(false);
    expect(canMoveHeroBlock(blocks, "a", "down")).toBe(true);
    expect(canMoveHeroBlock(blocks, "b", "up")).toBe(true);
    expect(canMoveHeroBlock(blocks, "c", "down")).toBe(false);
  });

  it("counts only the Blocks of the same Zone", () => {
    const blocks = [block("alone", "top-left"), block("other", "middle-right")];

    expect(canMoveHeroBlock(blocks, "alone", "down")).toBe(false);
  });

  it("says no for an unknown id", () => {
    expect(canMoveHeroBlock([block("a")], "gone", "up")).toBe(false);
  });
});

describe("setHeroBlockZone", () => {
  it("sets the Zone and drops the Block at the given position", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("moved", "bottom-right"),
    ];

    const next = setHeroBlockZone(blocks, "moved", "top-left", 1);

    expect(ids(next)).toEqual(["a", "moved", "b"]);
    expect(next[1].zone).toBe("top-left");
  });

  it("appends without a position", () => {
    const blocks = [block("a", "top-left"), block("moved", "bottom-right")];

    expect(ids(setHeroBlockZone(blocks, "moved", "top-left"))).toEqual([
      "a",
      "moved",
    ]);
  });

  it("reorders inside the Zone the Block already sits in", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("c", "top-left"),
    ];

    expect(ids(setHeroBlockZone(blocks, "c", "top-left", 0))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("clamps a position past the end of the group", () => {
    const blocks = [block("a", "top-left"), block("moved", "bottom-right")];

    expect(ids(setHeroBlockZone(blocks, "moved", "top-left", 9))).toEqual([
      "a",
      "moved",
    ]);
  });

  it("rewrites the whole array in canonical order", () => {
    const blocks = [
      block("late", "bottom-left"),
      block("early", "top-right"),
      block("moved", "bottom-left"),
    ];

    expect(ids(setHeroBlockZone(blocks, "moved", "middle-center", 0))).toEqual([
      "early",
      "moved",
      "late",
    ]);
  });

  it("leaves the given array untouched", () => {
    const blocks = [block("a", "top-left"), block("moved", "bottom-right")];

    setHeroBlockZone(blocks, "moved", "top-left", 0);

    expect(blocks[1].zone).toBe("bottom-right");
  });

  it("answers an unknown id with the canonical order", () => {
    const blocks = [block("b", "bottom-left"), block("a", "top-left")];

    expect(ids(setHeroBlockZone(blocks, "gone", "top-left", 0))).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("duplicateHeroBlock", () => {
  it("puts the copy directly after the original, in the same Zone", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("c", "top-left"),
    ];

    const { blocks: next } = duplicateHeroBlock(blocks, "a", "a", "copy");

    expect(ids(next)).toEqual(["a", "copy", "b", "c"]);
    expect(next[1].zone).toBe("top-left");
  });

  it("selects the copy", () => {
    const result = duplicateHeroBlock([block("a")], "a", "a", "copy");

    expect(result.selectedBlockId).toBe("copy");
  });

  it("copies the content, deeply — editing the copy leaves the original alone", () => {
    const blocks = [heroBlock({ id: "a", text: { de: "Willkommen" } })];

    const { blocks: next } = duplicateHeroBlock(blocks, "a", "a", "copy");
    next[1].text.de = "Etwas anderes";

    expect(next[1].id).toBe("copy");
    expect(blocks[0].text.de).toBe("Willkommen");
  });

  it("takes a fresh id when it is given none", () => {
    const { blocks: next } = duplicateHeroBlock([block("a")], "a", "a");

    expect(next[1].id).not.toBe("a");
    expect(next[1].id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it("refuses to go past twelve Blocks and leaves the selection alone", () => {
    const blocks = Array.from({ length: MAX_HERO_BLOCKS }, (_, index) =>
      block(`b${index}`, "top-left")
    );

    const result = duplicateHeroBlock(blocks, "b0", "b3", "copy");

    expect(result.blocks).toHaveLength(MAX_HERO_BLOCKS);
    expect(result.selectedBlockId).toBe("b3");
  });

  it("does nothing for an unknown id", () => {
    const result = duplicateHeroBlock([block("a")], "gone", "a", "copy");

    expect(ids(result.blocks)).toEqual(["a"]);
    expect(result.selectedBlockId).toBe("a");
  });
});

describe("removeHeroBlock", () => {
  it("takes the Block out of the array", () => {
    const blocks = [block("a", "top-left"), block("b", "top-left")];

    expect(ids(removeHeroBlock(blocks, "a", "a").blocks)).toEqual(["b"]);
  });

  it("selects the next Block of the group", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("elsewhere", "bottom-right"),
    ];

    expect(removeHeroBlock(blocks, "a", "a").selectedBlockId).toBe("b");
  });

  it("falls back to the one before it at the end of the group", () => {
    const blocks = [block("a", "top-left"), block("b", "top-left")];

    expect(removeHeroBlock(blocks, "b", "b").selectedBlockId).toBe("a");
  });

  it("selects nothing when the group runs empty", () => {
    const blocks = [block("alone", "top-left"), block("other", "bottom-right")];

    expect(
      removeHeroBlock(blocks, "alone", "alone").selectedBlockId
    ).toBeNull();
  });

  it("keeps a selection that was on another Block", () => {
    const blocks = [block("a", "top-left"), block("b", "top-left")];

    expect(removeHeroBlock(blocks, "a", "b").selectedBlockId).toBe("b");
  });

  it("does nothing for an unknown id", () => {
    const result = removeHeroBlock([block("a")], "gone", "a");

    expect(ids(result.blocks)).toEqual(["a"]);
    expect(result.selectedBlockId).toBe("a");
  });
});

describe("insertHeroBlock", () => {
  it("puts the new Block into the selected Block's Zone, right after it", () => {
    const blocks = [
      block("a", "top-left"),
      block("b", "top-left"),
      block("elsewhere", "bottom-right"),
    ];

    const { blocks: next } = insertHeroBlock(blocks, "text", {
      after: "a",
      id: "new",
    });

    expect(ids(next)).toEqual(["a", "new", "b", "elsewhere"]);
    expect(next[1].zone).toBe("top-left");
  });

  it("puts it into „Mitte zentriert“ without a selection", () => {
    const { blocks: next } = insertHeroBlock([], "text", { id: "new" });

    expect(next[0].zone).toBe("middle-center");
  });

  it("selects the new Block", () => {
    const result = insertHeroBlock([], "richtext", { id: "new" });

    expect(result.selectedBlockId).toBe("new");
  });

  it("creates the Block of the asked-for type with its defaults", () => {
    const { blocks: next } = insertHeroBlock([], "image", { id: "new" });

    expect(next[0]).toMatchObject({ type: "image", maxHeight: "md" });
  });

  it("takes a fresh id when it is given none", () => {
    const { blocks: next } = insertHeroBlock([], "text");

    expect(next[0].id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it("falls back to „Mitte zentriert“ when the selection is gone", () => {
    const { blocks: next } = insertHeroBlock([block("a", "top-left")], "text", {
      after: "gone",
      id: "new",
    });

    expect(next[1].zone).toBe("middle-center");
  });

  it("refuses to go past twelve Blocks", () => {
    const blocks = Array.from({ length: MAX_HERO_BLOCKS }, (_, index) =>
      block(`b${index}`, "top-left")
    );

    const result = insertHeroBlock(blocks, "text", { after: "b0", id: "new" });

    expect(result.blocks).toHaveLength(MAX_HERO_BLOCKS);
    expect(result.selectedBlockId).toBe("b0");
  });
});

describe("heroLocalizedText", () => {
  it("reads the locale it is asked for", () => {
    expect(heroLocalizedText({ de: "Hallo", en: "Hello" }, "en")).toBe("Hello");
  });

  it("reads a missing locale and a missing string as empty", () => {
    expect(heroLocalizedText({ de: "Hallo" }, "en")).toBe("");
    expect(heroLocalizedText(null, "de")).toBe("");
  });
});

describe("setHeroLocalizedText", () => {
  it("writes the locale without touching the others", () => {
    expect(setHeroLocalizedText({ de: "Hallo" }, "en", "Hello")).toEqual({
      de: "Hallo",
      en: "Hello",
    });
  });

  it("keeps an emptied German text, because it is the required one", () => {
    expect(setHeroLocalizedText({ de: "Hallo" }, "de", "")).toEqual({ de: "" });
  });

  it("drops an emptied English text, because an empty one counts as absent", () => {
    expect(
      setHeroLocalizedText({ de: "Hallo", en: "Hello" }, "en", "  ")
    ).toEqual({ de: "Hallo" });
  });
});

describe("updateHeroBlock", () => {
  it("rewrites only the fields of the patch, and only on that Block", () => {
    const blocks = [block("a"), block("b")];

    const next = updateHeroBlock(blocks, "b", { size: "xl", shadow: true });

    expect(next[1]).toMatchObject({ id: "b", size: "xl", shadow: true });
    expect(next[1].text).toEqual({ de: "Willkommen" });
    expect(next[0]).toEqual(blocks[0]);
  });

  it("leaves the array it was given untouched", () => {
    const blocks = [block("a")];

    updateHeroBlock(blocks, "a", { size: "xl" });

    expect(blocks[0].size).toBe("md");
  });

  it("takes an id nobody carries as a no-op", () => {
    const blocks = [block("a")];

    expect(updateHeroBlock(blocks, "gone", { size: "xl" })).toEqual(blocks);
  });
});

describe("heroBlockZoneCounts", () => {
  it("counts every Zone, the empty ones as zero", () => {
    const counts = heroBlockZoneCounts([
      block("a", "top-left"),
      block("b", "top-left"),
      block("c", "middle-center"),
    ]);

    expect(counts["top-left"]).toBe(2);
    expect(counts["middle-center"]).toBe(1);
    expect(counts["bottom-right"]).toBe(0);
    expect(Object.keys(counts)).toEqual([...HERO_ZONES]);
  });

  it("leaves the named Block out of its own count", () => {
    const blocks = [block("a", "top-left"), block("b", "top-left")];

    expect(heroBlockZoneCounts(blocks, "a")["top-left"]).toBe(1);
  });

  it("ignores a Zone none of the nine knows", () => {
    const counts = heroBlockZoneCounts([block("a", "nowhere")]);

    expect(counts.nowhere).toBeUndefined();
    expect(counts["top-left"]).toBe(0);
  });
});

/**
 * The badge beside the language toggle: „N ohne Übersetzung“. What counts as
 * translated is one non-empty English value in the Block's own localised
 * field — the one field its type carries (hero layout spec §4).
 */
describe("heroUntranslatedBlockIds", () => {
  it("names a text Block whose English text is missing or empty", () => {
    expect(
      heroUntranslatedBlockIds([
        { id: "a", type: "text", text: { de: "Willkommen" } },
        { id: "b", type: "text", text: { de: "Willkommen", en: "" } },
        { id: "c", type: "text", text: { de: "Willkommen", en: "   " } },
      ])
    ).toEqual(["a", "b", "c"]);
  });

  it("leaves a translated Block of every type out", () => {
    expect(
      heroUntranslatedBlockIds([
        { id: "a", type: "text", text: { de: "Hallo", en: "Hello" } },
        {
          id: "b",
          type: "richtext",
          html: { de: "<p>Hallo</p>", en: "<p>Hello</p>" },
        },
        { id: "c", type: "image", alt: { de: "Logo", en: "Logo" } },
      ])
    ).toEqual([]);
  });

  it("reads an emptied rich-text editor as no translation", () => {
    expect(
      heroUntranslatedBlockIds([
        {
          id: "a",
          type: "richtext",
          html: { de: "<p>Hallo</p>", en: "<p></p>" },
        },
      ])
    ).toEqual(["a"]);
  });

  it("says nothing about a Block whose type carries no localised field", () => {
    expect(heroUntranslatedBlockIds([{ id: "a", type: "divider" }])).toEqual(
      []
    );
    expect(heroUntranslatedBlockIds(null)).toEqual([]);
  });
});
