import { beforeAll, describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  chooseOption as choose,
  selectByLabel,
  switchByLabel,
  toggleSwitch as toggle,
} from "@tests/unit/support/vuetify";
import { stubProseMirrorLayout } from "@tests/unit/support/prosemirror";
import {
  heroBlock,
  heroImageBlock,
  heroRichtextBlock,
} from "@tests/unit/support/heroLayout";
import HeroBlockForm from "@/components/Instance/Edit/HeroBlockForm.vue";
import Tiptap from "@/components/Tiptap.vue";

const THEME_COLORS = { primary: "#123456", secondary: "#654321" };

/** The „Glas“ preset, as a Block that carries a Panel holds it. */
const GLASS = Object.freeze({
  color: "white",
  opacity: 60,
  radius: "md",
  blur: true,
});

// The rich-text Block mounts the real editor; the image Block's media field
// talks to the media API, which is not what this form is about.
beforeAll(stubProseMirrorLayout);

function formOf(block, options = {}) {
  const {
    blocks = [block],
    locale = "de",
    themeColors = THEME_COLORS,
    errors = {},
  } = options;
  return mountComponent(HeroBlockForm, {
    propsData: { block, blocks, locale, themeColors, errors },
    stubs: { MediaReferenceField: true, MediaReferenceImage: true },
  });
}

function editor(wrapper) {
  return wrapper.findComponent(Tiptap);
}

/** Types at the end of the rich text the way the toolbar-less editor is used. */
async function typeInEditor(wrapper, text) {
  editor(wrapper).vm.editor.chain().focus("end").insertContent(text).run();
  await wrapper.vm.$nextTick();
}

function mediaField(wrapper) {
  return wrapper.findComponent({ name: "MediaReferenceField" });
}

function fieldByLabel(wrapper, label) {
  const field = wrapper
    .findAllComponents({ name: "v-text-field" })
    .wrappers.find((entry) => entry.props("label") === label);
  if (!field) {
    throw new Error(`Das Feld „${label}“ fehlt.`);
  }
  return field;
}

function sectionTitles(wrapper) {
  return wrapper
    .findAllComponents({ name: "SubSection" })
    .wrappers.map((section) => section.props("title"));
}

function patches(wrapper) {
  return (wrapper.emitted("input") || []).map(([patch]) => patch);
}

function lastPatch(wrapper) {
  return patches(wrapper).at(-1);
}

/** The switch carrying a label, so its state can be read off its props. */
function switchOf(wrapper, label) {
  const found = wrapper
    .findAllComponents({ name: "v-switch" })
    .wrappers.find((entry) => entry.props("label") === label);
  if (!found) {
    throw new Error(`Der Schalter „${label}“ fehlt.`);
  }
  return found;
}

function textField(wrapper) {
  return wrapper.find(".hero-block-form__text input");
}

function chips(wrapper) {
  return wrapper
    .findAllComponents({ name: "v-chip" })
    .wrappers.map((chip) => ({ chip, label: chip.text().trim() }));
}

function chipLabels(wrapper) {
  return chips(wrapper).map((entry) => entry.label);
}

async function clickChip(wrapper, label) {
  const entry = chips(wrapper).find((candidate) => candidate.label === label);
  if (!entry) {
    throw new Error(`Der Chip „${label}“ fehlt.`);
  }
  await entry.chip.trigger("click");
  await wrapper.vm.$nextTick();
}

function cell(wrapper, zone) {
  return wrapper
    .findAll(".hero-position-grid__cell")
    .wrappers.find((entry) => entry.attributes("data-zone") === zone);
}

describe("HeroBlockForm", () => {
  it("shows the four sections in the order of the spec", () => {
    expect(sectionTitles(formOf(heroBlock()))).toEqual([
      "Inhalt",
      "Position",
      "Darstellung",
      "Sichtbarkeit",
    ]);
  });
});

describe("HeroBlockForm, the text Block's Inhalt", () => {
  it("edits the German text and counts to 200", async () => {
    const wrapper = formOf(heroBlock({ text: { de: "Willkommen" } }));

    expect(textField(wrapper).element.value).toBe("Willkommen");
    expect(wrapper.text()).toContain("10 / 200");

    await textField(wrapper).setValue("Herzlich willkommen");

    expect(lastPatch(wrapper)).toEqual({
      text: { de: "Herzlich willkommen" },
    });
  });

  it("marks an empty German text as required", async () => {
    const wrapper = formOf(heroBlock({ text: { de: "Da" } }));

    await textField(wrapper).setValue("");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Pflichtfeld");
  });

  it("refuses a text past 200 characters", async () => {
    const wrapper = formOf(heroBlock());

    await textField(wrapper).setValue("a".repeat(201));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Höchstens 200 Zeichen.");
  });

  it("edits the English text without marking it required", async () => {
    const wrapper = formOf(heroBlock({ text: { de: "Willkommen" } }), {
      locale: "en",
    });

    expect(textField(wrapper).element.value).toBe("");

    await textField(wrapper).setValue("Welcome");
    expect(lastPatch(wrapper)).toEqual({
      text: { de: "Willkommen", en: "Welcome" },
    });

    await textField(wrapper).setValue("");
    await wrapper.vm.$nextTick();

    expect(lastPatch(wrapper)).toEqual({ text: { de: "Willkommen" } });
    expect(wrapper.text()).not.toContain("Pflichtfeld");
  });

  it("offers the six font sizes and writes the chosen one", async () => {
    const wrapper = formOf(heroBlock());

    await choose(wrapper, "Schriftgröße", "Riesig");

    expect(lastPatch(wrapper)).toEqual({ size: "2xl" });
  });

  it("carries the two text switches", async () => {
    const wrapper = formOf(heroBlock());

    await toggle(wrapper, "Fett");
    expect(lastPatch(wrapper)).toEqual({ weight: "bold" });

    await toggle(wrapper, "Schatten für bessere Lesbarkeit");
    expect(lastPatch(wrapper)).toEqual({ shadow: true });
  });
});

describe("HeroBlockForm, the rich-text Block's Inhalt", () => {
  it("edits the German HTML in the shared editor, with links and the 10 000 counter", async () => {
    const wrapper = formOf(heroRichtextBlock());
    // The editor builds itself on `mounted`; its toolbar and counter appear
    // with the render that follows.
    await wrapper.vm.$nextTick();

    expect(editor(wrapper).props("links")).toBe(true);
    expect(editor(wrapper).props("maxLength")).toBe(10000);
    expect(editor(wrapper).vm.editor.getHTML()).toBe("<p>Willkommen</p>");
    expect(wrapper.find(".tiptap-counter").text()).toBe("17 / 10000");

    await typeInEditor(wrapper, " zurück");

    expect(lastPatch(wrapper)).toEqual({
      html: { de: "<p>Willkommen zurück</p>" },
    });
  });

  it("edits the English rich text without dropping the German one", async () => {
    const wrapper = formOf(heroRichtextBlock(), { locale: "en" });

    expect(editor(wrapper).vm.editor.getHTML()).toBe("<p></p>");

    await typeInEditor(wrapper, "Welcome");

    expect(lastPatch(wrapper)).toEqual({
      html: { de: "<p>Willkommen</p>", en: "<p>Welcome</p>" },
    });
  });

  it("gives every locale view its own editor instance", async () => {
    const wrapper = formOf(heroRichtextBlock());
    const first = editor(wrapper).vm.editor;

    await wrapper.setProps({ locale: "en" });

    expect(editor(wrapper).vm.editor).not.toBe(first);
  });

  it("marks markup without a line of text as required", () => {
    expect(
      formOf(heroRichtextBlock({ html: { de: "<p></p>" } })).text()
    ).toContain("Pflichtfeld");
  });

  it("refuses a rich text past 10 000 characters", () => {
    const wrapper = formOf(
      heroRichtextBlock({ html: { de: `<p>${"a".repeat(10000)}</p>` } })
    );

    expect(wrapper.text()).toContain("Höchstens 10000 Zeichen.");
  });

  it("carries the shadow switch and the colour control, and no font size", async () => {
    const wrapper = formOf(heroRichtextBlock());

    expect(chipLabels(wrapper)).toEqual([
      "Standard",
      "Primärfarbe",
      "Sekundärfarbe",
      "Weiß",
      "Eigene…",
    ]);
    expect(() => selectByLabel(wrapper, "Schriftgröße")).toThrow();
    expect(() => switchByLabel(wrapper, "Fett")).toThrow();

    await toggle(wrapper, "Schatten für bessere Lesbarkeit");

    expect(lastPatch(wrapper)).toEqual({ shadow: true });
  });
});

describe("HeroBlockForm, the image Block's Inhalt", () => {
  it("offers the instance's public images and shows the thumbnail", () => {
    const wrapper = formOf(heroImageBlock());
    const field = mediaField(wrapper);

    expect(field.props("scope")).toBe("instance");
    expect(field.props("kind")).toBe("image");
    expect(field.props("publicOnly")).toBe(true);
    expect(field.props("allowExternal")).toBe(false);
    expect(
      wrapper.findComponent({ name: "MediaReferenceImage" }).exists()
    ).toBe(true);
  });

  it("writes the picked reference and says so while none is chosen", async () => {
    const wrapper = formOf(heroImageBlock({ image: null }));

    expect(wrapper.text()).toContain(
      "Bitte ein Bild aus der Mediathek wählen."
    );
    expect(
      wrapper.findComponent({ name: "MediaReferenceImage" }).exists()
    ).toBe(false);

    const picked = { source: "media", mediaId: "m2" };
    mediaField(wrapper).vm.$emit("input", picked);
    await wrapper.vm.$nextTick();

    expect(lastPatch(wrapper)).toEqual({ image: picked });
  });

  it("hands an enriched reference on and leaves it alone while the alt text is edited", async () => {
    const enriched = {
      source: "media",
      mediaId: "m1",
      url: "/api/v2/instance/media/m1/file",
      width: 800,
      height: 200,
    };
    const wrapper = formOf(heroImageBlock({ image: enriched }));

    expect(mediaField(wrapper).props("value")).toBe(enriched);

    await fieldByLabel(wrapper, "Alternativtext").find("input").setValue("Neu");

    expect(lastPatch(wrapper)).toEqual({ alt: { de: "Neu" } });
    expect(patches(wrapper).some((patch) => "image" in patch)).toBe(false);
  });

  it("edits the alt text with its hint and counts to 200", async () => {
    const wrapper = formOf(heroImageBlock());
    const alt = fieldByLabel(wrapper, "Alternativtext");

    expect(alt.find("input").element.value).toBe("Das Logo");
    expect(wrapper.text()).toContain(
      "Wird vorgelesen und angezeigt, wenn das Bild fehlt"
    );
    expect(wrapper.text()).toContain("8 / 200");

    await alt.find("input").setValue("a".repeat(201));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Höchstens 200 Zeichen.");
  });

  it("marks an empty German alt text as required", async () => {
    const wrapper = formOf(heroImageBlock());

    await fieldByLabel(wrapper, "Alternativtext").find("input").setValue("");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Pflichtfeld");
  });

  it("offers the five maximum heights and the invert switch with its hint", async () => {
    const wrapper = formOf(heroImageBlock());

    await choose(wrapper, "Maximale Höhe", "Sehr klein");
    expect(lastPatch(wrapper)).toEqual({ maxHeight: "xs" });

    await toggle(wrapper, "Im Dunkelmodus invertieren");
    expect(lastPatch(wrapper)).toEqual({ invertInDarkMode: true });
    expect(wrapper.text()).toContain("Für dunkle Logos auf hellem Grund");
  });

  it("has neither a font size nor a colour control", () => {
    const wrapper = formOf(heroImageBlock());

    expect(() => selectByLabel(wrapper, "Schriftgröße")).toThrow();
    expect(chipLabels(wrapper)).toEqual([]);
  });
});

describe("HeroBlockForm, the colour control", () => {
  it("offers the five chips", () => {
    expect(chipLabels(formOf(heroBlock()))).toEqual([
      "Standard",
      "Primärfarbe",
      "Sekundärfarbe",
      "Weiß",
      "Eigene…",
    ]);
  });

  it("paints the two branding chips with the instance's colours", () => {
    const wrapper = formOf(heroBlock());
    const swatches = wrapper
      .findAll(".hero-color-field__swatch")
      .wrappers.map((swatch) => swatch.attributes("style"));

    expect(swatches[0]).toContain("rgb(18, 52, 86)");
    expect(swatches[1]).toContain("rgb(101, 67, 33)");
  });

  it("writes the token of the chip that was clicked", async () => {
    const wrapper = formOf(heroBlock());

    await clickChip(wrapper, "Weiß");

    expect(lastPatch(wrapper)).toEqual({ color: "white" });
  });

  it("writes nothing while „Eigene…“ only opens the picker", async () => {
    const wrapper = formOf(heroBlock());

    await clickChip(wrapper, "Eigene…");
    await flushPromises();

    expect(patches(wrapper)).toEqual([]);
    expect(wrapper.findComponent({ name: "v-color-picker" }).exists()).toBe(
      true
    );
  });

  it("shows the picked value on the chip", async () => {
    const wrapper = formOf(heroBlock({ color: "#1a2b3c" }));

    expect(chipLabels(wrapper)).toContain("#1a2b3c");
    expect(chipLabels(wrapper)).not.toContain("Eigene…");
  });

  it("reads a Block without a colour as „Standard“ and finds nothing wrong", () => {
    const block = heroBlock();
    delete block.color;
    const wrapper = formOf(block);

    expect(wrapper.text()).not.toContain("Hex-Wert");
    expect(
      wrapper
        .findAllComponents({ name: "v-chip" })
        .wrappers.find((chip) => chip.text().trim() === "Standard")
        .props("outlined")
    ).toBe(false);
  });

  it("drops the alpha the picker offers, which the contract has no room for", async () => {
    const wrapper = formOf(heroBlock({ color: "#1a2b3c" }));

    // The picker hangs in the „Eigene…“ menu and is built when it opens.
    await clickChip(wrapper, "#1a2b3c");
    await flushPromises();
    wrapper
      .findComponent({ name: "v-color-picker" })
      .vm.$emit("input", "#aabbcc80");
    await wrapper.vm.$nextTick();

    expect(lastPatch(wrapper)).toEqual({ color: "#aabbcc" });
  });

  it("says so when the stored colour is neither a token nor a hex value", () => {
    const wrapper = formOf(heroBlock({ color: "#12345" }));

    expect(wrapper.text()).toContain(
      "Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c."
    );
  });
});

describe("HeroBlockForm, the Position grid", () => {
  const crowd = [
    heroBlock({ id: "here", zone: "middle-center" }),
    heroBlock({ id: "mate", zone: "middle-center" }),
    heroBlock({ id: "far-1", zone: "top-left" }),
    heroBlock({ id: "far-2", zone: "top-left" }),
  ];

  it("shows all nine Zones and highlights the Block's own", () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    expect(wrapper.findAll(".hero-position-grid__cell")).toHaveLength(9);
    expect(cell(wrapper, "middle-center").classes()).toContain("primary");
    expect(cell(wrapper, "top-left").classes()).not.toContain("primary");
  });

  it("counts the other Blocks of a cell, never the moved one", () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    expect(cell(wrapper, "middle-center").text().trim()).toBe("1");
    expect(cell(wrapper, "top-left").text().trim()).toBe("2");
    expect(cell(wrapper, "bottom-right").text().trim()).toBe("");
  });

  it("asks for the move when another cell is clicked", async () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    await cell(wrapper, "bottom-right").trigger("click");

    expect(wrapper.emitted("update:zone")).toEqual([["bottom-right"]]);
  });

  it("does nothing when the Block's own cell is clicked", async () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    await cell(wrapper, "middle-center").trigger("click");

    expect(wrapper.emitted("update:zone")).toBeUndefined();
  });

  it("explains the mobile reading order", () => {
    expect(formOf(heroBlock()).text()).toContain(
      "Auf Mobilgeräten werden alle Blöcke zentriert untereinander gezeigt"
    );
  });
});

describe("HeroBlockForm, Darstellung and Sichtbarkeit", () => {
  it("edits the two spacings and the width", async () => {
    const wrapper = formOf(heroBlock());

    await choose(wrapper, "Außenabstand", "Sehr groß");
    expect(lastPatch(wrapper)).toEqual({ outerSpacing: "xl" });

    await choose(wrapper, "Innenabstand", "Klein");
    expect(lastPatch(wrapper)).toEqual({ innerSpacing: "sm" });

    await choose(wrapper, "Breite", "Volle Breite");
    expect(lastPatch(wrapper)).toEqual({ width: "full" });
  });

  /**
   * The Panel is an object now, and the switch speaks that shape: on writes
   * the „Glas“ preset, off writes `null`. The four keys have no controls yet —
   * the switch is still the whole of the Panel in this form.
   */
  it("turns the Panel on and off", async () => {
    const wrapper = formOf(heroBlock());
    const label = "Halbtransparente Fläche hinter dem Block";

    await toggle(wrapper, label);
    expect(lastPatch(wrapper)).toEqual({
      panel: { color: "white", opacity: 60, radius: "md", blur: true },
    });

    await wrapper.setProps({ block: heroBlock({ panel: GLASS }) });
    await toggle(wrapper, label);
    expect(lastPatch(wrapper)).toEqual({ panel: null });
  });

  it("reads a Block that carries a Panel as switched on", async () => {
    const wrapper = formOf(heroBlock({ panel: { ...GLASS, color: "black" } }));

    expect(
      switchOf(wrapper, "Halbtransparente Fläche hinter dem Block").props(
        "inputValue"
      )
    ).toBe(true);
  });

  it("carries the two visibility switches", async () => {
    const wrapper = formOf(heroBlock());

    await toggle(wrapper, "Nur auf der Startseite anzeigen");
    expect(lastPatch(wrapper)).toEqual({ homeOnly: true });

    await toggle(wrapper, "Auf Mobilgeräten ausblenden");
    expect(lastPatch(wrapper)).toEqual({ hideOnMobile: true });
  });
});

/**
 * Section 4 of the spec: the English view offers the German text as its
 * placeholder and says what leaving the field empty does. German is the
 * required locale, so it carries neither.
 */
describe("HeroBlockForm, the English view", () => {
  const HINT = "Leer: Deutsch wird angezeigt";

  it("offers the German text as the placeholder of an empty English one", () => {
    const wrapper = formOf(heroBlock({ text: { de: "Willkommen" } }), {
      locale: "en",
    });
    const field = fieldByLabel(wrapper, "Text (English)");

    expect(field.props("placeholder")).toBe("Willkommen");
    expect(field.props("persistentPlaceholder")).toBe(true);
    expect(field.props("hint")).toBe(HINT);
  });

  it("drops both once the English text is there", async () => {
    const wrapper = formOf(
      heroBlock({ text: { de: "Willkommen", en: "Welcome" } }),
      { locale: "en" }
    );

    expect(fieldByLabel(wrapper, "Text (English)").props("placeholder")).toBe(
      ""
    );
    expect(wrapper.text()).not.toContain(HINT);
  });

  it("leaves the German view without a placeholder or the hint", () => {
    const wrapper = formOf(heroBlock({ text: { de: "" } }));

    expect(fieldByLabel(wrapper, "Text").props("placeholder")).toBe("");
    expect(wrapper.text()).not.toContain(HINT);
  });

  it("offers the German alt text the same way, keeping its own hint", () => {
    const wrapper = formOf(heroImageBlock({ alt: { de: "Das Logo" } }), {
      locale: "en",
    });
    const field = fieldByLabel(wrapper, "Alternativtext (English)");

    expect(field.props("placeholder")).toBe("Das Logo");
    // What an alt text is for is what a translator needs to know too.
    expect(field.props("hint")).toContain(HINT);
    expect(field.props("hint")).toContain("Wird vorgelesen");
  });

  it("leaves the alt hint alone in the German view", () => {
    const wrapper = formOf(heroImageBlock());

    expect(fieldByLabel(wrapper, "Alternativtext").props("hint")).toBe(
      "Wird vorgelesen und angezeigt, wenn das Bild fehlt"
    );
  });

  it("offers the German rich text as the editor's placeholder", () => {
    const wrapper = formOf(heroRichtextBlock(), { locale: "en" });

    expect(editor(wrapper).props("label")).toBe("Willkommen");
    expect(wrapper.text()).toContain(HINT);
  });
});

/**
 * Section 9: a `400` of the round-trip or the save is shown at the control it
 * is about, beside whatever the local rules already say.
 */
describe("HeroBlockForm, the backend's messages", () => {
  it("shows the message of a text field under it", () => {
    const wrapper = formOf(heroBlock(), {
      errors: { text: "Höchstens 200 Zeichen." },
    });

    expect(fieldByLabel(wrapper, "Text").props("errorMessages")).toBe(
      "Höchstens 200 Zeichen."
    );
  });

  it("shows the message of a colour at the colour control", () => {
    const wrapper = formOf(heroBlock(), {
      errors: {
        color: "Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c.",
      },
    });

    expect(wrapper.findComponent({ name: "HeroColorField" }).text()).toContain(
      "Hex-Wert"
    );
  });

  it("shows the message of a rich text under the editor", () => {
    const wrapper = formOf(heroRichtextBlock(), {
      errors: { html: "Höchstens 10000 Zeichen." },
    });

    expect(wrapper.text()).toContain("Höchstens 10000 Zeichen.");
  });

  it("shows the message of an image under the media field", () => {
    const wrapper = formOf(heroImageBlock(), {
      errors: { image: "Das Bild ist nicht öffentlich." },
    });

    expect(wrapper.text()).toContain("Das Bild ist nicht öffentlich.");
  });
});
