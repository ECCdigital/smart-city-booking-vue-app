import Vue from "vue";
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
import HeroColorField from "@/components/Instance/Edit/HeroColorField.vue";

const THEME_COLORS = { primary: "#123456", secondary: "#654321" };

const PANEL_SWITCH = "Fläche hinter dem Block";
const PANEL_COLOR = ".hero-block-form__panel-color";
const BLUR_SWITCH = "Hintergrund weichzeichnen";

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

/** The link button of the leiste, which carries the only link icon there. */
function linkButton(wrapper) {
  const found = wrapper
    .findAll(".tiptap-toolbar button")
    .wrappers.find((entry) => entry.find(".mdi-link").exists());
  if (!found) {
    throw new Error("Der Link-Knopf fehlt.");
  }
  return found;
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

function chips(root) {
  return root
    .findAllComponents({ name: "v-chip" })
    .wrappers.map((chip) => ({ chip, label: chip.text().trim() }));
}

function chipLabels(root) {
  return chips(root).map((entry) => entry.label);
}

/**
 * A colour control by its class: the Block's own, or the Panel's — the two
 * speak different vocabularies and stand in the same form.
 */
function colorField(wrapper, selector = ".hero-block-form__color") {
  const field = wrapper.find(selector);
  if (!field.exists()) {
    throw new Error(`Die Farbwahl „${selector}“ fehlt.`);
  }
  return field;
}

async function clickChip(root, label) {
  const entry = chips(root).find((candidate) => candidate.label === label);
  if (!entry) {
    throw new Error(`Der Chip „${label}“ fehlt.`);
  }
  await entry.chip.trigger("click");
  await Vue.nextTick();
}

// „End“ puts a slider at its maximum, „Home“ at its minimum. The mouse needs
// a laid-out track, which jsdom has none of; the keyboard is the interaction
// that works here — and one a user has too.
const KEY_END = 35;
const KEY_HOME = 36;

function sliderByLabel(wrapper, label) {
  const slider = wrapper
    .findAllComponents({ name: "v-slider" })
    .wrappers.find((entry) => entry.props("label") === label);
  if (!slider) {
    throw new Error(`Der Regler „${label}“ fehlt.`);
  }
  return slider;
}

async function pressOnSlider(wrapper, label, keyCode) {
  await sliderByLabel(wrapper, label)
    .find(".v-slider__thumb-container")
    .trigger("keydown", { keyCode });
  await Vue.nextTick();
}

/** Opens „Feinabstimmung“, whose content Vuetify only renders once asked. */
async function openFine(wrapper) {
  await wrapper
    .find(".hero-block-form__fine .v-expansion-panel-header")
    .trigger("click");
  await Vue.nextTick();
  await flushPromises();
}

function fineSelectLabels(wrapper) {
  return wrapper
    .find(".hero-block-form__fine")
    .findAllComponents({ name: "v-select" })
    .wrappers.map((entry) => entry.props("label"));
}

function corners(wrapper) {
  return wrapper.findAll(".hero-block-form__corner").wrappers;
}

function cornerLabels(wrapper) {
  return corners(wrapper).map((entry) => entry.attributes("aria-label"));
}

function corner(wrapper, label) {
  const found = corners(wrapper).find(
    (entry) => entry.attributes("aria-label") === label
  );
  if (!found) {
    throw new Error(`Die Ecke „${label}“ fehlt.`);
  }
  return found;
}

/** The groups of „Darstellung“, in the order they stand on screen. */
function darstellungGroups(wrapper) {
  const marker = /hero-block-form__(panel|lage|fine)(?:\s|$)/;

  return Array.from(
    wrapper.element.querySelectorAll(
      ".hero-block-form__panel, .hero-block-form__lage, .hero-block-form__fine"
    )
  ).map((element) => element.className.match(marker)[1]);
}

/** A cell of the „Lage“ pad, by the German word it carries. */
function nudge(wrapper, label) {
  const found = wrapper
    .findAll(".hero-block-form__nudge")
    .wrappers.find((entry) => entry.attributes("aria-label") === label);
  if (!found) {
    throw new Error(`Die Richtung „${label}“ fehlt.`);
  }
  return found;
}

function nudgeLabels(wrapper) {
  return wrapper
    .findAll(".hero-block-form__nudge")
    .wrappers.map((entry) => entry.attributes("aria-label"));
}

async function clickNudge(wrapper, label) {
  await nudge(wrapper, label).trigger("click");
  await Vue.nextTick();
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

/**
 * An HTML attribute needs the double quotes the lint rule on quotes will not
 * let a literal spell, so the markup below is composed rather than written.
 */
function attr(name, value) {
  return ` ${name}=${JSON.stringify(value)}`;
}

/**
 * Rich text carrying one of everything the contract allows a run of words and
 * a paragraph to be, in the shape the editor itself writes it — an aligned
 * paragraph, an inline size, a colour token, the three character marks, a
 * custom hex with the `style` the admin paints it by, a link and a list.
 */
const MARKED_UP =
  `<p${attr("class", "hero-align-center")}>Ein ` +
  `<span${attr("class", "hero-size-lg hero-color-primary")}>Wort</span> und ` +
  "<strong>fett</strong> und <em>kursiv</em> und <u>unterstrichen</u> und " +
  `<span${attr("data-color", "#1a2b3c")}${attr("style", "color:#1a2b3c")}>` +
  "eigen</span> und " +
  `<a${attr("target", "_blank")}${attr("rel", "noopener noreferrer")}` +
  `${attr("href", "https://example.org/")}>ein Link</a></p>` +
  "<ul><li><p>Punkt</p></li></ul>";

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

  it("carries the shadow switch and the colour control, and no Fett", async () => {
    const wrapper = formOf(heroRichtextBlock());

    expect(chipLabels(colorField(wrapper))).toEqual([
      "Standard",
      "Primärfarbe",
      "Sekundärfarbe",
      "Weiß",
      "Eigene…",
    ]);
    expect(() => switchByLabel(wrapper, "Fett")).toThrow();

    await toggle(wrapper, "Schatten für bessere Lesbarkeit");

    expect(lastPatch(wrapper)).toEqual({ shadow: true });
  });

  /**
   * The Block's own size is what a run of words inherits while it carries no
   * class of its own, so a rich-text Block edits it on the same six steps a
   * text Block does (hero layout spec §7).
   */
  it("edits its own Schriftgröße on the six steps of the scale", async () => {
    const wrapper = formOf(heroRichtextBlock({ size: "lg" }));
    const select = selectByLabel(wrapper, "Schriftgröße");

    expect(select.props("items")).toEqual([
      { value: "xs", text: "Sehr klein" },
      { value: "sm", text: "Klein" },
      { value: "md", text: "Normal" },
      { value: "lg", text: "Groß" },
      { value: "xl", text: "Sehr groß" },
      { value: "2xl", text: "Riesig" },
    ]);
    expect(select.props("value")).toBe("lg");

    await choose(wrapper, "Schriftgröße", "Riesig");

    expect(lastPatch(wrapper)).toEqual({ size: "2xl" });
  });

  /**
   * The editor runs with size, colour and alignment switched on, and its two
   * token dots are painted with the instance's own branding — the same source
   * the Block's colour control reads (hero layout spec §7).
   */
  it("mounts the editor with all four new props and the real theme colours", async () => {
    const wrapper = formOf(heroRichtextBlock());
    await wrapper.vm.$nextTick();
    const tiptap = editor(wrapper);

    expect(tiptap.props("sizes")).toBe(true);
    expect(tiptap.props("colors")).toBe(true);
    expect(tiptap.props("paragraphAlign")).toBe(true);
    expect(tiptap.props("themeColors")).toBe(THEME_COLORS);
    expect(tiptap.props("themeColors")).toBe(
      wrapper.findComponent(HeroColorField).props("themeColors")
    );
  });

  /**
   * The new controls split the leiste into two captioned rows. Everything the
   * Hero Editor already relied on has to survive that: the counter against
   * 10 000 and the link button beside the character marks.
   */
  it("keeps the counter counting and the link button working in the two-row leiste", async () => {
    const wrapper = formOf(heroRichtextBlock());
    await wrapper.vm.$nextTick();

    expect(
      wrapper
        .findAll(".tiptap-toolbar__caption")
        .wrappers.map((caption) => caption.text())
    ).toEqual(["Zeichen", "Absatz"]);
    expect(wrapper.find(".tiptap-counter").text()).toBe("17 / 10000");

    await typeInEditor(wrapper, "!");
    expect(wrapper.find(".tiptap-counter").text()).toBe("18 / 10000");

    await linkButton(wrapper).trigger("click");
    await Vue.nextTick();

    expect(editor(wrapper).vm.linkDialog).toBe(true);
  });

  /**
   * Half of the round-trip criterion: what the backend hands back loads into
   * the editor unchanged. The editor's own normaliser repairs hand-forged
   * markup, so the proof that it repairs *nothing* here is that the HTML
   * comes back byte-identical and the form emits no patch — a repair would
   * be a change, and a change would travel up as one.
   */
  it("loads marked-up rich text back out byte-identical, with no repair", async () => {
    const wrapper = formOf(heroRichtextBlock({ html: { de: MARKED_UP } }));
    await wrapper.vm.$nextTick();

    expect(editor(wrapper).vm.editor.getHTML()).toBe(MARKED_UP);
    expect(wrapper.emitted("input")).toBeUndefined();
  });

  /**
   * Each locale view gets its own editor instance, so the toggle throws one
   * away and builds the other: the marks of both have to survive that, and
   * neither view may repair the text of the one it replaced.
   */
  it("keeps the marks in both locale views across the language toggle", async () => {
    const english = MARKED_UP.replace("Wort", "word");
    const wrapper = formOf(
      heroRichtextBlock({ html: { de: MARKED_UP, en: english } })
    );
    await wrapper.vm.$nextTick();

    expect(editor(wrapper).vm.editor.getHTML()).toBe(MARKED_UP);

    await wrapper.setProps({ locale: "en" });
    await wrapper.vm.$nextTick();
    expect(editor(wrapper).vm.editor.getHTML()).toBe(english);

    await wrapper.setProps({ locale: "de" });
    await wrapper.vm.$nextTick();
    expect(editor(wrapper).vm.editor.getHTML()).toBe(MARKED_UP);
    expect(wrapper.emitted("input")).toBeUndefined();
  });

  it("puts the size and the colour above the editor, side by side", () => {
    const wrapper = formOf(heroRichtextBlock());
    const typography = wrapper.find(".hero-block-form__typography");

    // Both controls stand in the one row, and the row stands before the
    // editor — DOCUMENT_POSITION_FOLLOWING is "the editor comes after this".
    expect(typography.find(".hero-block-form__size").exists()).toBe(true);
    expect(typography.findComponent(HeroColorField).exists()).toBe(true);
    expect(
      typography.element.compareDocumentPosition(editor(wrapper).element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("reads a Block that stores no size as „Normal“", () => {
    const block = heroRichtextBlock();
    delete block.size;

    expect(selectByLabel(formOf(block), "Schriftgröße").props("value")).toBe(
      "md"
    );
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
    expect(() => colorField(wrapper)).toThrow();
  });
});

describe("HeroBlockForm, the colour control", () => {
  it("offers the five chips", () => {
    expect(chipLabels(colorField(formOf(heroBlock())))).toEqual([
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
  /**
   * The four controls a Block inherits rather than owns are demoted: they
   * start folded away, so „Darstellung“ opens with the Block's own look.
   */
  it("keeps the four inherited controls in a closed Feinabstimmung", async () => {
    const wrapper = formOf(heroBlock());

    expect(wrapper.text()).toContain("Feinabstimmung");
    expect(() => selectByLabel(wrapper, "Breite")).toThrow();

    await openFine(wrapper);

    expect(fineSelectLabels(wrapper)).toEqual([
      "Ausrichtung",
      "Außenabstand",
      "Innenabstand",
      "Breite",
    ]);
  });

  it("edits the two spacings and the width", async () => {
    const wrapper = formOf(heroBlock());
    await openFine(wrapper);

    await choose(wrapper, "Außenabstand", "Sehr groß");
    expect(lastPatch(wrapper)).toEqual({ outerSpacing: "xl" });

    await choose(wrapper, "Innenabstand", "Klein");
    expect(lastPatch(wrapper)).toEqual({ innerSpacing: "sm" });

    await choose(wrapper, "Breite", "Volle Breite");
    expect(lastPatch(wrapper)).toEqual({ width: "full" });
  });

  /**
   * The Panel group leads the section now: the switch speaks the object's
   * shape — on writes the „Glas“ preset, off writes `null` — under its own
   * name. „Halbtransparente Fläche hinter dem Block“ is gone with it.
   */
  it("turns the Panel on and off", async () => {
    const wrapper = formOf(heroBlock());

    expect(wrapper.text()).not.toContain("Halbtransparente Fläche");

    await toggle(wrapper, PANEL_SWITCH);
    expect(lastPatch(wrapper)).toEqual({
      panel: { color: "white", opacity: 60, radius: "md", blur: true },
    });

    await wrapper.setProps({ block: heroBlock({ panel: GLASS }) });
    await toggle(wrapper, PANEL_SWITCH);
    expect(lastPatch(wrapper)).toEqual({ panel: null });
  });

  it("reads a Block that carries a Panel as switched on", async () => {
    const wrapper = formOf(heroBlock({ panel: { ...GLASS, color: "black" } }));

    expect(switchOf(wrapper, PANEL_SWITCH).props("inputValue")).toBe(true);
  });

  /**
   * The chip is the preset, not a second switch: it writes all four keys back
   * from any state, including from a Panel that is off — restoring „Glas“ is
   * what an author who has lost the thread reaches for.
   */
  it("restores the Glas preset from any state with the chip", async () => {
    const wrapper = formOf(
      heroBlock({
        panel: { color: "#123456", opacity: 5, radius: "full", blur: false },
      })
    );

    await clickChip(wrapper, "Glas");
    expect(lastPatch(wrapper)).toEqual({ panel: GLASS });

    await wrapper.setProps({ block: heroBlock({ panel: null }) });
    await clickChip(wrapper, "Glas");
    expect(lastPatch(wrapper)).toEqual({ panel: GLASS });
  });

  it("keeps the Panel's controls out of the way while it is off", () => {
    const wrapper = formOf(heroBlock({ panel: null }));

    expect(() => colorField(wrapper, PANEL_COLOR)).toThrow();
    expect(wrapper.text()).not.toContain("Deckkraft");
    expect(wrapper.text()).not.toContain("Ecken");
    expect(() => switchByLabel(wrapper, "Hintergrund weichzeichnen")).toThrow();
  });

  /**
   * The Panel's colour speaks its own vocabulary: „Schwarz“ is Panel-only and
   * „Standard“ has no meaning behind a Block (Shared contract, „Panel“).
   */
  it("offers the Panel's own five colour dots", () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));

    expect(chipLabels(colorField(wrapper, PANEL_COLOR))).toEqual([
      "Weiß",
      "Schwarz",
      "Primärfarbe",
      "Sekundärfarbe",
      "Eigene…",
    ]);
  });

  it("writes only the Panel's colour when a dot is clicked", async () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));

    await clickChip(colorField(wrapper, PANEL_COLOR), "Schwarz");
    expect(lastPatch(wrapper)).toEqual({
      panel: { ...GLASS, color: "black" },
    });
  });

  it("leaves the Block's own colour control speaking its own words", () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));

    expect(chipLabels(colorField(wrapper))).toEqual([
      "Standard",
      "Primärfarbe",
      "Sekundärfarbe",
      "Weiß",
      "Eigene…",
    ]);
  });

  it("covers 0 to 100 with Deckkraft and shows the per-cent readout", async () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));
    const slider = sliderByLabel(wrapper, "Deckkraft");

    expect(slider.props("min")).toBe("0");
    expect(slider.props("max")).toBe("100");
    expect(slider.props("step")).toBe("1");
    expect(wrapper.text()).toContain("60 %");

    await pressOnSlider(wrapper, "Deckkraft", KEY_END);
    expect(lastPatch(wrapper)).toEqual({ panel: { ...GLASS, opacity: 100 } });
  });

  it("lets Deckkraft reach nought, which is a value and not a fault", async () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));

    await pressOnSlider(wrapper, "Deckkraft", KEY_HOME);
    expect(lastPatch(wrapper)).toEqual({ panel: { ...GLASS, opacity: 0 } });
  });

  /**
   * The five corner steps carry glyphs rather than words, so the German words
   * of the spec (§12) are what their `title` and `aria-label` say.
   */
  it("offers the five corner steps of Ecken", () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));

    expect(cornerLabels(wrapper)).toEqual([
      "Kein",
      "Klein",
      "Mittel",
      "Groß",
      "Rund",
    ]);
    expect(corner(wrapper, "Mittel").attributes("aria-pressed")).toBe("true");
  });

  it("writes only the radius when a corner step is picked", async () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));

    await corner(wrapper, "Rund").trigger("click");
    await Vue.nextTick();

    expect(lastPatch(wrapper)).toEqual({ panel: { ...GLASS, radius: "full" } });
  });

  it("writes only the blur when the weichzeichnen switch moves", async () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }));

    expect(switchOf(wrapper, BLUR_SWITCH).props("inputValue")).toBe(true);

    await toggle(wrapper, BLUR_SWITCH);
    expect(lastPatch(wrapper)).toEqual({ panel: { ...GLASS, blur: false } });
  });

  /**
   * „Ausrichtung“ places the Block's content inside its own box, so it is a
   * control of every type — the image of an image Block as much as the lines
   * of a text (hero layout spec §11).
   */
  it("offers Ausrichtung on every Block type", async () => {
    for (const block of [heroBlock(), heroRichtextBlock(), heroImageBlock()]) {
      const wrapper = formOf(block);
      await openFine(wrapper);

      expect(selectByLabel(wrapper, "Ausrichtung").props("items")).toEqual([
        { value: "auto", text: "Automatisch" },
        { value: "left", text: "Links" },
        { value: "center", text: "Zentriert" },
        { value: "right", text: "Rechts" },
      ]);
    }
  });

  it("writes the picked alignment", async () => {
    const wrapper = formOf(heroBlock());
    await openFine(wrapper);

    await choose(wrapper, "Ausrichtung", "Zentriert");
    expect(lastPatch(wrapper)).toEqual({ align: "center" });
  });

  /**
   * A Block that shrinks to fit has nothing to align inside, so „Automatisch“
   * as a width earns the second hint — and loses it again at any fixed one.
   */
  it("warns that alignment needs a width while Breite is Automatisch", async () => {
    const wrapper = formOf(heroBlock({ width: "auto" }));
    await openFine(wrapper);
    const hint = () => selectByLabel(wrapper, "Ausrichtung").props("hint");

    expect(hint()).toContain("Automatisch folgt der Spalte der Position.");
    expect(hint()).toContain("Wirkt erst ab einer festen Breite.");

    await wrapper.setProps({ block: heroBlock({ width: "md" }) });

    expect(hint()).toContain("Automatisch folgt der Spalte der Position.");
    expect(hint()).not.toContain("Wirkt erst ab einer festen Breite.");
  });

  /**
   * „Eigene…“ opens the same hex picker the Block's colour field uses, and
   * drops the alpha it offers — the contract has no room for one anywhere.
   */
  it("takes a custom Panel colour from the picker without its alpha", async () => {
    const wrapper = formOf(
      heroBlock({ panel: { ...GLASS, color: "#1a2b3c" } })
    );

    await clickChip(colorField(wrapper, PANEL_COLOR), "#1a2b3c");
    await flushPromises();
    wrapper
      .findComponent({ name: "v-color-picker" })
      .vm.$emit("input", "#aabbcc80");
    await Vue.nextTick();

    expect(lastPatch(wrapper)).toEqual({
      panel: { ...GLASS, color: "#aabbcc" },
    });
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

  it("puts a Panel fault under the control it is about", () => {
    const wrapper = formOf(heroBlock({ panel: GLASS }), {
      errors: {
        "panel.color": "Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c.",
        "panel.opacity":
          "Bitte einen ganzen Prozentwert zwischen 0 und 100 angeben.",
      },
    });

    expect(colorField(wrapper, PANEL_COLOR).text()).toContain(
      "Bitte eine Farbe als Hex-Wert angeben"
    );
    expect(sliderByLabel(wrapper, "Deckkraft").props("errorMessages")).toBe(
      "Bitte einen ganzen Prozentwert zwischen 0 und 100 angeben."
    );
  });

  it("marks an invalid custom Panel colour without waiting for the backend", () => {
    const wrapper = formOf(heroBlock({ panel: { ...GLASS, color: "#12345" } }));

    expect(colorField(wrapper, PANEL_COLOR).text()).toContain(
      "Bitte eine Farbe als Hex-Wert angeben"
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

/**
 * „Lage“ — the nudge pad and „Im Vordergrund“ (hero layout spec §7). The pad
 * reads as placement, so its cells carry arrows and their German words rather
 * than numbers, and it cannot produce a value the contract refuses.
 */
describe("HeroBlockForm, Lage", () => {
  it("stands between the Panel group and Feinabstimmung", () => {
    expect(darstellungGroups(formOf(heroBlock()))).toEqual([
      "panel",
      "lage",
      "fine",
    ]);
  });

  it("carries the eight directions and the reset, each named in German", () => {
    const wrapper = formOf(heroBlock());

    expect(nudgeLabels(wrapper)).toEqual([
      "Nach links oben",
      "Nach oben",
      "Nach rechts oben",
      "Nach links",
      "Versatz zurücksetzen",
      "Nach rechts",
      "Nach links unten",
      "Nach unten",
      "Nach rechts unten",
    ]);
    nudgeLabels(wrapper).forEach((label) => {
      expect(nudge(wrapper, label).attributes("title")).toBe(label);
    });
  });

  it("moves the Block one 0.5 rem step in the direction that was clicked", async () => {
    const wrapper = formOf(heroBlock());

    await clickNudge(wrapper, "Nach rechts");

    expect(lastPatch(wrapper)).toEqual({ offset: { x: 0.5, y: 0 } });
  });

  it("stops at the sixth step and disables the exhausted cell", async () => {
    const wrapper = formOf(heroBlock({ offset: { x: 2.5, y: 0 } }));

    await clickNudge(wrapper, "Nach rechts");

    expect(lastPatch(wrapper)).toEqual({ offset: { x: 3, y: 0 } });
    expect(nudge(wrapper, "Nach rechts").attributes("disabled")).toBeFalsy();

    const atEdge = formOf(heroBlock({ offset: { x: 3, y: 0 } }));

    expect(nudge(atEdge, "Nach rechts").attributes("disabled")).toBe(
      "disabled"
    );
    // The other axis still has room, so the diagonal is still a move.
    expect(
      nudge(atEdge, "Nach rechts unten").attributes("disabled")
    ).toBeFalsy();
    expect(nudge(atEdge, "Nach links").attributes("disabled")).toBeFalsy();
  });

  it("resets from the middle cell, which is disabled while there is no Versatz", async () => {
    const zero = formOf(heroBlock());

    expect(nudge(zero, "Versatz zurücksetzen").attributes("disabled")).toBe(
      "disabled"
    );

    const moved = formOf(heroBlock({ offset: { x: -1.5, y: 2 } }));

    expect(
      nudge(moved, "Versatz zurücksetzen").attributes("disabled")
    ).toBeFalsy();

    await clickNudge(moved, "Versatz zurücksetzen");

    expect(lastPatch(moved)).toEqual({ offset: { x: 0, y: 0 } });
  });

  it("counts the Versatz in steps beside the pad", () => {
    const lage = (block) => formOf(block).find(".hero-block-form__lage").text();

    expect(lage(heroBlock())).toContain("Kein Versatz");
    expect(lage(heroBlock({ offset: { x: 2, y: -0.5 } }))).toContain(
      "4 nach rechts · 1 nach oben (Schritte)"
    );
  });

  it("writes front and back with Im Vordergrund", async () => {
    const wrapper = formOf(heroBlock({ layer: "back" }));

    expect(switchOf(wrapper, "Im Vordergrund").props("inputValue")).toBe(false);

    await toggle(wrapper, "Im Vordergrund");

    expect(lastPatch(wrapper)).toEqual({ layer: "front" });

    const front = formOf(heroBlock({ layer: "front" }));

    expect(switchOf(front, "Im Vordergrund").props("inputValue")).toBe(true);

    await toggle(front, "Im Vordergrund");

    expect(lastPatch(front)).toEqual({ layer: "back" });
  });
});
