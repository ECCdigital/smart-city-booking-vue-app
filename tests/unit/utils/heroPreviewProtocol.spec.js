import { describe, expect, it } from "vitest";
import {
  HERO_PREVIEW_BLOCK_CLICK,
  HERO_PREVIEW_DRAFT,
  HERO_PREVIEW_PROTOCOL,
  HERO_PREVIEW_READY,
  HERO_PREVIEW_REPORT,
  HERO_PREVIEW_ZONE_CLICK,
  heroPreviewDraftMessage,
  heroPreviewFrameSrc,
  heroPreviewMessage,
  heroPreviewOrigin,
} from "@/utils/heroPreviewProtocol";
import { HERO_BACKGROUND, heroLayout } from "@tests/unit/support/heroLayout";

/** A resolved Draft, as the preview route answered it and under which id. */
function preview(overrides = {}) {
  return {
    draftId: 3,
    heroLayout: heroLayout(),
    background: HERO_BACKGROUND,
    name: "Marktplatz",
    ...overrides,
  };
}

describe("heroPreviewOrigin", () => {
  it("reads the origin of an absolute address", () => {
    expect(heroPreviewOrigin("https://portal.example.org/buchen?a=1")).toBe(
      "https://portal.example.org"
    );
  });

  it("drops the default port, so two spellings of one origin agree", () => {
    expect(heroPreviewOrigin("https://portal.example.org:443/")).toBe(
      "https://portal.example.org"
    );
  });

  it("keeps a port that is not the default one", () => {
    expect(heroPreviewOrigin("http://localhost:3000")).toBe(
      "http://localhost:3000"
    );
  });

  it("ignores surrounding whitespace", () => {
    expect(heroPreviewOrigin("  https://portal.example.org  ")).toBe(
      "https://portal.example.org"
    );
  });

  it("has no origin without a Portal-URL", () => {
    expect(heroPreviewOrigin("")).toBe("");
    expect(heroPreviewOrigin(null)).toBe("");
    expect(heroPreviewOrigin(undefined)).toBe("");
  });

  it("has no origin for an address that is not absolute http(s)", () => {
    expect(heroPreviewOrigin("portal.example.org")).toBe("");
    expect(heroPreviewOrigin("/preview/hero")).toBe("");
    expect(heroPreviewOrigin("javascript:alert(1)")).toBe("");
    expect(heroPreviewOrigin("ftp://portal.example.org")).toBe("");
  });
});

describe("heroPreviewFrameSrc", () => {
  it("loads the German preview route of the start page by default", () => {
    expect(heroPreviewFrameSrc("https://portal.example.org")).toBe(
      "https://portal.example.org/preview/hero?mode=home"
    );
  });

  it("loads the sub-page view when the toolbar asks for it", () => {
    expect(
      heroPreviewFrameSrc("https://portal.example.org", { mode: "compact" })
    ).toBe("https://portal.example.org/preview/hero?mode=compact");
  });

  it("takes the English route from the header toggle", () => {
    expect(
      heroPreviewFrameSrc("https://portal.example.org", {
        locale: "en",
        mode: "compact",
      })
    ).toBe("https://portal.example.org/en/preview/hero?mode=compact");
  });

  it("drops the Portal-URL's own path, so origin and frame agree", () => {
    expect(heroPreviewFrameSrc("https://portal.example.org/portal/")).toBe(
      "https://portal.example.org/preview/hero?mode=home"
    );
  });

  it("has no address without a Portal-URL", () => {
    expect(heroPreviewFrameSrc("")).toBe("");
  });
});

describe("heroPreviewDraftMessage", () => {
  it("carries the protocol version, the type and the resolved Draft", () => {
    const message = heroPreviewDraftMessage({ preview: preview() });

    expect(message).toEqual({
      protocol: HERO_PREVIEW_PROTOCOL,
      type: HERO_PREVIEW_DRAFT,
      draftId: 3,
      heroLayout: heroLayout(),
      background: HERO_BACKGROUND,
      name: "Marktplatz",
      colorMode: "light",
    });
  });

  it("carries the selected Block and the colour mode of the toolbar", () => {
    const message = heroPreviewDraftMessage({
      preview: preview(),
      selectedBlockId: "block-1",
      colorMode: "dark",
    });

    expect(message.selectedBlockId).toBe("block-1");
    expect(message.colorMode).toBe("dark");
  });

  it("leaves the key out without a selection", () => {
    const message = heroPreviewDraftMessage({ preview: preview() });

    expect("selectedBlockId" in message).toBe(false);
  });

  it("falls back to the light mode for a colour mode the protocol has not", () => {
    expect(
      heroPreviewDraftMessage({ preview: preview(), colorMode: "sepia" })
        .colorMode
    ).toBe("light");
  });

  it("is a complete snapshot even while nothing is resolved yet", () => {
    expect(heroPreviewDraftMessage({ preview: null })).toEqual({
      protocol: HERO_PREVIEW_PROTOCOL,
      type: HERO_PREVIEW_DRAFT,
      draftId: 0,
      heroLayout: null,
      background: null,
      name: "",
      colorMode: "light",
    });
  });
});

describe("heroPreviewMessage", () => {
  it.each([
    HERO_PREVIEW_READY,
    HERO_PREVIEW_REPORT,
    HERO_PREVIEW_ZONE_CLICK,
    HERO_PREVIEW_BLOCK_CLICK,
  ])("passes %s through", (type) => {
    const data = { protocol: HERO_PREVIEW_PROTOCOL, type, zone: "top-left" };

    expect(heroPreviewMessage(data)).toBe(data);
  });

  it("ignores another protocol version", () => {
    expect(
      heroPreviewMessage({ protocol: 2, type: HERO_PREVIEW_READY })
    ).toBeNull();
    expect(heroPreviewMessage({ type: HERO_PREVIEW_READY })).toBeNull();
  });

  it("ignores a type the storefront does not send", () => {
    expect(
      heroPreviewMessage({
        protocol: HERO_PREVIEW_PROTOCOL,
        type: "hero-preview:something-else",
      })
    ).toBeNull();
  });

  it("ignores its own draft message coming back", () => {
    expect(
      heroPreviewMessage(heroPreviewDraftMessage({ preview: preview() }))
    ).toBeNull();
  });

  it("ignores what is not a message object at all", () => {
    expect(heroPreviewMessage(null)).toBeNull();
    expect(heroPreviewMessage("hero-preview:ready")).toBeNull();
    expect(heroPreviewMessage(7)).toBeNull();
  });
});
