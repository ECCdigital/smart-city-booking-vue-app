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

describe("brandingForSave with the font", () => {
  const reference = { source: "media", mediaId: "f1", url: null };

  it("sends the system font as null and a font of the list by its id", () => {
    expect(brandingForSave({ font: null }).font).toBeNull();
    expect(
      brandingForSave({ font: { source: "curated", id: "figtree" } }).font
    ).toEqual({ source: "curated", id: "figtree" });
  });

  it("sends the tick of a new own font alone", () => {
    const payload = brandingForSave({
      font: { source: "media", reference, license: { confirmed: true } },
    });

    expect(payload.font).toEqual({
      source: "media",
      reference,
      license: { confirmed: true },
    });
  });

  it("sends a stored confirmation as the tick, never its person or time", () => {
    const payload = brandingForSave({
      font: {
        source: "media",
        reference,
        license: {
          confirmedAt: "2026-10-01T08:00:00.000Z",
          confirmedBy: "admin@example.org",
        },
      },
    });

    expect(payload.font.license).toEqual({ confirmed: true });
  });

  it("sends an own font without tick without a licence", () => {
    const payload = brandingForSave({
      font: { source: "media", reference, license: null },
    });

    expect(payload.font).toEqual({ source: "media", reference });
  });
});

describe("defaultBranding", () => {
  it("reads a branding without font as the system font", () => {
    expect(defaultBranding().font).toBeNull();
  });

  it("reads a branding without accent colour as one with an empty accent", () => {
    expect(defaultBranding().theme.colors).toEqual({
      primary: "",
      secondary: "",
      accent: "",
    });
  });
});
