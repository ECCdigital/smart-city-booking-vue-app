import { describe, expect, it } from "vitest";
import {
  HERO_BACKGROUND_FAMILIES,
  HERO_BACKGROUND_INTENSITIES,
  HERO_BACKGROUND_VARIANTS,
  defaultHeroBackground,
  heroBackgroundFamily,
  heroBackgroundIssues,
  heroBackgroundOfFamily,
  heroFocalPoint,
  heroFocalPointOf,
  normalizedHeroBackground,
} from "@/utils/heroBackground";

const colorBackground = (overrides = {}) => ({
  version: 1,
  type: "color",
  light: "#f3f4f6",
  ...overrides,
});

const imageBackground = (overrides = {}) => ({
  version: 1,
  type: "image",
  image: { source: "media", mediaId: "m1" },
  focalPoint: { x: 50, y: 35 },
  overlay: { light: { color: "#000000", opacity: 40 } },
  ...overrides,
});

describe("the three families", () => {
  it("names them in the order the cards show them", () => {
    expect(HERO_BACKGROUND_FAMILIES.map((family) => family.value)).toEqual([
      "variant",
      "color",
      "image",
    ]);
    expect(HERO_BACKGROUND_FAMILIES.map((family) => family.label)).toEqual([
      "Muster",
      "Farbe",
      "Bild",
    ]);
  });

  it("carries the German words of the five variants and the three intensities", () => {
    expect(
      HERO_BACKGROUND_VARIANTS.map((variant) => [variant.value, variant.text])
    ).toEqual([
      ["mesh", "Farbverlauf"],
      ["aurora", "Nordlicht"],
      ["poly", "Polygone"],
      ["grid", "Raster"],
      ["minimal", "Schlicht"],
    ]);
    expect(HERO_BACKGROUND_INTENSITIES.map((step) => step.text)).toEqual([
      "Dezent",
      "Normal",
      "Kräftig",
    ]);
  });
});

describe("defaultHeroBackground", () => {
  it("is today's poly pattern with its defaults", () => {
    expect(defaultHeroBackground()).toEqual({
      version: 1,
      type: "variant",
      variant: "poly",
      orbs: true,
      noise: true,
      intensity: "normal",
    });
  });

  it("answers a fresh object every time", () => {
    const first = defaultHeroBackground();
    first.variant = "grid";

    expect(defaultHeroBackground().variant).toBe("poly");
  });
});

describe("heroBackgroundOfFamily", () => {
  it("starts the colour family from a colour, not from nothing", () => {
    const background = heroBackgroundOfFamily("color");

    expect(background.type).toBe("color");
    expect(background.light).toMatch(/^#[0-9a-f]{6}$/);
    expect(background.dark).toBeUndefined();
    expect(heroBackgroundIssues(background)).toEqual([]);
  });

  it("starts the image family without an image, which is the one thing to pick", () => {
    expect(heroBackgroundOfFamily("image")).toEqual({
      version: 1,
      type: "image",
      image: null,
      focalPoint: { x: 50, y: 50 },
      overlay: { light: { color: "#000000", opacity: 40 } },
    });
  });

  it("starts the pattern family from the default background", () => {
    expect(heroBackgroundOfFamily("variant")).toEqual(defaultHeroBackground());
  });
});

describe("heroBackgroundFamily", () => {
  it("reads the discriminator", () => {
    expect(heroBackgroundFamily(colorBackground())).toBe("color");
    expect(heroBackgroundFamily(imageBackground())).toBe("image");
    expect(heroBackgroundFamily(defaultHeroBackground())).toBe("variant");
  });

  it("reads a missing Background as the default one's family", () => {
    expect(heroBackgroundFamily(null)).toBe("variant");
  });
});

describe("normalizedHeroBackground", () => {
  it("reads a missing Background as the default one", () => {
    expect(normalizedHeroBackground(null)).toEqual(defaultHeroBackground());
  });

  it("fills the pattern defaults the backend would fill", () => {
    expect(
      normalizedHeroBackground({ version: 1, type: "variant", variant: "grid" })
    ).toEqual({
      version: 1,
      type: "variant",
      variant: "grid",
      orbs: true,
      noise: true,
      intensity: "normal",
    });
  });

  it("leaves a colour Background's optional dark value absent", () => {
    expect(normalizedHeroBackground(colorBackground())).toEqual(
      colorBackground()
    );
    expect(
      normalizedHeroBackground(colorBackground({ dark: "#111827" })).dark
    ).toBe("#111827");
  });

  it("fills focal point and light overlay of an image Background", () => {
    expect(
      normalizedHeroBackground({
        version: 1,
        type: "image",
        image: { source: "media", mediaId: "m1" },
      })
    ).toEqual(imageBackground({ focalPoint: { x: 50, y: 50 } }));
  });

  it("keeps a dark overlay absent but completes one that is there", () => {
    expect(
      normalizedHeroBackground(imageBackground()).overlay.dark
    ).toBeUndefined();
    expect(
      normalizedHeroBackground(
        imageBackground({
          overlay: {
            light: { color: "#112233", opacity: 20 },
            dark: { opacity: 60 },
          },
        })
      ).overlay.dark
    ).toEqual({ color: "#112233", opacity: 60 });
  });

  it("does not invent what the author has to choose", () => {
    expect(
      normalizedHeroBackground({ version: 1, type: "color" }).light
    ).toBeNull();
    expect(
      normalizedHeroBackground({ version: 1, type: "image" }).image
    ).toBeNull();
    expect(
      normalizedHeroBackground({ version: 1, type: "variant" }).variant
    ).toBeNull();
  });

  it("copies, so editing the answer leaves the Background alone", () => {
    const background = imageBackground();

    normalizedHeroBackground(background).focalPoint.x = 10;

    expect(background.focalPoint.x).toBe(50);
  });
});

describe("heroFocalPointOf", () => {
  it("fills in the centre where the Background carries no focal point", () => {
    expect(heroFocalPointOf(null)).toEqual({ x: 50, y: 50 });
    expect(heroFocalPointOf({ x: 20 })).toEqual({ x: 20, y: 50 });
  });

  it("keeps a point that is there, edges included", () => {
    expect(heroFocalPointOf({ x: 0, y: 100 })).toEqual({ x: 0, y: 100 });
  });
});

describe("heroFocalPoint", () => {
  it("reads a click as whole percentages of the surface", () => {
    expect(
      heroFocalPoint({ x: 30, y: 15 }, { width: 120, height: 60 })
    ).toEqual({ x: 25, y: 25 });
  });

  it("rounds to whole percentages, as the contract stores integers", () => {
    expect(heroFocalPoint({ x: 1, y: 2 }, { width: 3, height: 3 })).toEqual({
      x: 33,
      y: 67,
    });
  });

  it("keeps a click at the very edge inside 0–100", () => {
    expect(heroFocalPoint({ x: -4, y: 90 }, { width: 80, height: 80 })).toEqual(
      {
        x: 0,
        y: 100,
      }
    );
  });

  it("reads a surface without a size as its centre", () => {
    expect(heroFocalPoint({ x: 0, y: 0 }, { width: 0, height: 0 })).toEqual({
      x: 50,
      y: 50,
    });
  });
});

describe("heroBackgroundIssues", () => {
  it("passes the default Background and a missing one", () => {
    expect(heroBackgroundIssues(null)).toEqual([]);
    expect(heroBackgroundIssues(defaultHeroBackground())).toEqual([]);
    expect(heroBackgroundIssues(colorBackground())).toEqual([]);
    expect(heroBackgroundIssues(imageBackground())).toEqual([]);
  });

  it("refuses a family the schema has no room for", () => {
    expect(heroBackgroundIssues({ version: 1, type: "gradient" })).toHaveLength(
      1
    );
  });

  it("asks for a pattern and refuses an unknown one", () => {
    expect(heroBackgroundIssues({ version: 1, type: "variant" })).toHaveLength(
      1
    );
    expect(
      heroBackgroundIssues({ version: 1, type: "variant", variant: "swirl" })
    ).toHaveLength(1);
    expect(
      heroBackgroundIssues({
        version: 1,
        type: "variant",
        variant: "poly",
        intensity: "loud",
      })
    ).toHaveLength(1);
  });

  it("asks for the light colour and refuses a hex value that is none", () => {
    expect(heroBackgroundIssues({ version: 1, type: "color" })).toHaveLength(1);
    expect(
      heroBackgroundIssues(colorBackground({ light: "#abc" }))
    ).toHaveLength(1);
    expect(
      heroBackgroundIssues(colorBackground({ light: "primary" }))
    ).toHaveLength(1);
  });

  it("refuses a dark colour that is there and wrong, and allows one that is absent", () => {
    expect(heroBackgroundIssues(colorBackground({ dark: "#112233" }))).toEqual(
      []
    );
    expect(
      heroBackgroundIssues(colorBackground({ dark: "dunkel" }))
    ).toHaveLength(1);
  });

  it("asks for an image from the library", () => {
    expect(heroBackgroundIssues(imageBackground({ image: null }))).toHaveLength(
      1
    );
    expect(
      heroBackgroundIssues(
        imageBackground({
          image: { source: "external", url: "https://a.test/b.png" },
        })
      )
    ).toHaveLength(1);
  });

  it("refuses a focal point that is not two whole percentages", () => {
    expect(
      heroBackgroundIssues(imageBackground({ focalPoint: { x: 50, y: 120 } }))
    ).toHaveLength(1);
    expect(
      heroBackgroundIssues(imageBackground({ focalPoint: { x: 12.5, y: 50 } }))
    ).toHaveLength(1);
  });

  it("refuses an overlay whose colour or darkening is out of the contract", () => {
    expect(
      heroBackgroundIssues(
        imageBackground({ overlay: { light: { color: "black", opacity: 40 } } })
      )
    ).toHaveLength(1);
    expect(
      heroBackgroundIssues(
        imageBackground({
          overlay: { light: { color: "#000000", opacity: 101 } },
        })
      )
    ).toHaveLength(1);
    expect(
      heroBackgroundIssues(
        imageBackground({
          overlay: {
            light: { color: "#000000", opacity: 40 },
            dark: { color: "#000000", opacity: 40.5 },
          },
        })
      )
    ).toHaveLength(1);
  });

  it("names every problem, so the section can show them all", () => {
    expect(
      heroBackgroundIssues(
        imageBackground({
          image: null,
          focalPoint: { x: 200, y: 50 },
          overlay: { light: { color: "#00", opacity: 40 } },
        })
      )
    ).toHaveLength(3);
  });

  it("says it in German", () => {
    heroBackgroundIssues({ version: 1, type: "color" }).forEach((issue) => {
      expect(issue).toMatch(/[a-zäöüß]/);
      expect(issue.endsWith(".")).toBe(true);
    });
  });
});
