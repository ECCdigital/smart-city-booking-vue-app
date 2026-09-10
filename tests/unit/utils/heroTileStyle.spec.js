import { describe, expect, it } from "vitest";
import {
  heroAlignStyle,
  heroTileBackground,
  heroPanelStyle,
  heroTextStyle,
} from "@/utils/heroTileStyle";

/** The „Glas“ preset, as `HERO_PANEL_DEFAULTS` writes it. */
const GLASS = Object.freeze({
  color: "white",
  opacity: 60,
  radius: "md",
  blur: true,
});

const THEME_COLORS = Object.freeze({
  primary: "#123456",
  secondary: "#654321",
});

describe("the Panel's surface", () => {
  it("is nothing at all while the Block carries no Panel", () => {
    expect(heroPanelStyle(null)).toBeNull();
  });

  it("paints „Glas“ as white at 60 per cent, medium corners and 16 px frosting", () => {
    expect(heroPanelStyle(GLASS)).toEqual({
      backgroundColor: "rgba(255, 255, 255, 0.6)",
      borderRadius: "0.75rem",
      backdropFilter: "blur(16px)",
    });
  });

  it("keeps the frosting at 0 per cent, where the fill paints nothing", () => {
    expect(heroPanelStyle({ ...GLASS, opacity: 0 })).toEqual({
      backgroundColor: "rgba(255, 255, 255, 0)",
      borderRadius: "0.75rem",
      backdropFilter: "blur(16px)",
    });
  });

  it("omits the frosting at 100 per cent, where it would paint nothing", () => {
    expect(heroPanelStyle({ ...GLASS, opacity: 100 })).toEqual({
      backgroundColor: "rgba(255, 255, 255, 1)",
      borderRadius: "0.75rem",
    });
  });

  it("leaves the frosting off while „Hintergrund weichzeichnen“ is off", () => {
    expect(heroPanelStyle({ ...GLASS, blur: false })).toEqual({
      backgroundColor: "rgba(255, 255, 255, 0.6)",
      borderRadius: "0.75rem",
    });
  });

  it("paints „Schwarz“ as black", () => {
    expect(heroPanelStyle({ ...GLASS, color: "black" }).backgroundColor).toBe(
      "rgba(0, 0, 0, 0.6)"
    );
  });

  it("paints the two branded tokens with the instance's own colours", () => {
    expect(
      heroPanelStyle({ ...GLASS, color: "primary" }, THEME_COLORS)
        .backgroundColor
    ).toBe("rgba(18, 52, 86, 0.6)");
    expect(
      heroPanelStyle({ ...GLASS, color: "secondary" }, THEME_COLORS)
        .backgroundColor
    ).toBe("rgba(101, 67, 33, 0.6)");
  });

  it("paints a custom hex as it stands", () => {
    expect(heroPanelStyle({ ...GLASS, color: "#1A2B3C" }).backgroundColor).toBe(
      "rgba(26, 43, 60, 0.6)"
    );
  });

  it("paints the five corner steps of the contract", () => {
    const radiusOf = (radius) =>
      heroPanelStyle({ ...GLASS, radius }).borderRadius;

    expect(["none", "sm", "md", "lg", "full"].map(radiusOf)).toEqual([
      "0",
      "0.375rem",
      "0.75rem",
      "1.5rem",
      "9999px",
    ]);
  });

  it("paints no fill for a colour it cannot resolve, rather than a wrong one", () => {
    expect(heroPanelStyle({ ...GLASS, color: "primary" })).toEqual({
      backgroundColor: "transparent",
      borderRadius: "0.75rem",
      backdropFilter: "blur(16px)",
    });
  });
});

describe("the Block's own text", () => {
  it("paints the six steps of the scale as the mobile tree does", () => {
    const sizeOf = (size) => heroTextStyle({ size }).fontSize;

    expect(["xs", "sm", "md", "lg", "xl", "2xl"].map(sizeOf)).toEqual([
      "0.75rem",
      "0.875rem",
      "1rem",
      "1.125rem",
      "1.25rem",
      "1.5rem",
    ]);
  });

  it("reads a Block that carries no size as the step it will be saved as", () => {
    expect(heroTextStyle({}).fontSize).toBe("1rem");
  });

  it("paints „Standard“ as the ink of the light mode", () => {
    expect(heroTextStyle({ size: "md", color: "default" }).color).toBe(
      "#000000"
    );
  });

  it("paints „Weiß“, the two branded tokens and a custom hex", () => {
    const colorOf = (color) =>
      heroTextStyle({ size: "md", color }, THEME_COLORS).color;

    expect(["white", "primary", "secondary", "#1A2B3C"].map(colorOf)).toEqual([
      "#ffffff",
      "#123456",
      "#654321",
      "#1A2B3C",
    ]);
  });

  it("keeps the default ink for a branded token it cannot resolve, so the text stays legible", () => {
    expect(heroTextStyle({ size: "md", color: "primary" }).color).toBe(
      "#000000"
    );
  });
});

describe("the Block's alignment", () => {
  it("places the content inside its box on the three absolute values", () => {
    const alignOf = (align) => heroAlignStyle(align).textAlign;

    expect(["left", "center", "right"].map(alignOf)).toEqual([
      "left",
      "center",
      "right",
    ]);
  });

  it("centres „Automatisch“, the reading of the tree that has no columns", () => {
    expect(heroAlignStyle("auto").textAlign).toBe("center");
    expect(heroAlignStyle(undefined).textAlign).toBe("center");
  });
});

describe("the strip of the Draft's own Background", () => {
  it("paints „Farbe“ as the colour itself", () => {
    const strip = heroTileBackground({
      version: 1,
      type: "color",
      light: "#f3f4f6",
    });

    expect(strip.family).toBe("color");
    expect(strip.style).toEqual({ backgroundColor: "#f3f4f6" });
    expect(strip.image).toBeNull();
    expect(strip.overlayStyle).toBeNull();
    expect(strip.label).toBeNull();
  });

  it("names the pattern of „Muster“, which it cannot repaint", () => {
    const strip = heroTileBackground({
      version: 1,
      type: "variant",
      variant: "poly",
      orbs: true,
      noise: true,
      intensity: "normal",
    });

    expect(strip.family).toBe("variant");
    expect(strip.label).toBe("Polygone");
    expect(strip.image).toBeNull();
  });

  it("reads a missing Background as the default pattern", () => {
    expect(heroTileBackground(null).label).toBe("Polygone");
  });

  it("paints „Bild“ as the image under its overlay", () => {
    const strip = heroTileBackground({
      version: 1,
      type: "image",
      image: { source: "media", mediaId: "m1" },
      focalPoint: { x: 30, y: 70 },
      overlay: { light: { color: "#001122", opacity: 40 } },
    });

    expect(strip.family).toBe("image");
    expect(strip.image).toEqual({ source: "media", mediaId: "m1" });
    expect(strip.overlayStyle).toEqual({
      backgroundColor: "rgba(0, 17, 34, 0.4)",
    });
  });

  it("paints the overlay colour where the image has still to be chosen", () => {
    const strip = heroTileBackground({
      version: 1,
      type: "image",
      image: null,
      overlay: { light: { color: "#001122", opacity: 40 } },
    });

    expect(strip.image).toBeNull();
    expect(strip.style).toEqual({ backgroundColor: "#001122" });
  });
});
