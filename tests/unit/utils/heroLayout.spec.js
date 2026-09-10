import { describe, expect, it } from "vitest";
import {
  heroDefaultPreviewPayload,
  heroDraftFromResponse,
  heroDraftSnapshot,
  heroLayoutSavePayload,
} from "@/utils/heroLayout";
import { HERO_BACKGROUND, heroLayout } from "@tests/unit/support/heroLayout";

const layout = heroLayout;
const BACKGROUND = HERO_BACKGROUND;

describe("heroDraftFromResponse", () => {
  it("reads the four parts of the read route's answer", () => {
    const draft = heroDraftFromResponse({
      heroLayout: layout(),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: true,
    });

    expect(draft).toEqual({
      heroLayout: layout(),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: true,
    });
  });

  it("copies the response, so editing the draft leaves it untouched", () => {
    const response = { heroLayout: layout(), background: BACKGROUND, name: "" };

    const draft = heroDraftFromResponse(response);
    draft.heroLayout.height = "xl";

    expect(response.heroLayout.height).toBe("lg");
  });

  it("keeps the given default state where the answer carries none", () => {
    // The save route answers `{ heroLayout, background, name }` — whether the
    // layout follows Portalname and logo is what the editor just sent.
    const draft = heroDraftFromResponse(
      { heroLayout: layout(), background: BACKGROUND, name: "Marktplatz" },
      { isDefault: true }
    );

    expect(draft.isDefault).toBe(true);
  });

  it("is custom by default", () => {
    const draft = heroDraftFromResponse({ heroLayout: layout() });

    expect(draft.isDefault).toBe(false);
    expect(draft.background).toBeNull();
    expect(draft.name).toBe("");
  });
});

describe("heroLayoutSavePayload", () => {
  it("sends no layout while it is the default one", () => {
    // A materialised copy would stop following later Portalname and logo
    // changes; `null` keeps the backend deriving it.
    const payload = heroLayoutSavePayload({
      heroLayout: layout(),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: true,
    });

    expect(payload).toEqual({ heroLayout: null, background: BACKGROUND });
  });

  it("sends the layout once it is custom", () => {
    const payload = heroLayoutSavePayload({
      heroLayout: layout({ height: "xl" }),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: false,
    });

    expect(payload).toEqual({
      heroLayout: layout({ height: "xl" }),
      background: BACKGROUND,
    });
  });

  it("sends no background key while the Draft carries none", () => {
    // `background: null` would reset the Instance-wide Background, which the
    // auth pages share; a payload without the key keeps the stored one.
    const payload = heroLayoutSavePayload({
      heroLayout: layout(),
      background: null,
      name: "Marktplatz",
      isDefault: false,
    });

    expect(payload).not.toHaveProperty("background");
    expect(payload.heroLayout).toEqual(layout());
  });

  it("carries neither the Portalname nor the default flag", () => {
    const payload = heroLayoutSavePayload({
      heroLayout: layout(),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: false,
    });

    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("isDefault");
  });
});

describe("heroDraftSnapshot", () => {
  it("reads two drafts that would save the same as equal", () => {
    const stored = {
      heroLayout: layout(),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: true,
    };
    // The derived default the preview route hands back after a reset.
    const afterReset = {
      heroLayout: layout(),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: true,
    };

    expect(heroDraftSnapshot(afterReset)).toBe(heroDraftSnapshot(stored));
  });

  it("separates a changed height", () => {
    const stored = { heroLayout: layout(), background: null, isDefault: false };
    const changed = {
      heroLayout: layout({ height: "xl" }),
      background: null,
      isDefault: false,
    };

    expect(heroDraftSnapshot(changed)).not.toBe(heroDraftSnapshot(stored));
  });

  it("separates a layout that stopped being the default one", () => {
    const stored = { heroLayout: layout(), background: null, isDefault: true };
    const custom = { heroLayout: layout(), background: null, isDefault: false };

    expect(heroDraftSnapshot(custom)).not.toBe(heroDraftSnapshot(stored));
  });

  it("separates a changed background", () => {
    const stored = {
      heroLayout: layout(),
      background: BACKGROUND,
      isDefault: true,
    };
    const changed = {
      heroLayout: layout(),
      background: { version: 1, type: "color", light: "#ffffff" },
      isDefault: true,
    };

    expect(heroDraftSnapshot(changed)).not.toBe(heroDraftSnapshot(stored));
  });
});

describe("heroDefaultPreviewPayload", () => {
  it("asks for the derived default and keeps the edited background", () => {
    const payload = heroDefaultPreviewPayload({
      heroLayout: layout({ height: "xl" }),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: false,
    });

    expect(payload).toEqual({
      heroLayout: null,
      background: BACKGROUND,
      name: "Marktplatz",
    });
  });
});
