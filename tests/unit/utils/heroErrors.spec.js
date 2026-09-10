import { describe, expect, it } from "vitest";
import { validationError } from "@tests/unit/support/api";
import {
  heroErrorEntries,
  heroErrorMessage,
  heroSectionErrorText,
  heroValidationDetails,
  isHeroInlineBlockError,
  resolveHeroErrorPath,
} from "@/utils/heroErrors";

/**
 * The three examples the spec names (§9) plus the shapes around them: a path
 * the editor cannot place must still reach the author, so nothing here may
 * answer „dropped“.
 */
describe("resolveHeroErrorPath", () => {
  it("reads the third Block's German text", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks[2].text.de")).toEqual({
      section: "blocks",
      blockIndex: 2,
      field: "text",
      locale: "de",
    });
  });

  it("reads the Background's light overlay colour", () => {
    expect(resolveHeroErrorPath("background.overlay.light.color")).toEqual({
      section: "background",
      blockIndex: null,
      field: "overlay.light.color",
      locale: null,
    });
  });

  it("reads the layout's height", () => {
    expect(resolveHeroErrorPath("heroLayout.height")).toEqual({
      section: "layout",
      blockIndex: null,
      field: "height",
      locale: null,
    });
  });

  it("reads the English locale of a rich text and of an alt text", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks[0].html.en")).toMatchObject({
      blockIndex: 0,
      field: "html",
      locale: "en",
    });
    expect(resolveHeroErrorPath("heroLayout.blocks[1].alt.de")).toMatchObject({
      blockIndex: 1,
      field: "alt",
      locale: "de",
    });
  });

  it("leaves a localised field without a locale when none was named", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks[2].text")).toMatchObject({
      field: "text",
      locale: null,
    });
  });

  it("keeps a locale nobody edits off the field", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks[2].text.fr")).toMatchObject({
      field: "text",
      locale: null,
    });
  });

  it("reads the other keys of a Block", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks[3].image")).toMatchObject({
      blockIndex: 3,
      field: "image",
    });
    expect(resolveHeroErrorPath("heroLayout.blocks[3].id")).toMatchObject({
      blockIndex: 3,
      field: "id",
    });
  });

  it("names the Block without a field when the Block itself is refused", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks[2]")).toEqual({
      section: "blocks",
      blockIndex: 2,
      field: null,
      locale: null,
    });
  });

  it("puts the Blocks array at the Block section without a Block", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks")).toEqual({
      section: "blocks",
      blockIndex: null,
      field: null,
      locale: null,
    });
  });

  it("puts the layout and the Background themselves at their section", () => {
    expect(resolveHeroErrorPath("heroLayout")).toMatchObject({
      section: "layout",
      field: null,
    });
    expect(resolveHeroErrorPath("background")).toMatchObject({
      section: "background",
      field: null,
    });
  });

  it("puts a key inside a media reference on the Bild control", () => {
    // `{ source, mediaId }` is one control, so a fault of either is its own.
    expect(
      resolveHeroErrorPath("heroLayout.blocks[2].image.mediaId")
    ).toMatchObject({ blockIndex: 2, field: "image" });
    expect(resolveHeroErrorPath("background.image.source")).toMatchObject({
      section: "background",
      field: "image",
    });
  });

  it("keeps a path whose parts are each their own control whole", () => {
    // The overlay's colour and its opacity are two controls, not one.
    expect(
      resolveHeroErrorPath("background.overlay.dark.opacity")
    ).toMatchObject({ field: "overlay.dark.opacity" });
    expect(resolveHeroErrorPath("background.focalPoint.y")).toMatchObject({
      field: "focalPoint.y",
    });
  });

  it("puts the Panel's own keys on the controls of the Panel group", () => {
    // „Deckkraft“ and „Farbe“ are controls of their own, so the path stays
    // whole rather than collapsing onto the Panel switch (spec §9).
    expect(
      resolveHeroErrorPath("heroLayout.blocks[2].panel.opacity")
    ).toMatchObject({ blockIndex: 2, field: "panel.opacity" });
    expect(
      resolveHeroErrorPath("heroLayout.blocks[2].panel.color")
    ).toMatchObject({ blockIndex: 2, field: "panel.color" });
    expect(
      resolveHeroErrorPath("heroLayout.blocks[0].panel.radius")
    ).toMatchObject({ field: "panel.radius" });
    expect(
      resolveHeroErrorPath("heroLayout.blocks[0].panel.blur")
    ).toMatchObject({ field: "panel.blur" });
  });

  it("keeps a refused Panel itself on the switch", () => {
    expect(resolveHeroErrorPath("heroLayout.blocks[1].panel")).toMatchObject({
      field: "panel",
    });
  });

  it("answers a path it cannot place with no section at all", () => {
    expect(resolveHeroErrorPath("wibble.wobble")).toEqual({
      section: null,
      blockIndex: null,
      field: null,
      locale: null,
    });
    // The Portalname is edited on the Portal tab, not in this dialog.
    expect(resolveHeroErrorPath("name")).toMatchObject({ section: null });
    expect(resolveHeroErrorPath("")).toMatchObject({ section: null });
    expect(resolveHeroErrorPath(null)).toMatchObject({ section: null });
  });
});

describe("heroErrorMessage", () => {
  it("speaks the wording the local rules use", () => {
    expect(heroErrorMessage({ field: "x", code: "required" })).toBe(
      "Pflichtfeld"
    );
    expect(
      heroErrorMessage({
        field: "x",
        code: "max_length",
        params: { max: 200, actual: 250 },
      })
    ).toBe("Höchstens 200 Zeichen.");
    expect(
      heroErrorMessage({
        field: "x",
        code: "invalid_format",
        params: { format: "hex" },
      })
    ).toBe("Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c.");
  });

  it("names what is wrong for the codes of the contract", () => {
    const message = (code, params) =>
      heroErrorMessage({ field: "x", code, params });

    expect(message("invalid_enum")).toContain("unterstützt");
    expect(message("unknown_field")).toContain("unterstützt");
    expect(message("duplicate_id")).toContain("Kennung");
    expect(message("max_items", { max: 12 })).toContain("12");
    expect(message("invalid_format", { format: "block_id" })).toContain(
      "Kennung"
    );
  });

  it("names which rule a refused medium broke", () => {
    const reason = (value) =>
      heroErrorMessage({
        field: "x",
        code: "invalid_custom",
        params: { reason: value },
      });

    expect(reason("external")).toContain("Externe");
    expect(reason("not_instance")).toContain("Mediathek");
    expect(reason("not_public")).toContain("öffentlich");
    expect(reason("not_image")).toContain("Bild");
  });

  it("falls back rather than staying silent on a code it does not know", () => {
    expect(heroErrorMessage({ field: "x", code: "brand_new" })).toBeTruthy();
    expect(heroErrorMessage({ field: "x" })).toBeTruthy();
  });

  it("says a value of the wrong kind is one, rather than falling back", () => {
    const generic = heroErrorMessage({ field: "x", code: "brand_new" });

    for (const format of ["object", "array", "string", "boolean"]) {
      expect(
        heroErrorMessage({
          field: "x",
          code: "invalid_format",
          params: { format },
        })
      ).not.toBe(generic);
    }
  });

  it("never names a cap the detail does not carry", () => {
    expect(heroErrorMessage({ field: "x", code: "max_length" })).not.toContain(
      "undefined"
    );
    expect(heroErrorMessage({ field: "x", code: "max_items" })).not.toContain(
      "undefined"
    );
  });
});

describe("heroValidationDetails", () => {
  it("reads the details of a 400", () => {
    const details = [{ field: "heroLayout.height", code: "invalid_enum" }];

    expect(heroValidationDetails(validationError(details))).toEqual(details);
  });

  it("answers nothing for another status or a body without details", () => {
    const other = new Error("boom");
    other.response = { status: 500, data: {} };
    const bare = new Error("boom");
    bare.response = { status: 400, data: {} };

    expect(heroValidationDetails(other)).toBeNull();
    expect(heroValidationDetails(bare)).toBeNull();
    expect(heroValidationDetails(null)).toBeNull();
  });

  it("answers nothing for a refusal that names no field", () => {
    // Nothing would be marked, so the caller must not promise marks.
    expect(heroValidationDetails(validationError([]))).toBeNull();
  });
});

describe("heroErrorEntries", () => {
  it("carries the message and the German field name of every detail", () => {
    const entries = heroErrorEntries([
      { field: "heroLayout.blocks[2].text.de", code: "required" },
      { field: "heroLayout.height", code: "invalid_enum" },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      section: "blocks",
      blockIndex: 2,
      field: "text",
      locale: "de",
      message: "Pflichtfeld",
      label: "Text",
    });
    expect(entries[1]).toMatchObject({
      section: "layout",
      field: "height",
      label: "Höhe auf der Startseite",
    });
  });

  it("names every field of the Background a fault can reach", () => {
    const paths = [
      "background.version",
      "background.type",
      "background.variant",
      "background.orbs",
      "background.noise",
      "background.intensity",
      "background.light",
      "background.dark",
      "background.image",
      "background.focalPoint",
      "background.focalPoint.x",
      "background.overlay",
      "background.overlay.light",
      "background.overlay.light.color",
      "background.overlay.light.opacity",
      "background.overlay.dark.color",
      "background.overlay.dark.opacity",
    ];
    const unnamed = heroErrorEntries(
      paths.map((field) => ({ field, code: "required" }))
    ).filter((entry) => entry.label === null);

    expect(unnamed).toEqual([]);
  });

  it("names every field of a Block a fault can reach", () => {
    const keys = [
      "id",
      "type",
      "zone",
      "outerSpacing",
      "innerSpacing",
      "width",
      "align",
      "panel",
      "panel.color",
      "panel.opacity",
      "panel.radius",
      "panel.blur",
      "homeOnly",
      "hideOnMobile",
      "text",
      "size",
      "color",
      "weight",
      "shadow",
      "html",
      "alt",
      "image",
      "maxHeight",
      "invertInDarkMode",
    ];
    const unnamed = heroErrorEntries(
      keys.map((key) => ({
        field: `heroLayout.blocks[0].${key}`,
        code: "required",
      }))
    ).filter((entry) => entry.label === null);

    expect(unnamed).toEqual([]);
  });

  it("keeps an unplaceable path with a message and no section", () => {
    const [entry] = heroErrorEntries([{ field: "wibble", code: "required" }]);

    expect(entry.section).toBeNull();
    expect(entry.message).toBe("Pflichtfeld");
    expect(entry.label).toBeNull();
  });

  it("answers an empty list for anything that is not a list of details", () => {
    expect(heroErrorEntries(null)).toEqual([]);
    expect(heroErrorEntries("nope")).toEqual([]);
  });
});

describe("heroSectionErrorText", () => {
  it("names the field a section-level message is about", () => {
    const [entry] = heroErrorEntries([
      { field: "background.overlay.light.color", code: "invalid_format" },
    ]);

    expect(heroSectionErrorText(entry)).toBe(
      `${entry.label}: ${entry.message}`
    );
  });

  it("says the message alone when there is no field to name", () => {
    const [entry] = heroErrorEntries([
      { field: "heroLayout.blocks", code: "max_items", params: { max: 12 } },
    ]);

    expect(heroSectionErrorText(entry)).toBe(entry.message);
  });
});

/**
 * Which Block faults the detail form has a control for. „Deckkraft“ and the
 * Panel's „Farbe“ are two of them now; the Panel switch itself is not — a
 * refused Panel object describes a Draft no control here made (spec §9).
 */
describe("isHeroInlineBlockError", () => {
  function entryOf(path) {
    return heroErrorEntries([{ field: path, code: "required" }])[0];
  }

  it("claims the Panel's colour and its opacity", () => {
    expect(
      isHeroInlineBlockError(entryOf("heroLayout.blocks[0].panel.color"))
    ).toBe(true);
    expect(
      isHeroInlineBlockError(entryOf("heroLayout.blocks[0].panel.opacity"))
    ).toBe(true);
  });

  it("leaves the Panel itself and its two switch-borne keys to the section", () => {
    expect(isHeroInlineBlockError(entryOf("heroLayout.blocks[0].panel"))).toBe(
      false
    );
    expect(
      isHeroInlineBlockError(entryOf("heroLayout.blocks[0].panel.radius"))
    ).toBe(false);
  });

  it("still claims the Block's own fields", () => {
    expect(
      isHeroInlineBlockError(entryOf("heroLayout.blocks[0].text.de"))
    ).toBe(true);
    expect(isHeroInlineBlockError(entryOf("heroLayout.blocks[0].zone"))).toBe(
      false
    );
  });
});
