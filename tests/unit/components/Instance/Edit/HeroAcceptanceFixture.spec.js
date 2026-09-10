/**
 * Acceptance 8 of the hero layout spec, as far as it can be proved without a
 * browser: the Shared contract's acceptance fixture — the Bad Belzig Hero — is
 * reachable from an empty layout **through the form alone**.
 *
 * The expected value is not derived here. `ACCEPTANCE_FIXTURE` below is the
 * contract's own JSON (`.scratch/hero-layout/spec.md`, „Acceptance fixture“),
 * transcribed; the spec builds a layout by clicking the real controls of the
 * real editor and compares what „Speichern“ would send against it. Nothing
 * between the click and the payload is stubbed: the Block list, the detail
 * form, the nudge pad, the Panel group and the rich-text editor are the ones
 * the author uses.
 *
 * What it cannot prove is what the two frames paint, what the backend stores
 * and what the public site shows — those need the live walk, scripted in
 * `.scratch/hero-layout/acceptance-walk-amendment.md`.
 */

import Vue from "vue";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  button,
  chooseOption,
  toggleSwitch,
} from "@tests/unit/support/vuetify";
import { stubProseMirrorLayout } from "@tests/unit/support/prosemirror";
import toasts from "@/store/modules/toasts";
import {
  HERO_BACKGROUND,
  heroLayout,
  heroLayoutResponse,
} from "@tests/unit/support/heroLayout";
import { HERO_PREVIEW_DEBOUNCE } from "@/utils/heroPreviewResolver";
import Tiptap from "@/components/Tiptap.vue";

vi.mock("@/services/api/ApiCatalogService", () => ({
  default: {
    getHeroLayout: vi.fn(),
    updateHeroLayout: vi.fn(),
    previewHeroLayout: vi.fn(),
  },
}));

import HeroEditorDialog from "@/components/Instance/Edit/HeroEditorDialog.vue";
import ApiCatalogService from "@/services/api/ApiCatalogService";

const THEME_COLORS = { primary: "#0b6e4f", secondary: "#c8102e" };
const WAPPEN = "wappen-media-id";

/** The claim, as the fixture's two lines read. */
const CLAIM = "Einfach buchen.";
const SUBLINE = "Alle Angebote in und um Bad Belzig zentral an einem Ort.";

/**
 * A tag with its attributes, so the expected markup carries no quotes of its
 * own — the same helper `Tiptap.spec.js` builds its fixtures with.
 *
 * @param {string} name - The element name.
 * @param {Object} attributes - Its attributes.
 * @param {string} text - Its content, already rendered.
 * @returns {string} The markup.
 */
function tag(name, attributes, text) {
  const rendered = Object.entries(attributes)
    .map(([attribute, value]) => ` ${attribute}=${JSON.stringify(value)}`)
    .join("");
  return `<${name}${rendered}>${text}</${name}>`;
}

/**
 * The Shared contract's acceptance fixture, transcribed from the spec. The two
 * `id`s and the `mediaId` are the only values the walk cannot dictate — the
 * editor mints a uuid per Block and the crest's id comes from the Mediathek —
 * so they stand here as the placeholders the comparison substitutes.
 */
const ACCEPTANCE_FIXTURE = Object.freeze({
  version: 1,
  height: "lg",
  mobileHeight: "lg",
  compactHeight: "sm",
  blocks: [
    {
      id: "belzig-crest",
      type: "image",
      zone: "middle-left",
      outerSpacing: "none",
      innerSpacing: "none",
      width: "sm",
      align: "center",
      panel: null,
      offset: { x: 0, y: 0.5 },
      layer: "front",
      homeOnly: false,
      hideOnMobile: false,
      image: { source: "media", mediaId: "<wappen.mediaId>" },
      alt: { de: "Wappen der Stadt Bad Belzig" },
      maxHeight: "sm",
      invertInDarkMode: false,
    },
    {
      id: "belzig-claim",
      type: "richtext",
      zone: "middle-left",
      outerSpacing: "none",
      innerSpacing: "md",
      width: "sm",
      align: "auto",
      panel: { color: "white", opacity: 100, radius: "md", blur: true },
      offset: { x: 0, y: 0 },
      layer: "back",
      homeOnly: false,
      hideOnMobile: false,
      html: {
        de:
          tag(
            "p",
            {},
            tag(
              "span",
              { class: "hero-size-2xl hero-color-primary" },
              tag("strong", {}, CLAIM)
            )
          ) +
          tag(
            "p",
            {},
            tag("span", { class: "hero-size-md hero-color-default" }, SUBLINE)
          ),
      },
      size: "md",
      color: "default",
      shadow: false,
    },
  ],
});

beforeAll(stubProseMirrorLayout);

beforeEach(() => {
  vi.clearAllMocks();
  toasts.state.collection = [];
});

/** The editor, opened the way the Portal tab opens it, on an empty layout. */
async function openEmptyEditor() {
  ApiCatalogService.getHeroLayout.mockResolvedValue(
    heroLayoutResponse({ heroLayout: heroLayout({ blocks: [] }) })
  );
  ApiCatalogService.previewHeroLayout.mockResolvedValue({
    data: {
      heroLayout: heroLayout({ blocks: [] }),
      background: HERO_BACKGROUND,
      name: "Marktplatz",
    },
  });

  const wrapper = mountComponent(HeroEditorDialog, {
    store: new Vuex.Store({ modules: { toasts } }),
    propsData: {
      value: false,
      portalUrl: "http://localhost:3000",
      themeColors: THEME_COLORS,
    },
    stubs: { MediaReferenceField: true, MediaReferenceImage: true },
  });
  await wrapper.setProps({ value: true });
  await flushPromises();
  await wrapper.vm.$nextTick();

  return wrapper;
}

function blockForm(wrapper) {
  return wrapper.findComponent({ name: "HeroBlockForm" });
}

/** „Block hinzufügen“ → the type, the way the menu is used. */
async function addBlock(wrapper, type) {
  await button(wrapper, "Block hinzufügen").trigger("click");
  await flushPromises();

  const entry = Array.from(
    document.querySelectorAll(".menuable__content__active .v-list-item")
  ).find((item) => item.textContent.trim() === type);
  if (!entry) {
    throw new Error(`Der Blocktyp „${type}“ steht nicht zur Wahl.`);
  }
  entry.click();
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/** A cell of the „Position“ grid. */
async function chooseZone(wrapper, zone) {
  const cell = blockForm(wrapper)
    .findAll(".hero-position-grid__cell")
    .wrappers.find((entry) => entry.attributes("data-zone") === zone);
  if (!cell) {
    throw new Error(`Die Zone „${zone}“ fehlt im Raster.`);
  }
  await cell.trigger("click");
  await wrapper.vm.$nextTick();
}

/** „Feinabstimmung“ is closed, and Vuetify renders nothing until it opens. */
async function openFine(wrapper) {
  await blockForm(wrapper)
    .find(".hero-block-form__fine .v-expansion-panel-header")
    .trigger("click");
  await Vue.nextTick();
  await flushPromises();
}

/** One click of the nudge pad, by the German word it carries. */
async function nudge(wrapper, direction) {
  const cell = blockForm(wrapper)
    .findAll(".hero-block-form__nudge")
    .wrappers.find((entry) => entry.attributes("aria-label") === direction);
  if (!cell) {
    throw new Error(`Die Richtung „${direction}“ fehlt am Pad.`);
  }
  await cell.trigger("click");
  await wrapper.vm.$nextTick();
}

/** One of the five drawn corner steps. */
async function chooseCorners(wrapper, label) {
  const corner = blockForm(wrapper)
    .findAll(".hero-block-form__corner")
    .wrappers.find((entry) => entry.attributes("aria-label") === label);
  if (!corner) {
    throw new Error(`Die Ecke „${label}“ fehlt.`);
  }
  await corner.trigger("click");
  await wrapper.vm.$nextTick();
}

/** A chip of a colour field, by the word an author reads on it. */
async function clickChip(root, label) {
  const chip = root
    .findAllComponents({ name: "v-chip" })
    .wrappers.find((entry) => entry.text().trim() === label);
  if (!chip) {
    throw new Error(`Der Chip „${label}“ fehlt.`);
  }
  await chip.trigger("click");
  await Vue.nextTick();
}

const KEY_END = 35;

/** „Deckkraft“ has no layout in jsdom; End is how a keyboard reaches 100. */
async function opacityToMaximum(wrapper) {
  const slider = blockForm(wrapper)
    .findAllComponents({ name: "v-slider" })
    .wrappers.find((entry) => entry.props("label") === "Deckkraft");
  if (!slider) {
    throw new Error("Der Regler „Deckkraft“ fehlt.");
  }
  await slider
    .find(".v-slider__thumb-container")
    .trigger("keydown", { keyCode: KEY_END });
  await wrapper.vm.$nextTick();
}

function editorOf(wrapper) {
  return blockForm(wrapper).findComponent(Tiptap);
}

/**
 * Places the selection over one paragraph. jsdom cannot select inside a
 * contenteditable, so the selection is placed through the editor's own API and
 * every format is applied by clicking the leiste, as `Tiptap.spec.js` does.
 */
async function selectParagraph(wrapper, index) {
  const editor = editorOf(wrapper).vm.editor;
  const ranges = [];
  editor.state.doc.forEach((node, offset) => {
    ranges.push({ from: offset + 1, to: offset + 1 + node.content.size });
  });
  editor.commands.setTextSelection(ranges[index]);
  await wrapper.vm.$nextTick();
}

/** A step of „Schriftgröße“ in the „Zeichen“ row, by its button. */
async function chooseInlineSize(wrapper, label) {
  const step = editorOf(wrapper)
    .findAll(".tiptap-size-scale button")
    .wrappers.find((entry) => entry.text().trim() === label);
  if (!step) {
    throw new Error(`Der Schritt „${label}“ fehlt an der Skala.`);
  }
  await step.trigger("click");
  await wrapper.vm.$nextTick();
}

/** A dot of „Farbe“ in the „Zeichen“ row, by its title. */
async function chooseInlineColor(wrapper, title) {
  const dot = editorOf(wrapper)
    .findAll(".tiptap-color-dots button")
    .wrappers.find((entry) => entry.attributes("title") === title);
  if (!dot) {
    throw new Error(`Die Farbe „${title}“ fehlt.`);
  }
  await dot.trigger("click");
  await wrapper.vm.$nextTick();
}

/** „Fett“ carries the only bold icon of the leiste. */
async function clickBold(wrapper) {
  const bold = editorOf(wrapper)
    .findAll(".tiptap-toolbar button")
    .wrappers.find((entry) => entry.find(".mdi-format-bold").exists());
  if (!bold) {
    throw new Error("Der Fett-Knopf fehlt.");
  }
  await bold.trigger("click");
  await wrapper.vm.$nextTick();
}

/** The debounced round-trip, so „Speichern“ is not held back by a stale one. */
async function settlePreview(wrapper) {
  await new Promise((resolve) =>
    setTimeout(resolve, HERO_PREVIEW_DEBOUNCE + 20)
  );
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * The layout with the values only the machine chooses put back to the
 * fixture's placeholders, so the comparison is about what the author built.
 */
function withFixtureIds(layout) {
  const names = ["belzig-crest", "belzig-claim"];

  return {
    ...layout,
    blocks: layout.blocks.map((block, index) => {
      const named = { ...block, id: names[index] };
      if (named.image) {
        named.image = { ...named.image, mediaId: "<wappen.mediaId>" };
      }
      return named;
    }),
  };
}

describe("the amendment's acceptance fixture, built through the form", () => {
  it("sends the Bad Belzig Hero of the Shared contract", async () => {
    const wrapper = await openEmptyEditor();
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: heroLayout({ blocks: [] }),
        background: HERO_BACKGROUND,
        name: "Marktplatz",
      },
    });

    // The crest goes in first: the array order is the paint order, and the
    // fixture reads the crest above the claim on mobile.
    await addBlock(wrapper, "Bild");
    await chooseZone(wrapper, "middle-left");
    blockForm(wrapper)
      .findComponent({ name: "MediaReferenceField" })
      .vm.$emit("input", { source: "media", mediaId: WAPPEN });
    await wrapper.vm.$nextTick();
    await blockForm(wrapper)
      .find(".hero-block-form__alt input")
      .setValue("Wappen der Stadt Bad Belzig");
    await chooseOption(blockForm(wrapper), "Maximale Höhe", "Klein");

    await openFine(wrapper);
    await chooseOption(blockForm(wrapper), "Breite", "Schmal");
    await chooseOption(blockForm(wrapper), "Ausrichtung", "Zentriert");

    // One step down hangs it over the Panel's upper edge; „Im Vordergrund“ is
    // what paints it over the Panel rather than under it.
    await nudge(wrapper, "Nach unten");
    await toggleSwitch(blockForm(wrapper), "Im Vordergrund");

    // The claim, behind it in the same Zone.
    await addBlock(wrapper, "Formatierter Text");
    editorOf(wrapper)
      .vm.editor.chain()
      .focus("end")
      .insertContent(`<p>${CLAIM}</p><p>${SUBLINE}</p>`)
      .run();
    await wrapper.vm.$nextTick();

    await selectParagraph(wrapper, 0);
    await chooseInlineSize(wrapper, "2XL");
    await chooseInlineColor(wrapper, "Primärfarbe");
    await clickBold(wrapper);

    await selectParagraph(wrapper, 1);
    await chooseInlineSize(wrapper, "M");
    await chooseInlineColor(wrapper, "Standard");

    await toggleSwitch(blockForm(wrapper), "Fläche hinter dem Block");
    await clickChip(
      blockForm(wrapper).find(".hero-block-form__panel-color"),
      "Weiß"
    );
    await opacityToMaximum(wrapper);
    await chooseCorners(wrapper, "Rund");
    await chooseCorners(wrapper, "Mittel");

    await openFine(wrapper);
    await chooseOption(blockForm(wrapper), "Breite", "Schmal");
    await chooseOption(blockForm(wrapper), "Innenabstand", "Mittel");

    await settlePreview(wrapper);
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    const sent = ApiCatalogService.updateHeroLayout.mock.calls.at(-1)[0];

    expect(withFixtureIds(sent.heroLayout)).toEqual(ACCEPTANCE_FIXTURE);
  });

  /**
   * The admin's half of „saving and reloading returns exactly what was built“.
   * The other half — that the backend stores and answers these bytes — is the
   * live walk's; here the fixture stands in for what the read route answers,
   * and the editor must neither complete nor repair anything in it.
   */
  it("reloads the stored fixture with nothing to write and the marks intact", async () => {
    ApiCatalogService.getHeroLayout.mockResolvedValue(
      heroLayoutResponse({
        heroLayout: ACCEPTANCE_FIXTURE,
        isDefault: false,
      })
    );
    ApiCatalogService.previewHeroLayout.mockResolvedValue({
      data: {
        heroLayout: ACCEPTANCE_FIXTURE,
        background: HERO_BACKGROUND,
        name: "Marktplatz",
      },
    });

    const wrapper = mountComponent(HeroEditorDialog, {
      store: new Vuex.Store({ modules: { toasts } }),
      propsData: {
        value: false,
        portalUrl: "http://localhost:3000",
        themeColors: THEME_COLORS,
      },
      stubs: { MediaReferenceField: true, MediaReferenceImage: true },
    });
    await wrapper.setProps({ value: true });
    await flushPromises();
    await wrapper.vm.$nextTick();

    // The Draft is the fixture, key for key: a layout that arrives whole is
    // completed nowhere and repaired nowhere on the way in.
    expect(wrapper.vm.draft.heroLayout).toEqual(ACCEPTANCE_FIXTURE);

    // And so there is nothing to write: „Speichern“ stays disabled until the
    // author changes something.
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );

    const claim = wrapper
      .findAll(".hero-block-row")
      .wrappers.find((entry) => entry.attributes("data-id") === "belzig-claim");
    await claim.trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    // The marks survive the editor: the two runs load back out with their
    // size and colour classes, and the bold inside the first span.
    expect(editorOf(wrapper).vm.editor.getHTML()).toBe(
      ACCEPTANCE_FIXTURE.blocks[1].html.de
    );
  });
});
