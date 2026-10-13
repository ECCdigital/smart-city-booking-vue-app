import { describe, expect, it } from "vitest";
import { brandingForSave, defaultBranding } from "@/utils/instanceBranding";

/**
 * The Hero Editor owns the Background (hero layout spec, "Stale-overwrite
 * guard"). The Portal tab's global save must never carry `background` back:
 * a tab save after an editor save would otherwise overwrite the stored
 * Background with the stale copy the tab loaded earlier. A payload without
 * the key keeps the stored Background (Shared contract, "Reset").
 */
describe("brandingForSave", () => {
  it("drops the background so the tab save cannot overwrite the editor's", () => {
    const payload = brandingForSave({
      active: true,
      background: { version: 1, type: "color", light: "#ffffff" },
      theme: { colors: { primary: "#111111", secondary: "#222222" } },
    });

    expect(payload).not.toHaveProperty("background");
    expect(payload.active).toBe(true);
    expect(payload.theme.colors.primary).toBe("#111111");
  });

  it("keeps a read field only while no reference stands", () => {
    const withReference = brandingForSave({
      logo: { source: "media", mediaId: "m1" },
      logoUrl: "/media/m1",
      favicon: null,
      faviconUrl: "https://legacy.example.org/favicon.ico",
    });

    expect(withReference).not.toHaveProperty("logoUrl");
    expect(withReference.faviconUrl).toBe(
      "https://legacy.example.org/favicon.ico"
    );
  });

  it("passes an empty branding through", () => {
    expect(brandingForSave(null)).toBeNull();
    expect(brandingForSave(undefined)).toBeUndefined();
  });
});

describe("brandingForSave with the fields of map #510", () => {
  it("sends the accent colour, set or empty", () => {
    const set = brandingForSave({
      active: true,
      theme: {
        colors: { primary: "#111111", secondary: "#222222", accent: "#f59e0b" },
      },
    });
    const empty = brandingForSave({
      active: true,
      theme: {
        colors: { primary: "#111111", secondary: "#222222", accent: "" },
      },
    });

    expect(set.theme.colors.accent).toBe("#f59e0b");
    expect(empty.theme.colors.accent).toBe("");
  });

  it("sends back every field the backend delivered, untouched", () => {
    // The backend resets a field the payload leaves out to its default.
    const delivered = {
      active: true,
      theme: {
        colors: { primary: "#111111", secondary: "#222222", accent: "" },
      },
      header: "secondary",
      authLogoSize: "lg",
      logoDark: { source: "media", mediaId: "m2", url: null },
      footerLogos: [
        {
          image: { source: "media", mediaId: "m3", url: null },
          size: "md",
          link: "",
          imageDark: null,
        },
      ],
      font: { source: "curated", id: "inter" },
    };

    const payload = brandingForSave(delivered);

    expect(payload.header).toBe("secondary");
    expect(payload.authLogoSize).toBe("lg");
    expect(payload.logoDark).toEqual(delivered.logoDark);
    expect(payload.footerLogos).toEqual(delivered.footerLogos);
    expect(payload.font).toEqual(delivered.font);
  });
});

describe("brandingForSave with the header bar and the variant of the App-Logo", () => {
  it("sends the header and the variant as the form holds them", () => {
    const logoDark = { source: "media", mediaId: "m2", url: null };

    const payload = brandingForSave({
      ...defaultBranding(),
      header: "neutral",
      logoDark,
    });

    expect(payload.header).toBe("neutral");
    expect(payload.logoDark).toEqual(logoDark);
  });

  it("sends a branding that never stored them with Primär and without variant", () => {
    const payload = brandingForSave(defaultBranding());

    expect(payload.header).toBe("primary");
    expect(payload).toHaveProperty("logoDark", null);
  });
});

describe("brandingForSave with footer logos", () => {
  it("sends the footer logos in their order with size, link and variant", () => {
    const footerLogos = [
      {
        image: { source: "media", mediaId: "bmwsb", url: null },
        size: "lg",
        link: "https://www.bmwsb.bund.de",
        imageDark: null,
      },
      {
        image: { source: "media", mediaId: "land", url: null },
        size: "md",
        link: "",
        imageDark: { source: "media", mediaId: "land-dunkel", url: null },
      },
    ];

    const payload = brandingForSave({ active: true, footerLogos });

    expect(payload.footerLogos).toEqual(footerLogos);
  });
});

describe("brandingForSave with the size of the logo on the auth pages", () => {
  it("sends S for a branding that never stored a size, as today", () => {
    const stored = { active: false, theme: { colors: { primary: "" } } };

    const payload = brandingForSave({ ...defaultBranding(), ...stored });

    expect(payload.authLogoSize).toBe("sm");
  });

  it("sends the chosen size", () => {
    const payload = brandingForSave({
      ...defaultBranding(),
      authLogoSize: "md",
    });

    expect(payload.authLogoSize).toBe("md");
  });
});

describe("defaultBranding", () => {
  it("reads a branding without footer logos as one with none", () => {
    expect(defaultBranding().footerLogos).toEqual([]);
  });

  it("reads a branding without accent colour as one with an empty accent", () => {
    expect(defaultBranding().theme.colors).toEqual({
      primary: "",
      secondary: "",
      accent: "",
    });
  });
});
