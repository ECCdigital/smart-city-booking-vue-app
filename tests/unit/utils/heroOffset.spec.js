import { describe, expect, it } from "vitest";
import {
  heroOffsetReadout,
  heroOffsetStep,
  isHeroOffsetStepPossible,
} from "@/utils/heroOffset";

/**
 * The readout counts **steps, not rem** (hero layout spec §7). The Offset is
 * stored in rem on a 0.5 grid, so what the author reads is that value divided
 * by the step — the number of clicks it took to get there.
 */
describe("heroOffsetReadout", () => {
  it("says so when the Block sits where its Zone puts it", () => {
    expect(heroOffsetReadout({ x: 0, y: 0 })).toBe("Kein Versatz");
  });

  it("names one axis alone when the other has not moved", () => {
    expect(heroOffsetReadout({ x: -1.5, y: 0 })).toBe(
      "3 nach links (Schritte)"
    );
    expect(heroOffsetReadout({ x: 0, y: 3 })).toBe("6 nach unten (Schritte)");
  });

  it("reads a Block that carries no Offset at all as unmoved", () => {
    // Only a hand-written layout arrives without one; the readout still has
    // something to say about it.
    expect(heroOffsetReadout(undefined)).toBe("Kein Versatz");
  });

  it("counts the steps of the spec's own example", () => {
    // 2 rem right and half a rem up, which is four steps and one.
    expect(heroOffsetReadout({ x: 2, y: -0.5 })).toBe(
      "4 nach rechts · 1 nach oben (Schritte)"
    );
  });
});

/**
 * One click is one step of 0.5 rem, and the six steps each way are the whole
 * of the contract's −3…3 grid: a Block at the edge stays there rather than
 * producing a value the backend would refuse.
 */
describe("heroOffsetStep", () => {
  it("moves half a rem in the direction of the cell", () => {
    expect(heroOffsetStep({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual({
      x: 0.5,
      y: 0,
    });
    expect(heroOffsetStep({ x: 0, y: 0 }, { x: -1, y: -1 })).toEqual({
      x: -0.5,
      y: -0.5,
    });
  });

  it("reaches the edge in six steps and stops there", () => {
    const atEdge = [1, 2, 3, 4, 5, 6].reduce(
      (offset) => heroOffsetStep(offset, { x: 1, y: 0 }),
      { x: 0, y: 0 }
    );

    expect(atEdge).toEqual({ x: 3, y: 0 });
    expect(heroOffsetStep(atEdge, { x: 1, y: 0 })).toEqual({ x: 3, y: 0 });
    expect(heroOffsetStep({ x: -3, y: 0 }, { x: -1, y: 0 })).toEqual({
      x: -3,
      y: 0,
    });
  });

  it("clamps only the axis that is exhausted", () => {
    expect(heroOffsetStep({ x: 3, y: 0 }, { x: 1, y: 1 })).toEqual({
      x: 3,
      y: 0.5,
    });
  });
});

describe("isHeroOffsetStepPossible", () => {
  it("answers false only when the cell can move nothing", () => {
    expect(isHeroOffsetStepPossible({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
    expect(isHeroOffsetStepPossible({ x: 3, y: 0 }, { x: 1, y: 0 })).toBe(
      false
    );
    // A diagonal whose other axis still has room is still a move.
    expect(isHeroOffsetStepPossible({ x: 3, y: 0 }, { x: 1, y: 1 })).toBe(true);
  });
});
