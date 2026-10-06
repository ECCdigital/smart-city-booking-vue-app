import { describe, expect, it } from "vitest";

import {
  HERO_ALIGN_TOKENS,
  HERO_SIZE_TOKENS,
} from "@/utils/heroRichtextClasses";
import { HERO_COLOR_TOKENS, isHeroColor } from "@/utils/heroBlockValidation";

/**
 * The vocabulary the editor's `parseHTML` rules read and its `renderHTML`
 * rules write is the third copy of the contract's class vocabulary (hero
 * layout spec, „Rich-text allowlist“); the backend's and the storefront's
 * sanitisers hold the other two. Pinned here against the contract's own
 * values, so a token cannot be added on one side only.
 */
describe("the Hero rich-text class vocabulary", () => {
  it("names the contract's six sizes, in the order of the scale", () => {
    expect(HERO_SIZE_TOKENS).toEqual(["xs", "sm", "md", "lg", "xl", "2xl"]);
  });

  it("names the contract's four colour tokens", () => {
    expect(HERO_COLOR_TOKENS).toEqual([
      "default",
      "primary",
      "secondary",
      "white",
    ]);
  });

  it("names the contract's three alignments and no automatic one", () => {
    expect(HERO_ALIGN_TOKENS).toEqual(["left", "center", "right"]);
  });

  it("offers a run of words exactly the colours a Block may carry", () => {
    // The Block's own colour field and the editor's dots read one list, so a
    // colour a word can take is one a Block can take.
    HERO_COLOR_TOKENS.forEach((token) => {
      expect(isHeroColor(token)).toBe(true);
    });
    expect(isHeroColor("black")).toBe(false);
  });
});
