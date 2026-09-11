import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import {
  heroBlock,
  heroImageBlock,
  heroRichtextBlock,
} from "@tests/unit/support/heroLayout";
import HeroBlockTile from "@/components/Instance/Edit/HeroBlockTile.vue";

const THEME_COLORS = { primary: "#123456", secondary: "#654321" };

const COLOR_BACKGROUND = Object.freeze({
  version: 1,
  type: "color",
  light: "#f3f4f6",
});

function tileOf(block, background = COLOR_BACKGROUND, locale = "de") {
  return mountComponent(HeroBlockTile, {
    propsData: { block, background, themeColors: THEME_COLORS, locale },
    stubs: { MediaReferenceImage: true },
  });
}

function text(wrapper) {
  return wrapper.find(".hero-block-tile__text");
}

/** The „Glas“ preset, as a Block that carries a Panel holds it. */
const GLASS = Object.freeze({
  color: "white",
  opacity: 60,
  radius: "md",
  blur: true,
});

function strip(wrapper) {
  return wrapper.find(".hero-block-tile__strip");
}

function wrapperBox(wrapper) {
  return wrapper.find(".hero-block-tile__box");
}

function boxStyle(wrapper) {
  return wrapperBox(wrapper).attributes("style") || "";
}

describe("the strip the Block is painted on", () => {
  it("is the Draft's own Background, not a fixture", () => {
    expect(strip(tileOf(heroBlock())).attributes("style")).toContain(
      "background-color: rgb(243, 244, 246)"
    );
  });

  it("names the pattern of a variant Background, which it cannot repaint", () => {
    const wrapper = tileOf(heroBlock(), {
      version: 1,
      type: "variant",
      variant: "aurora",
      orbs: true,
      noise: true,
      intensity: "normal",
    });

    expect(wrapper.find(".hero-block-tile__caption").text()).toContain(
      "Nordlicht"
    );
    expect(wrapper.find(".hero-block-tile__backdrop").exists()).toBe(false);
  });

  it("paints an image Background under its overlay", () => {
    const wrapper = tileOf(heroBlock(), {
      version: 1,
      type: "image",
      image: { source: "media", mediaId: "bg1" },
      focalPoint: { x: 30, y: 70 },
      overlay: { light: { color: "#001122", opacity: 40 } },
    });
    const backdrop = wrapper.find(".hero-block-tile__backdrop");

    expect(backdrop.props("reference")).toEqual({
      source: "media",
      mediaId: "bg1",
    });
    expect(
      wrapper.find(".hero-block-tile__overlay").attributes("style")
    ).toContain("background-color: rgba(0, 17, 34, 0.4)");
  });
});

describe("the Panel", () => {
  it("paints its four keys on the Block's own box", () => {
    const style = boxStyle(tileOf(heroBlock({ panel: GLASS })));

    expect(style).toContain("background-color: rgba(255, 255, 255, 0.6)");
    expect(style).toContain("border-radius: 0.75rem");
    expect(style).toContain("blur(16px)");
  });

  it("shows a Block without a Panel as it is, with no surface at all", () => {
    const style = boxStyle(tileOf(heroBlock({ panel: null })));

    expect(style).not.toContain("background-color");
    expect(style).not.toContain("border-radius");
    expect(style).not.toContain("blur");
  });
});

describe("the Block's own text", () => {
  it("paints the line at its size and in its colour", () => {
    const style = text(tileOf(heroBlock({ size: "lg", color: "primary" })))
      .element.style;

    expect(style.fontSize).toBe("1.125rem");
    expect(style.color).toBe("rgb(18, 52, 86)");
  });

  it("shows the text of the locale the header toggle selects", () => {
    const block = heroBlock({ text: { de: "Willkommen", en: "Welcome" } });

    expect(text(tileOf(block, COLOR_BACKGROUND, "de")).text()).toBe(
      "Willkommen"
    );
    expect(text(tileOf(block, COLOR_BACKGROUND, "en")).text()).toBe("Welcome");
  });

  it("falls back to the German text the storefront would show", () => {
    const block = heroBlock({ text: { de: "Willkommen" } });

    expect(text(tileOf(block, COLOR_BACKGROUND, "en")).text()).toBe(
      "Willkommen"
    );
  });

  it("shows a rich-text Block's first line", () => {
    const block = heroRichtextBlock({
      html: { de: "<p>Erste Zeile</p><p>Zweite</p>" },
    });

    expect(text(tileOf(block)).text()).toBe("Erste Zeile");
  });

  it("places the content inside the box the way „Ausrichtung“ says", () => {
    expect(
      wrapperBox(tileOf(heroBlock({ align: "right" }))).element.style.textAlign
    ).toBe("right");
  });

  it("paints no text for an image Block, whose content is the image", () => {
    expect(text(tileOf(heroImageBlock())).exists()).toBe(false);
  });
});

describe("an image Block", () => {
  it("paints the image the Block points at", () => {
    const picture = tileOf(heroImageBlock()).find(".hero-block-tile__picture");

    expect(picture.exists()).toBe(true);
    expect(picture.props("reference")).toEqual({
      source: "media",
      mediaId: "m1",
    });
  });

  it("paints nothing where no image has been chosen yet", () => {
    expect(
      tileOf(heroImageBlock({ image: null }))
        .find(".hero-block-tile__picture")
        .exists()
    ).toBe(false);
  });
});

/**
 * „Ausrichtung“ places content inside the Block's own box, so the box has to
 * be the size the two frames give it — otherwise the tile shows a movement at
 * „Breite: Automatisch“ that the frames will not, which is exactly the drift
 * this one repainting place can produce.
 */
describe("the box „Feinabstimmung“ gives the Block", () => {
  it("shrinks to fit at „Breite: Automatisch“, so there is nothing to align in", () => {
    const style = wrapperBox(tileOf(heroBlock({ width: "auto" }))).element
      .style;

    expect(style.width).toBe("auto");
  });

  it("takes the contract's own width at a fixed step", () => {
    expect(
      wrapperBox(tileOf(heroBlock({ width: "sm" }))).element.style.width
    ).toBe("20rem");
    expect(
      wrapperBox(tileOf(heroBlock({ width: "full" }))).element.style.width
    ).toBe("100%");
  });

  it("pads the box with „Innenabstand“ rather than a padding of its own", () => {
    expect(
      wrapperBox(tileOf(heroBlock({ innerSpacing: "none" }))).element.style
        .padding
    ).toBe("0px");
    expect(
      wrapperBox(tileOf(heroBlock({ innerSpacing: "lg" }))).element.style
        .padding
    ).toBe("2rem");
  });

  it("keeps the Panel and the alignment beside the two new keys", () => {
    const style = boxStyle(
      tileOf(
        heroBlock({
          width: "sm",
          innerSpacing: "sm",
          align: "right",
          panel: GLASS,
        })
      )
    );

    expect(style).toContain("width: 20rem");
    expect(style).toContain("padding: 1rem");
    expect(style).toContain("text-align: right");
    expect(style).toContain("background-color: rgba(255, 255, 255, 0.6)");
  });
});

describe("what the tile is allowed to know", () => {
  it("keeps no state of its own, so it can only paint the Draft", () => {
    expect(tileOf(heroBlock()).vm.$data).toEqual({});
  });

  it("says which three placements it leaves to them, in German", () => {
    expect(tileOf(heroBlock()).find(".hero-block-tile__caption").text()).toBe(
      "Zone, Versatz und Ebene zeigt die Live-Vorschau"
    );
  });

  it("leaves the Zone, the Offset and the Layer to the frames below", async () => {
    const wrapper = tileOf(heroBlock());
    const painted = wrapper.html();

    await wrapper.setProps({
      block: heroBlock({
        zone: "bottom-right",
        offset: { x: 2, y: -1.5 },
        layer: "front",
      }),
    });

    expect(wrapper.html()).toBe(painted);
  });

  it("repaints as the controls below it change the Draft", async () => {
    const wrapper = tileOf(heroBlock({ panel: null, align: "left" }));

    await wrapper.setProps({
      block: heroBlock({ panel: { ...GLASS, opacity: 100 }, align: "right" }),
      background: { version: 1, type: "color", light: "#001122" },
    });

    expect(boxStyle(wrapper)).toContain("background-color: rgb(255, 255, 255)");
    expect(wrapperBox(wrapper).element.style.textAlign).toBe("right");
    expect(strip(wrapper).attributes("style")).toContain(
      "background-color: rgb(0, 17, 34)"
    );
  });
});
