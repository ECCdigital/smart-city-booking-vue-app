import { describe, expect, it } from "vitest";
import {
  heroDefaultPreviewPayload,
  heroDraftFromResponse,
  heroDraftSnapshot,
  heroLayoutSavePayload,
  heroPreviewPayload,
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

/**
 * The editor learns the amended shape before it offers a control for it: a
 * layout that already carries the new fields survives a load untouched, and
 * one that carries none of them is completed on the way in — so the Draft the
 * preview round-trip receives is the whole Block and the backend fills nothing
 * in behind the editor's back.
 */
describe("heroDraftFromResponse, on the amended Block shape", () => {
  it("fills the new fields of a Block that carries none of them", () => {
    const draft = heroDraftFromResponse({
      heroLayout: layout({
        blocks: [
          { id: "a", type: "text", zone: "top-left", text: { de: "Hallo" } },
        ],
      }),
    });

    expect(draft.heroLayout.blocks[0]).toMatchObject({
      align: "auto",
      panel: null,
      offset: { x: 0, y: 0 },
      layer: "back",
      size: "md",
    });
  });

  it("carries a Block that already has them through untouched", () => {
    const block = {
      id: "a",
      type: "richtext",
      zone: "middle-center",
      html: { de: "<p>Hallo</p>" },
      size: "2xl",
      color: "white",
      shadow: true,
      align: "right",
      panel: { color: "black", opacity: 0, radius: "full", blur: false },
      offset: { x: -2.5, y: 1.5 },
      layer: "front",
    };

    const draft = heroDraftFromResponse({
      heroLayout: layout({ blocks: [block] }),
    });

    expect(draft.heroLayout.blocks[0]).toEqual(expect.objectContaining(block));
  });

  it("reads the legacy Panel strings into the shape the Draft holds", () => {
    // `"none"` and `"translucent"` are accepted on input and normalised;
    // export is always `null` or the object (Shared contract, „Panel“).
    const draft = heroDraftFromResponse({
      heroLayout: layout({
        blocks: [
          { id: "a", type: "text", zone: "top-left", panel: "none" },
          { id: "b", type: "text", zone: "top-left", panel: "translucent" },
        ],
      }),
    });

    expect(draft.heroLayout.blocks[0].panel).toBeNull();
    expect(draft.heroLayout.blocks[1].panel).toEqual({
      color: "white",
      opacity: 60,
      radius: "md",
      blur: true,
    });
  });

  it("completes a partial Panel from the „Glas“ preset", () => {
    const draft = heroDraftFromResponse({
      heroLayout: layout({
        blocks: [
          { id: "a", type: "text", zone: "top-left", panel: { opacity: 100 } },
        ],
      }),
    });

    expect(draft.heroLayout.blocks[0].panel).toEqual({
      color: "white",
      opacity: 100,
      radius: "md",
      blur: true,
    });
  });

  it("leaves a layout without blocks alone", () => {
    expect(heroDraftFromResponse({ heroLayout: null }).heroLayout).toBeNull();
    expect(
      heroDraftFromResponse({ heroLayout: { version: 1 } }).heroLayout
    ).toEqual({ version: 1 });
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

describe("heroLayoutSavePayload, on the amended Block shape", () => {
  it("sends the Panel, the alignment, the Offset and the layer as they stand", () => {
    const block = {
      id: "a",
      type: "text",
      zone: "top-left",
      text: { de: "Hallo" },
      align: "center",
      panel: { color: "#1a2b3c", opacity: 80, radius: "sm", blur: false },
      offset: { x: 3, y: -0.5 },
      layer: "front",
    };

    const payload = heroLayoutSavePayload({
      heroLayout: layout({ blocks: [block] }),
      background: null,
      isDefault: false,
    });

    expect(payload.heroLayout.blocks[0]).toEqual(block);
  });

  it("copies the Panel, so a Block edited after the send keeps the body as it was", () => {
    const draft = {
      heroLayout: layout({
        blocks: [{ id: "a", panel: { color: "white", opacity: 60 } }],
      }),
      background: null,
      isDefault: false,
    };
    const payload = heroLayoutSavePayload(draft);

    draft.heroLayout.blocks[0].panel.opacity = 10;

    expect(payload.heroLayout.blocks[0].panel.opacity).toBe(60);
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

describe("heroPreviewPayload", () => {
  it("sends what the save would send, plus the Portalname", () => {
    const payload = heroPreviewPayload({
      heroLayout: layout({ height: "xl" }),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: false,
    });

    expect(payload).toEqual({
      heroLayout: layout({ height: "xl" }),
      background: BACKGROUND,
      name: "Marktplatz",
    });
  });

  it("asks for the derived default while the layout is still it", () => {
    const payload = heroPreviewPayload({
      heroLayout: layout(),
      background: BACKGROUND,
      name: "Marktplatz",
      isDefault: true,
    });

    expect(payload.heroLayout).toBeNull();
  });

  it("leaves the Background out when the Draft carries none", () => {
    const payload = heroPreviewPayload({
      heroLayout: layout(),
      background: null,
      name: "",
      isDefault: false,
    });

    expect("background" in payload).toBe(false);
    expect(payload.name).toBe("");
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

/**
 * A payload is what was sent, and it has to stay that even while the author
 * edits on: a `400` names positions in the body of the request, so a body that
 * moved with the Draft could not be read back at all.
 */
describe("heroLayoutSavePayload, as a snapshot", () => {
  it("does not move with the Draft it was built from", () => {
    const draft = {
      isDefault: false,
      heroLayout: { version: 1, blocks: [{ id: "a" }, { id: "b" }] },
      background: { version: 1, type: "color", light: "#ffffff" },
      name: "Marktplatz",
    };
    const payload = heroLayoutSavePayload(draft);

    draft.heroLayout.blocks = [{ id: "b" }];
    draft.background.light = "#000000";

    expect(payload.heroLayout.blocks.map((block) => block.id)).toEqual([
      "a",
      "b",
    ]);
    expect(payload.background.light).toBe("#ffffff");
  });
});
