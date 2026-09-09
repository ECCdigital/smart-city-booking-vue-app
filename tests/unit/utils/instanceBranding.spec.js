import { describe, expect, it } from "vitest";
import { brandingForSave } from "@/utils/instanceBranding";

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
