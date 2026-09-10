import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  forbiddenError,
  serverError,
  validationError,
} from "@tests/unit/support/api";
import {
  button,
  chooseOption,
  selectByLabel,
} from "@tests/unit/support/vuetify";
import toasts from "@/store/modules/toasts";
import {
  HERO_BACKGROUND,
  backgroundFamilyCard as backgroundCard,
  backgroundIssues,
  chooseBackgroundFamily,
  heroBlock,
  heroImageBlock,
  heroLayout,
  heroLayoutResponse,
} from "@tests/unit/support/heroLayout";
import {
  defaultHeroBackground,
  heroBackgroundOfFamily,
} from "@/utils/heroBackground";
import { HERO_PREVIEW_DEBOUNCE } from "@/utils/heroPreviewResolver";
import {
  HERO_PREVIEW_PROTOCOL,
  HERO_PREVIEW_REPORT,
} from "@/utils/heroPreviewProtocol";

vi.mock("@/services/api/ApiCatalogService", () => ({
  default: {
    getHeroLayout: vi.fn(),
    updateHeroLayout: vi.fn(),
    previewHeroLayout: vi.fn(),
  },
}));

import HeroEditorDialog from "@/components/Instance/Edit/HeroEditorDialog.vue";
import ApiCatalogService from "@/services/api/ApiCatalogService";

const DEFAULT_STATUS = "Standard-Layout (folgt Portalname und Logo)";
const BACKGROUND = HERO_BACKGROUND;
const layout = heroLayout;

/** What the read route answers an instance that never stored a layout. */
const storedNothing = heroLayoutResponse;

function storedLayout(overrides = {}) {
  return heroLayoutResponse({
    heroLayout: heroLayout({ height: "sm", ...overrides }),
    isDefault: false,
  });
}

/**
 * The editor fills itself when the dialog opens, so a spec opens it the way
 * the Portal tab does instead of mounting it open.
 */
async function openEditor(answer = storedNothing(), propsData = {}) {
  ApiCatalogService.getHeroLayout.mockResolvedValue(answer);
  const wrapper = mountComponent(HeroEditorDialog, {
    store: new Vuex.Store({ modules: { toasts } }),
    propsData: { value: false, ...propsData },
    // The Mediathek picker of the Background's image family talks to the media
    // API and reads the signed-in user; neither is what this editor is about.
    stubs: { MediaReferenceField: true, MediaReferenceImage: true },
  });
  await wrapper.setProps({ value: true });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * `v-dialog` detaches its content into the `data-app` container, so the
 * wrapper's own element stays empty — everything is read through the
 * component tree.
 */
function editorText(wrapper) {
  return wrapper.findComponent({ name: "v-card" }).text();
}

/**
 * „Höhe“, the section — the search for a height select has to stay inside it,
 * because „Hintergrund“ carries selects of its own further down the form.
 */
function heightSection(wrapper) {
  return wrapper
    .findAllComponents({ name: "SubSection" })
    .wrappers.find((entry) => entry.props("title") === "Höhe");
}

function heightSelects(wrapper) {
  return heightSection(wrapper).findAllComponents({ name: "v-select" })
    .wrappers;
}

/** One of the three height selects, by the label the user reads. */
function heightSelect(wrapper, label) {
  return selectByLabel(heightSection(wrapper), label);
}

/** The step a closed height select shows. */
function chosenHeight(wrapper, label) {
  return heightSelect(wrapper, label).find(".v-select__selection").text();
}

function chooseHeight(wrapper, label, step) {
  return chooseOption(heightSection(wrapper), label, step);
}

function toastMessages(wrapper) {
  return wrapper.vm.$store.getters["toasts/all"].map((toast) => toast.message);
}

function blockForm(wrapper) {
  return wrapper.findComponent({ name: "HeroBlockForm" });
}

function row(wrapper, id) {
  return wrapper
    .findAll(".hero-block-row")
    .wrappers.find((entry) => entry.attributes("data-id") === id);
}

function leaveDialog(wrapper) {
  return wrapper.findComponent({ name: "UnsavedChangesDialog" });
}

/** What the preview route answers, in Theme Bundle export form. */
const RESOLVED = Object.freeze({
  heroLayout: heroLayout({ height: "xl" }),
  background: HERO_BACKGROUND,
  name: "Marktplatz",
});

/**
 * The round-trip is debounced, so a spec that wants to see it has to wait the
 * debounce out before the promises can settle.
 */
async function settlePreview(wrapper) {
  await new Promise((resolve) =>
    setTimeout(resolve, HERO_PREVIEW_DEBOUNCE + 20)
  );
  await flushPromises();
  await wrapper.vm.$nextTick();
}

function livePreview(wrapper) {
  return wrapper.findComponent({ name: "HeroLivePreview" });
}

/** The header's language toggle, driven the way the author drives it. */
async function switchToEnglish(wrapper) {
  await button(wrapper, "English").trigger("click");
  await wrapper.vm.$nextTick();
}

beforeEach(() => {
  vi.clearAllMocks();
  // The toasts module carries a plain object as its state, so every store
  // built in this file shares one collection — without this every spec would
  // read the toasts of the ones before it too.
  toasts.state.collection = [];
});

describe("HeroEditorDialog loading", () => {
  it("shows a skeleton while the layout loads", async () => {
    let answer;
    ApiCatalogService.getHeroLayout.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    const wrapper = mountComponent(HeroEditorDialog, {
      store: new Vuex.Store({ modules: { toasts } }),
      propsData: { value: false },
    });

    await wrapper.setProps({ value: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: "v-skeleton-loader" }).exists()).toBe(
      true
    );

    answer(storedNothing());
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: "v-skeleton-loader" }).exists()).toBe(
      false
    );
  });

  it("reads through the hero layout route, not the catalog", async () => {
    await openEditor();

    expect(ApiCatalogService.getHeroLayout).toHaveBeenCalledTimes(1);
  });

  it("toasts and closes when the layout cannot be read", async () => {
    ApiCatalogService.getHeroLayout.mockRejectedValue(serverError());
    const wrapper = mountComponent(HeroEditorDialog, {
      store: new Vuex.Store({ modules: { toasts } }),
      propsData: { value: false },
    });

    await wrapper.setProps({ value: true });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(toastMessages(wrapper)).toContain(
      "Kopfbereich konnte nicht geladen werden"
    );
    expect(wrapper.emitted("input").at(-1)).toEqual([false]);
    // Nothing was read, so the tab is not asked to refetch.
    expect(wrapper.emitted("closed")).toBeUndefined();
  });

  it("says what a denial was about instead of the generic failure", async () => {
    ApiCatalogService.getHeroLayout.mockRejectedValue(forbiddenError());
    const wrapper = mountComponent(HeroEditorDialog, {
      store: new Vuex.Store({ modules: { toasts } }),
      propsData: { value: false },
    });

    await wrapper.setProps({ value: true });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(toastMessages(wrapper)).toHaveLength(1);
    expect(toastMessages(wrapper)[0]).not.toBe(
      "Kopfbereich konnte nicht geladen werden"
    );
  });
});

describe("HeroEditorDialog header", () => {
  it("carries title, status chip, language toggle and the three actions", async () => {
    const wrapper = await openEditor();
    const text = editorText(wrapper);

    expect(text).toContain("Kopfbereich");
    expect(text).toContain(DEFAULT_STATUS);
    expect(button(wrapper, "Deutsch")).toBeDefined();
    expect(button(wrapper, "English")).toBeDefined();
    expect(button(wrapper, "Auf Standard zurücksetzen")).toBeDefined();
    expect(button(wrapper, "Schließen")).toBeDefined();
    expect(button(wrapper, "Speichern")).toBeDefined();
  });

  it("holds the active locale on the language toggle", async () => {
    const wrapper = await openEditor();

    expect(wrapper.findComponent({ name: "v-btn-toggle" }).props("value")).toBe(
      "de"
    );
  });

  it("reads Angepasst for a stored layout", async () => {
    const wrapper = await openEditor(storedLayout());

    expect(editorText(wrapper)).toContain("Angepasst");
    expect(editorText(wrapper)).not.toContain(DEFAULT_STATUS);
  });
});

describe("HeroEditorDialog height", () => {
  it("offers the three heights with the German steps", async () => {
    const wrapper = await openEditor();

    expect(
      heightSelects(wrapper).map((select) => select.props("label"))
    ).toEqual([
      "Höhe auf der Startseite",
      "Höhe auf Mobilgeräten",
      "Höhe auf Unterseiten",
    ]);
    expect(
      heightSelect(wrapper, "Höhe auf der Startseite")
        .props("items")
        .map((item) => item.text)
    ).toEqual(["Niedrig", "Mittel", "Hoch", "Sehr hoch"]);
  });

  it("shows the derived values of a layout that arrived as the default one", async () => {
    const wrapper = await openEditor();

    expect(
      heightSelect(wrapper, "Höhe auf der Startseite").props("value")
    ).toBe("lg");
    expect(heightSelect(wrapper, "Höhe auf Mobilgeräten").props("value")).toBe(
      "lg"
    );
    expect(heightSelect(wrapper, "Höhe auf Unterseiten").props("value")).toBe(
      "sm"
    );
  });

  it("edits the three height fields", async () => {
    const wrapper = await openEditor();

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await chooseHeight(wrapper, "Höhe auf Mobilgeräten", "Mittel");
    await chooseHeight(wrapper, "Höhe auf Unterseiten", "Mittel");

    expect(chosenHeight(wrapper, "Höhe auf der Startseite")).toBe("Sehr hoch");
    expect(chosenHeight(wrapper, "Höhe auf Mobilgeräten")).toBe("Mittel");
    expect(chosenHeight(wrapper, "Höhe auf Unterseiten")).toBe("Mittel");
  });
});

describe("HeroEditorDialog dirty state", () => {
  it("offers no save while nothing has changed", async () => {
    const wrapper = await openEditor();

    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("flips the chip to Angepasst on the first change and enables the save", async () => {
    const wrapper = await openEditor();

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");

    expect(editorText(wrapper)).toContain("Angepasst");
    expect(editorText(wrapper)).not.toContain(DEFAULT_STATUS);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
    expect(button(wrapper, "Abbrechen")).toBeDefined();
    expect(button(wrapper, "Schließen")).toBeUndefined();
  });
});

describe("HeroEditorDialog save", () => {
  it("sends no layout while it is still the default one", async () => {
    const wrapper = await openEditor();
    // Only the Background moved — the layout still follows Portalname and
    // logo.
    await chooseBackgroundFamily(wrapper, "color");
    const background = heroBackgroundOfFamily("color");
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: { heroLayout: layout(), background, name: "Marktplatz" },
    });

    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    expect(ApiCatalogService.updateHeroLayout).toHaveBeenCalledWith({
      heroLayout: null,
      background,
    });
  });

  it("sends the layout once it has been changed", async () => {
    const wrapper = await openEditor();
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout({ height: "xl" }),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    expect(ApiCatalogService.updateHeroLayout).toHaveBeenCalledWith({
      heroLayout: layout({ height: "xl" }),
      background: BACKGROUND,
    });
  });

  it("takes the answer as the new draft, keeps the dialog open and toasts", async () => {
    const wrapper = await openEditor();
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout({ height: "xl", mobileHeight: "md" }),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(heightSelect(wrapper, "Höhe auf Mobilgeräten").props("value")).toBe(
      "md"
    );
    expect(toastMessages(wrapper)).toContain("Kopfbereich gespeichert");
    expect(wrapper.emitted("closed")).toBeUndefined();
    expect(button(wrapper, "Schließen")).toBeDefined();
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("keeps the layout custom across a save", async () => {
    const wrapper = await openEditor();
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout({ height: "xl" }),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    // The save route answers without `isDefault`; the layout the editor just
    // stored is the one it sent.
    expect(editorText(wrapper)).toContain("Angepasst");
  });

  it("toasts a failed save and keeps the changes", async () => {
    const wrapper = await openEditor();
    ApiCatalogService.updateHeroLayout.mockRejectedValue(serverError());

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(toastMessages(wrapper)).toContain(
      "Kopfbereich konnte nicht gespeichert werden"
    );
    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
  });
});

describe("HeroEditorDialog blocks", () => {
  /** A layout with two Blocks, so the list has something to group. */
  function withBlocks() {
    return heroLayoutResponse({
      heroLayout: heroLayout({
        blocks: [
          heroBlock({
            id: "title",
            zone: "middle-left",
            text: { de: "Titel" },
          }),
          heroBlock({ id: "note", zone: "top-right", text: { de: "Hinweis" } }),
        ],
      }),
      isDefault: false,
    });
  }

  function blockList(wrapper) {
    return wrapper.findComponent({ name: "HeroBlockList" });
  }

  it("hands the list the Blocks of the loaded layout", async () => {
    const wrapper = await openEditor(withBlocks());

    expect(row(wrapper, "title").text()).toContain("Titel");
    expect(row(wrapper, "note").text()).toContain("Hinweis");
  });

  it("flips the chip to Angepasst and enables the save on the first Block change", async () => {
    const wrapper = await openEditor();

    blockList(wrapper).vm.$emit("input", [
      heroBlock({ id: "new", zone: "middle-center" }),
    ]);
    await wrapper.vm.$nextTick();

    expect(editorText(wrapper)).toContain("Angepasst");
    expect(editorText(wrapper)).not.toContain(DEFAULT_STATUS);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
  });

  it("saves the new array", async () => {
    const wrapper = await openEditor();
    const blocks = [heroBlock({ id: "new", zone: "middle-center" })];
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: heroLayout({ blocks }),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    blockList(wrapper).vm.$emit("input", blocks);
    await wrapper.vm.$nextTick();
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    expect(ApiCatalogService.updateHeroLayout).toHaveBeenCalledWith({
      heroLayout: heroLayout({ blocks }),
      background: BACKGROUND,
    });
  });

  it("selecting a Block changes nothing that would be saved", async () => {
    const wrapper = await openEditor(withBlocks());

    await row(wrapper, "note").trigger("click");

    expect(blockList(wrapper).props("selectedBlockId")).toBe("note");
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("shows the detail form of the selected Block below the list", async () => {
    const wrapper = await openEditor(withBlocks());

    expect(blockForm(wrapper).exists()).toBe(false);

    await row(wrapper, "note").trigger("click");

    expect(blockForm(wrapper).props("block").id).toBe("note");
    expect(blockForm(wrapper).text()).toContain("Inhalt");
  });

  it("writes what the detail form changed into the Draft", async () => {
    const wrapper = await openEditor(withBlocks());
    await row(wrapper, "note").trigger("click");

    blockForm(wrapper).vm.$emit("input", { size: "xl" });
    await wrapper.vm.$nextTick();

    expect(blockForm(wrapper).props("block").size).toBe("xl");
    expect(editorText(wrapper)).toContain("Angepasst");
    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
  });

  it("moves a Block to the end of the Zone the Position grid names", async () => {
    const wrapper = await openEditor(withBlocks());
    await row(wrapper, "note").trigger("click");

    blockForm(wrapper).vm.$emit("update:zone", "middle-left");
    await wrapper.vm.$nextTick();

    expect(
      blockList(wrapper)
        .props("blocks")
        .map((b) => b.id)
    ).toEqual(["title", "note"]);
    expect(blockForm(wrapper).props("block").zone).toBe("middle-left");
  });

  it("hands the form the branding colours the chips are painted with", async () => {
    ApiCatalogService.getHeroLayout.mockResolvedValue(withBlocks());
    const wrapper = mountComponent(HeroEditorDialog, {
      store: new Vuex.Store({ modules: { toasts } }),
      propsData: {
        value: false,
        themeColors: { primary: "#123456", secondary: "#654321" },
      },
    });
    await wrapper.setProps({ value: true });
    await flushPromises();
    await wrapper.vm.$nextTick();
    await row(wrapper, "note").trigger("click");

    expect(blockForm(wrapper).props("themeColors")).toEqual({
      primary: "#123456",
      secondary: "#654321",
    });
  });

  /**
   * The derived default arrives from the preview route like any other layout,
   * so it goes through the same completion: a Block of it carries the new
   * fields even where the route left them out, and the Draft is whole again
   * right after „Auf Standard zurücksetzen“.
   */
  it("completes the Blocks of the derived default", async () => {
    const wrapper = await openEditor(withBlocks());
    ApiCatalogService.previewHeroLayout.mockResolvedValue({
      data: {
        heroLayout: heroLayout({
          blocks: [
            {
              id: "derived",
              type: "text",
              zone: "middle-center",
              text: { de: "Marktplatz" },
            },
          ],
        }),
        background: BACKGROUND,
        name: "",
      },
    });

    await button(wrapper, "Auf Standard zurücksetzen").trigger("click");
    await wrapper.vm.$nextTick();
    await button(wrapper, "Zurücksetzen").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(blockList(wrapper).props("blocks")[0]).toMatchObject({
      id: "derived",
      align: "auto",
      panel: null,
      offset: { x: 0, y: 0 },
      layer: "back",
    });
  });

  it("drops the selection when the layout is reset to the default", async () => {
    const wrapper = await openEditor(withBlocks());
    ApiCatalogService.previewHeroLayout.mockResolvedValue({
      data: { heroLayout: heroLayout(), background: BACKGROUND, name: "" },
    });

    await row(wrapper, "note").trigger("click");
    await button(wrapper, "Auf Standard zurücksetzen").trigger("click");
    await wrapper.vm.$nextTick();
    await button(wrapper, "Zurücksetzen").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(blockList(wrapper).props("selectedBlockId")).toBeNull();
  });
});

describe("HeroEditorDialog reset", () => {
  it("asks before it resets", async () => {
    const wrapper = await openEditor(storedLayout());

    await button(wrapper, "Auf Standard zurücksetzen").trigger("click");
    await wrapper.vm.$nextTick();

    expect(ApiCatalogService.previewHeroLayout).not.toHaveBeenCalled();
    expect(button(wrapper, "Zurücksetzen")).toBeDefined();
  });

  it("shows the derived default through the preview route and leaves the background alone", async () => {
    const wrapper = await openEditor(storedLayout());
    ApiCatalogService.previewHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout(),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    await button(wrapper, "Auf Standard zurücksetzen").trigger("click");
    await wrapper.vm.$nextTick();
    await button(wrapper, "Zurücksetzen").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(ApiCatalogService.previewHeroLayout).toHaveBeenCalledWith({
      heroLayout: null,
      background: BACKGROUND,
      name: "Marktplatz",
    });
    expect(editorText(wrapper)).toContain(DEFAULT_STATUS);
    // The stored layout was „Niedrig“; the derived default is „Hoch“.
    expect(chosenHeight(wrapper, "Höhe auf der Startseite")).toBe("Hoch");
  });

  it("sends no layout on the save that follows a reset", async () => {
    const wrapper = await openEditor(storedLayout());
    ApiCatalogService.previewHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout(),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout(),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    await button(wrapper, "Auf Standard zurücksetzen").trigger("click");
    await wrapper.vm.$nextTick();
    await button(wrapper, "Zurücksetzen").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    expect(ApiCatalogService.updateHeroLayout).toHaveBeenCalledWith({
      heroLayout: null,
      background: BACKGROUND,
    });
  });
});

describe("HeroEditorDialog cancel", () => {
  it("closes right away while nothing is dirty", async () => {
    const wrapper = await openEditor();

    await button(wrapper, "Schließen").trigger("click");
    await flushPromises();

    expect(leaveDialog(wrapper).props("value")).toBe(false);
    expect(wrapper.emitted("input").at(-1)).toEqual([false]);
    expect(wrapper.emitted("closed")).toHaveLength(1);
  });

  it("asks before it drops changes and stays open when the answer is no", async () => {
    const wrapper = await openEditor();

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await button(wrapper, "Abbrechen").trigger("click");
    await wrapper.vm.$nextTick();

    expect(leaveDialog(wrapper).props("value")).toBe(true);

    leaveDialog(wrapper).vm.$emit("stay");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("closed")).toBeUndefined();
    expect(leaveDialog(wrapper).props("value")).toBe(false);
  });

  it("closes without saving when the changes are discarded", async () => {
    const wrapper = await openEditor();

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await button(wrapper, "Abbrechen").trigger("click");
    await wrapper.vm.$nextTick();
    leaveDialog(wrapper).vm.$emit("discard");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(ApiCatalogService.updateHeroLayout).not.toHaveBeenCalled();
    expect(wrapper.emitted("closed")).toHaveLength(1);
  });

  it("guards a page unload only while there are changes", async () => {
    const wrapper = await openEditor();
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout({ height: "xl" }),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    expect(unloadPrevented()).toBe(false);

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    expect(unloadPrevented()).toBe(true);

    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(unloadPrevented()).toBe(false);
  });
});

/**
 * Acceptance 4 of the spec: a Block whose German text is empty blocks saving
 * and marks its row.
 */
describe("HeroEditorDialog with a Block the backend would refuse", () => {
  function withEmptyTitle() {
    return heroLayoutResponse({
      heroLayout: heroLayout({
        blocks: [
          heroBlock({ id: "title", zone: "middle-left", text: { de: "" } }),
          heroBlock({ id: "note", zone: "top-right", text: { de: "Hinweis" } }),
        ],
      }),
      isDefault: false,
    });
  }

  function errorBadges(wrapper) {
    return wrapper
      .findAll(".hero-block-row")
      .wrappers.filter((entry) => entry.find(".hero-block-row__error").exists())
      .map((entry) => entry.attributes("data-id"));
  }

  it("marks only the offending row", async () => {
    const wrapper = await openEditor(withEmptyTitle());

    expect(errorBadges(wrapper)).toEqual(["title"]);
  });

  /** Selects a row and lets its detail form answer with a patch. */
  async function edit(wrapper, id, patch) {
    await row(wrapper, id).trigger("click");
    blockForm(wrapper).vm.$emit("input", patch);
    await wrapper.vm.$nextTick();
  }

  it("keeps the save disabled while another Block is invalid", async () => {
    const wrapper = await openEditor(withEmptyTitle());

    // A change that makes the Draft dirty, on the Block that is fine.
    await edit(wrapper, "note", { size: "xl" });

    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
    expect(ApiCatalogService.updateHeroLayout).not.toHaveBeenCalled();
  });

  it("releases the save once the German text is there", async () => {
    const wrapper = await openEditor(withEmptyTitle());

    await edit(wrapper, "title", { text: { de: "Titel" } });

    expect(errorBadges(wrapper)).toEqual([]);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
  });

  it("marks an empty rich text and a picture-less image Block too", async () => {
    const wrapper = await openEditor(
      heroLayoutResponse({
        heroLayout: heroLayout({
          blocks: [
            heroBlock({ id: "note", zone: "top-right", text: { de: "Hi" } }),
            heroBlock({
              id: "prose",
              type: "richtext",
              zone: "middle-left",
              html: { de: "<p></p>" },
            }),
            heroBlock({
              id: "logo",
              type: "image",
              zone: "middle-right",
              image: null,
              alt: { de: "Das Logo" },
            }),
          ],
        }),
        isDefault: false,
      })
    );

    expect(errorBadges(wrapper)).toEqual(["prose", "logo"]);

    await edit(wrapper, "note", { size: "xl" });

    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });
});

describe("HeroEditorDialog background", () => {
  it("shows the section on the family of the stored Background", async () => {
    const wrapper = await openEditor();

    expect(
      wrapper.findComponent({ name: "HeroBackgroundForm" }).props("value")
    ).toEqual(HERO_BACKGROUND);
    expect(backgroundCard(wrapper, "variant").attributes("aria-pressed")).toBe(
      "true"
    );
  });

  it("enables the save on a Background change and leaves the chip alone", async () => {
    const wrapper = await openEditor();

    await chooseBackgroundFamily(wrapper, "color");

    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
    // The chip is about the layout, which still follows Portalname and logo.
    expect(editorText(wrapper)).toContain(DEFAULT_STATUS);
  });

  it("keeps a custom layout custom when the Background is reset", async () => {
    const wrapper = await openEditor(
      storedLayout({
        background: { version: 1, type: "color", light: "#fff000" },
      })
    );

    await button(wrapper, "Standardhintergrund").trigger("click");

    expect(
      wrapper.findComponent({ name: "HeroBackgroundForm" }).props("value")
    ).toEqual(defaultHeroBackground());
    expect(editorText(wrapper)).toContain("Angepasst");
  });

  it("disables the save while the Background is invalid and says why at the section", async () => {
    const wrapper = await openEditor();

    // „Bild“ starts without an image, which is the one thing the backend
    // insists on.
    await chooseBackgroundFamily(wrapper, "image");

    expect(backgroundIssues(wrapper)).toHaveLength(1);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("sends the Background beside the layout and takes the answer back", async () => {
    const wrapper = await openEditor();
    const background = heroBackgroundOfFamily("color");
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout({ height: "xl" }),
        background,
        name: "Marktplatz",
      },
    });

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Sehr hoch");
    await chooseBackgroundFamily(wrapper, "color");
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(ApiCatalogService.updateHeroLayout).toHaveBeenCalledWith({
      heroLayout: layout({ height: "xl" }),
      background,
    });
    // The answer carries the Background unchanged, so the save is clean again.
    expect(
      wrapper.findComponent({ name: "HeroBackgroundForm" }).props("value")
    ).toEqual(background);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });
});

/**
 * The editor knows the amended Block shape before it offers a control for it.
 * A layout that already carries the new fields has to survive the whole cycle
 * — load, preview round-trip, save — with them untouched, because an editor
 * that silently drops what it cannot yet edit is worse than one that does not
 * offer the fields at all.
 */
describe("HeroEditorDialog, on the amended Block shape", () => {
  /** A Block whose new fields are all away from their defaults. */
  const DRESSED = Object.freeze({
    id: "dressed",
    type: "text",
    zone: "middle-center",
    outerSpacing: "none",
    innerSpacing: "none",
    width: "auto",
    align: "right",
    panel: Object.freeze({
      color: "black",
      opacity: 25,
      radius: "lg",
      blur: false,
    }),
    offset: Object.freeze({ x: -1.5, y: 2.5 }),
    layer: "front",
    homeOnly: false,
    hideOnMobile: false,
    text: Object.freeze({ de: "Willkommen" }),
    size: "2xl",
    color: "white",
    weight: "bold",
    shadow: true,
  });

  function dressedLayout() {
    return heroLayoutResponse({
      heroLayout: heroLayout({ blocks: [{ ...DRESSED }] }),
      isDefault: false,
    });
  }

  it("sends the new fields through the preview round-trip", async () => {
    ApiCatalogService.previewHeroLayout.mockResolvedValue({ data: RESOLVED });
    const wrapper = await openEditor(dressedLayout());

    await settlePreview(wrapper);

    expect(
      ApiCatalogService.previewHeroLayout.mock.calls.at(-1)[0].heroLayout
        .blocks[0]
    ).toEqual(DRESSED);
  });

  it("keeps „Speichern“ enabled while the round-trip accepts the Draft", async () => {
    ApiCatalogService.previewHeroLayout.mockResolvedValue({ data: RESOLVED });
    const wrapper = await openEditor(dressedLayout());

    // „Speichern“ needs something to save; the height is the change that
    // leaves the Block itself alone.
    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);

    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
  });

  it("saves them unchanged", async () => {
    ApiCatalogService.previewHeroLayout.mockResolvedValue({ data: RESOLVED });
    ApiCatalogService.updateHeroLayout.mockResolvedValue(dressedLayout());
    const wrapper = await openEditor(dressedLayout());

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    expect(
      ApiCatalogService.updateHeroLayout.mock.calls.at(-1)[0].heroLayout
        .blocks[0]
    ).toEqual(DRESSED);
  });

  it("hands the detail form the Block whole", async () => {
    const wrapper = await openEditor(dressedLayout());

    await row(wrapper, "dressed").trigger("click");

    expect(blockForm(wrapper).props("block")).toEqual(DRESSED);
  });
});

/**
 * Acceptance 1 of the spec: an instance that never stored a layout opens the
 * editor on the derived default, and saving nothing changes nothing.
 */
describe("HeroEditorDialog live preview", () => {
  beforeEach(() => {
    ApiCatalogService.previewHeroLayout.mockResolvedValue({ data: RESOLVED });
  });

  it("hands the Portal-URL and the locale to the preview panel", async () => {
    const wrapper = await openEditor(storedNothing(), {
      portalUrl: "https://portal.example.org",
    });

    expect(livePreview(wrapper).props("portalUrl")).toBe(
      "https://portal.example.org"
    );
    expect(livePreview(wrapper).props("locale")).toBe("de");
  });

  it("resolves the Draft through the preview route and hands the answer down", async () => {
    const wrapper = await openEditor();

    await settlePreview(wrapper);

    expect(ApiCatalogService.previewHeroLayout).toHaveBeenCalledWith({
      // The layout is still the derived default, so the route is asked for it.
      heroLayout: null,
      background: HERO_BACKGROUND,
      name: "Marktplatz",
    });
    expect(livePreview(wrapper).props("preview")).toEqual({
      draftId: 1,
      ...RESOLVED,
    });
  });

  it("sends the edited layout once it is no longer the default", async () => {
    const wrapper = await openEditor();
    await settlePreview(wrapper);

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);

    expect(ApiCatalogService.previewHeroLayout).toHaveBeenLastCalledWith({
      heroLayout: layout({ height: "sm" }),
      background: HERO_BACKGROUND,
      name: "Marktplatz",
    });
  });

  it("counts the Draft up, so the frames can tell two apart", async () => {
    const wrapper = await openEditor();
    await settlePreview(wrapper);

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);

    expect(livePreview(wrapper).props("preview").draftId).toBe(2);
  });

  it("sends one round-trip for a burst of changes", async () => {
    const wrapper = await openEditor();
    await settlePreview(wrapper);
    ApiCatalogService.previewHeroLayout.mockClear();

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await chooseHeight(wrapper, "Höhe auf Mobilgeräten", "Mittel");
    await settlePreview(wrapper);

    expect(ApiCatalogService.previewHeroLayout).toHaveBeenCalledTimes(1);
  });

  it("sends nothing while a Block is one the editor itself refuses", async () => {
    const wrapper = await openEditor(
      heroLayoutResponse({
        heroLayout: heroLayout({
          blocks: [heroBlock({ id: "title", text: { de: "" } })],
        }),
        isDefault: false,
      })
    );

    await settlePreview(wrapper);

    expect(ApiCatalogService.previewHeroLayout).not.toHaveBeenCalled();
    expect(livePreview(wrapper).props("preview")).toBeNull();
  });

  it("keeps the last valid preview and holds the save back after a refusal", async () => {
    const wrapper = await openEditor();
    await settlePreview(wrapper);
    const lastValid = livePreview(wrapper).props("preview");

    ApiCatalogService.previewHeroLayout.mockRejectedValue(serverError(400));
    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);

    expect(livePreview(wrapper).props("preview")).toEqual(lastValid);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("releases the save again on the next accepted Draft", async () => {
    const wrapper = await openEditor();
    await settlePreview(wrapper);

    ApiCatalogService.previewHeroLayout.mockRejectedValueOnce(serverError(400));
    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Mittel");
    await settlePreview(wrapper);

    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
  });

  it("does not hold the save back when the route is merely unreachable", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await openEditor();
    await settlePreview(wrapper);

    ApiCatalogService.previewHeroLayout.mockRejectedValue(serverError());
    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);

    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
    // Unexpected, so it reaches the console rather than a toast the author
    // could not act on anyway.
    expect(logged).toHaveBeenCalled();
    expect(toastMessages(wrapper)).toEqual([]);
  });

  it("tells the frames which Block the form shows", async () => {
    const wrapper = await openEditor(
      heroLayoutResponse({
        heroLayout: heroLayout({ blocks: [heroBlock({ id: "title" })] }),
        isDefault: false,
      })
    );

    await row(wrapper, "title").trigger("click");
    await wrapper.vm.$nextTick();

    expect(livePreview(wrapper).props("selectedBlockId")).toBe("title");
  });
});

/**
 * Section 3 of the spec: the frames answer back. A Block click selects, a Zone
 * click moves the selected Block — the storefront never moves anything itself.
 */
describe("HeroEditorDialog preview clicks", () => {
  /** Two Blocks in two Zones, so a move has somewhere to come from. */
  function twoBlocks() {
    return heroLayoutResponse({
      heroLayout: heroLayout({
        blocks: [
          heroBlock({ id: "title", zone: "top-left", text: { de: "Titel" } }),
          heroBlock({ id: "note", zone: "bottom-right", text: { de: "Note" } }),
        ],
      }),
      isDefault: false,
    });
  }

  function rowIds(wrapper) {
    return wrapper
      .findAll(".hero-block-row")
      .wrappers.map((entry) => entry.attributes("data-id"));
  }

  /**
   * Which Zone each row is shown under, read off the groups the list paints —
   * `data-zone` on the group, `data-id` on the row.
   */
  function zonesOf(wrapper) {
    const zones = {};
    for (const group of wrapper.findAll("[data-zone]").wrappers) {
      for (const entry of group.findAll(".hero-block-row").wrappers) {
        zones[entry.attributes("data-id")] = group.attributes("data-zone");
      }
    }

    return zones;
  }

  async function fromFrame(wrapper, event, payload) {
    livePreview(wrapper).vm.$emit(event, payload);
    await wrapper.vm.$nextTick();
  }

  beforeEach(() => {
    ApiCatalogService.previewHeroLayout.mockResolvedValue({ data: RESOLVED });
  });

  it("selects the Block a frame reports as clicked", async () => {
    const wrapper = await openEditor(twoBlocks());

    await fromFrame(wrapper, "block-click", "note");

    expect(blockForm(wrapper).props("block").id).toBe("note");
    expect(row(wrapper, "note").classes()).toContain(
      "hero-block-row--selected"
    );
  });

  it("sends the new selection back down to the frames", async () => {
    const wrapper = await openEditor(twoBlocks());

    await fromFrame(wrapper, "block-click", "note");

    expect(livePreview(wrapper).props("selectedBlockId")).toBe("note");
  });

  it("ignores a click on a Block the Draft no longer holds", async () => {
    const wrapper = await openEditor(twoBlocks());
    await fromFrame(wrapper, "block-click", "title");

    await fromFrame(wrapper, "block-click", "gone");

    expect(livePreview(wrapper).props("selectedBlockId")).toBe("title");
  });

  it("moves the selected Block to the end of a clicked Zone", async () => {
    const wrapper = await openEditor(twoBlocks());
    await fromFrame(wrapper, "block-click", "title");

    await fromFrame(wrapper, "zone-click", "bottom-right");

    expect(zonesOf(wrapper)).toEqual({
      title: "bottom-right",
      note: "bottom-right",
    });
    // Behind the Block that was already there, and the list is canonical.
    expect(rowIds(wrapper)).toEqual(["note", "title"]);
  });

  it("selects without taking the layout out of the default", async () => {
    const wrapper = await openEditor(
      heroLayoutResponse({
        heroLayout: heroLayout({
          blocks: [heroBlock({ id: "title", text: { de: "Titel" } })],
        }),
      })
    );

    await fromFrame(wrapper, "block-click", "title");

    // A selection is editor state: it travels with the Draft but is nothing
    // the layout has changed about.
    expect(livePreview(wrapper).props("selectedBlockId")).toBe("title");
    expect(editorText(wrapper)).toContain(DEFAULT_STATUS);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("does nothing when the clicked Zone is the Block's own", async () => {
    const wrapper = await openEditor(twoBlocks());
    await fromFrame(wrapper, "block-click", "title");

    await fromFrame(wrapper, "zone-click", "top-left");

    expect(zonesOf(wrapper)).toEqual({
      title: "top-left",
      note: "bottom-right",
    });
    // A no-op is a no-op: nothing to save, and the chip is untouched.
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("does nothing while no Block is selected", async () => {
    const wrapper = await openEditor(twoBlocks());

    await fromFrame(wrapper, "zone-click", "middle-center");

    expect(zonesOf(wrapper)).toEqual({
      title: "top-left",
      note: "bottom-right",
    });
  });

  it("ignores a Zone that is none of the nine", async () => {
    const wrapper = await openEditor(twoBlocks());
    await fromFrame(wrapper, "block-click", "title");

    await fromFrame(wrapper, "zone-click", "top-middle");

    expect(zonesOf(wrapper)).toEqual({
      title: "top-left",
      note: "bottom-right",
    });
  });

  /**
   * Acceptance 2 of the spec: a text Block added, moved by a Zone click and
   * saved keeps the Zone the click gave it.
   */
  it("persists the Zone a click gave a freshly added Block", async () => {
    const wrapper = await openEditor(twoBlocks());
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout(),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    await button(wrapper, "Block hinzufügen").trigger("click");
    await flushPromises();
    const entry = Array.from(
      document.querySelectorAll(".menuable__content__active .v-list-item")
    ).find((item) => item.textContent.trim() === "Text");
    entry.click();
    await flushPromises();
    await wrapper.vm.$nextTick();

    blockForm(wrapper).vm.$emit("input", { text: { de: "Neu" } });
    await wrapper.vm.$nextTick();
    // Without a selection the new Block went into „Mitte zentriert“, so the
    // Zone the click has to carry it to is another one.
    expect(blockForm(wrapper).props("block").zone).toBe("middle-center");

    await fromFrame(wrapper, "zone-click", "bottom-left");
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    const saved = ApiCatalogService.updateHeroLayout.mock.calls.at(-1)[0];
    const added = saved.heroLayout.blocks.find(
      (block) => block.text && block.text.de === "Neu"
    );
    expect(added.zone).toBe("bottom-left");
  });
});

/**
 * Section 9 of the spec: the Preview Report. Warnings are advice on the row
 * and a count in the toolbar; they never hold a save back.
 */
describe("HeroEditorDialog preview report", () => {
  /**
   * Two Blocks, and a Portal-URL: the per-frame summary sits in the frames,
   * and without an origin there are none (hero layout spec §3).
   */
  function openWithFrames() {
    return openEditor(
      heroLayoutResponse({
        heroLayout: heroLayout({
          blocks: [
            heroBlock({ id: "title", zone: "top-left", text: { de: "Titel" } }),
            heroBlock({
              id: "note",
              zone: "bottom-right",
              text: { de: "Note" },
            }),
          ],
        }),
        isDefault: false,
      }),
      { portalUrl: "https://portal.example.org" }
    );
  }

  /** A report as the panel hands it up, envelope and all. */
  function report(overrides = {}) {
    return {
      protocol: HERO_PREVIEW_PROTOCOL,
      type: HERO_PREVIEW_REPORT,
      draftId: 1,
      viewport: "desktop",
      warnings: [],
      ...overrides,
    };
  }

  function outside(id) {
    return { code: "outside-content-area", blockIds: [id] };
  }

  async function sendReport(wrapper, overrides) {
    livePreview(wrapper).vm.$emit("report", report(overrides));
    await wrapper.vm.$nextTick();
  }

  /** The yellow badge of a row, or null while it carries none. */
  function warningBadge(wrapper, id) {
    const badge = row(wrapper, id).find(".hero-block-row__warning");
    return badge.exists() ? badge.attributes("title") : null;
  }

  function summary(wrapper, viewport) {
    const entry = wrapper
      .findAll(".hero-preview-summary")
      .wrappers.find((slot) => slot.attributes("data-viewport") === viewport);
    return entry ? entry.text() : null;
  }

  beforeEach(() => {
    ApiCatalogService.previewHeroLayout.mockResolvedValue({ data: RESOLVED });
  });

  it("marks the row a frame warned about, in that frame's words", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);

    await sendReport(wrapper, { warnings: [outside("title")] });

    expect(warningBadge(wrapper, "title")).toBe(
      "Ragt auf dem Desktop aus dem Kopfbereich heraus"
    );
    expect(warningBadge(wrapper, "note")).toBeNull();
  });

  it("gives both Blocks of an overlap a badge naming the other", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);

    await sendReport(wrapper, {
      warnings: [{ code: "overlap", blockIds: ["title", "note"] }],
    });

    expect(warningBadge(wrapper, "title")).toBe(
      "Überlappt auf dem Desktop mit ‚Note‘"
    );
    expect(warningBadge(wrapper, "note")).toBe(
      "Überlappt auf dem Desktop mit ‚Titel‘"
    );
  });

  it("collects what both frames say on one badge", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);

    await sendReport(wrapper, { warnings: [outside("title")] });
    await sendReport(wrapper, {
      viewport: "mobile",
      warnings: [outside("title")],
    });

    expect(warningBadge(wrapper, "title")).toBe(
      "Ragt auf dem Desktop aus dem Kopfbereich heraus Wird auf Mobilgeräten abgeschnitten"
    );
  });

  it("shows no badge for an overlap a mobile frame claims", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);

    // The storefront measures overlaps on the desktop frame only: the rows
    // stack on mobile, so where a Block lands is not the author’s choice.
    await sendReport(wrapper, {
      viewport: "mobile",
      warnings: [{ code: "overlap", blockIds: ["title", "note"] }],
    });

    expect(warningBadge(wrapper, "title")).toBeNull();
    expect(warningBadge(wrapper, "note")).toBeNull();
  });

  it("says what blocks the save rather than what a stale render warned", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);
    await sendReport(wrapper, { warnings: [outside("title")] });

    // An invalid Block is never sent, so its warning describes a render one
    // Draft old; the row says the thing the author has to act on.
    await row(wrapper, "title").trigger("click");
    blockForm(wrapper).vm.$emit("input", { text: { de: "" } });
    await wrapper.vm.$nextTick();

    expect(row(wrapper, "title").find(".hero-block-row__error").exists()).toBe(
      true
    );
    expect(warningBadge(wrapper, "title")).toBeNull();
  });

  it("counts the warnings of each frame in the toolbar", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);

    await sendReport(wrapper, {
      warnings: [outside("title"), outside("note")],
    });
    await sendReport(wrapper, { viewport: "mobile" });

    expect(summary(wrapper, "desktop")).toBe("2 Hinweise");
    expect(summary(wrapper, "mobile")).toBe("0 Hinweise");
  });

  it("says nothing about a frame that has not reported yet", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);

    expect(summary(wrapper, "desktop")).toBeNull();
  });

  it("discards a report of a Draft that has been superseded", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);
    await sendReport(wrapper, { warnings: [outside("title")] });

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);
    await sendReport(wrapper, { draftId: 1, warnings: [outside("note")] });

    expect(warningBadge(wrapper, "note")).toBeNull();
    expect(warningBadge(wrapper, "title")).toBe(
      "Ragt auf dem Desktop aus dem Kopfbereich heraus"
    );
  });

  it("logs an invalid Draft and leaves the last badges standing", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);
    await sendReport(wrapper, { warnings: [outside("title")] });

    await sendReport(wrapper, { warnings: [], error: "invalid-draft" });

    expect(logged).toHaveBeenCalled();
    expect(warningBadge(wrapper, "title")).toBe(
      "Ragt auf dem Desktop aus dem Kopfbereich heraus"
    );
    expect(summary(wrapper, "desktop")).toBe("1 Hinweis");
  });

  it("forgets the reports of the Draft it had when the dialog closes", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);
    await sendReport(wrapper, { warnings: [outside("title")] });

    await button(wrapper, "Schließen").trigger("click");
    await flushPromises();
    await wrapper.setProps({ value: false });
    await wrapper.setProps({ value: true });
    await flushPromises();
    await wrapper.vm.$nextTick();

    // The frames start over with the reopened dialog, so nothing of the last
    // session's render is claimed about this one.
    expect(warningBadge(wrapper, "title")).toBeNull();
    expect(summary(wrapper, "desktop")).toBeNull();
  });

  /**
   * Acceptance 3 of the spec: a Block that leaves the Hero warns in both
   * frames and still saves.
   */
  it("saves with warnings from both frames standing", async () => {
    const wrapper = await openWithFrames();
    await settlePreview(wrapper);
    ApiCatalogService.updateHeroLayout.mockResolvedValue({
      data: {
        heroLayout: layout(),
        background: BACKGROUND,
        name: "Marktplatz",
      },
    });

    await chooseHeight(wrapper, "Höhe auf der Startseite", "Niedrig");
    await settlePreview(wrapper);
    await sendReport(wrapper, { draftId: 2, warnings: [outside("title")] });
    await sendReport(wrapper, {
      draftId: 2,
      viewport: "mobile",
      warnings: [outside("title")],
    });

    expect(warningBadge(wrapper, "title")).not.toBeNull();
    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();

    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();

    expect(ApiCatalogService.updateHeroLayout).toHaveBeenCalled();
  });
});

describe("HeroEditorDialog on an instance without a stored layout", () => {
  it("shows the derived default and writes nothing when it is closed unchanged", async () => {
    const wrapper = await openEditor();

    expect(editorText(wrapper)).toContain(DEFAULT_STATUS);
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );

    await button(wrapper, "Schließen").trigger("click");
    await flushPromises();

    expect(ApiCatalogService.updateHeroLayout).not.toHaveBeenCalled();
  });
});

/** Whether a page unload would currently be held back. */
function unloadPrevented() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * Section 4 of the spec: the badge beside the language toggle counts the
 * Blocks the storefront would show in German on the English page.
 */
describe("HeroEditorDialog translation badge", () => {
  function withBlocks(blocks) {
    return heroLayoutResponse({
      heroLayout: heroLayout({ blocks }),
      isDefault: false,
    });
  }

  it("counts the Blocks without an English version", async () => {
    const wrapper = await openEditor(
      withBlocks([
        heroBlock({ id: "a", text: { de: "Titel" } }),
        heroBlock({ id: "b", zone: "top-left", text: { de: "Note" } }),
        heroBlock({
          id: "c",
          zone: "bottom-left",
          text: { de: "Fuß", en: "Foot" },
        }),
      ])
    );

    expect(editorText(wrapper)).toContain("2 ohne Übersetzung");
  });

  it("sends the frames to the other locale's preview route", async () => {
    const wrapper = await openEditor(
      withBlocks([heroBlock({ text: { de: "Titel" } })])
    );
    expect(livePreview(wrapper).props("locale")).toBe("de");

    await switchToEnglish(wrapper);

    expect(livePreview(wrapper).props("locale")).toBe("en");
  });

  it("hides the badge once every Block is translated", async () => {
    const wrapper = await openEditor(
      withBlocks([heroBlock({ text: { de: "Titel", en: "Title" } })])
    );

    expect(wrapper.find(".hero-editor__untranslated").exists()).toBe(false);
  });

  it("counts down as a translation is written in the English view", async () => {
    const wrapper = await openEditor(
      withBlocks([heroBlock({ id: "a", text: { de: "Titel" } })])
    );
    expect(editorText(wrapper)).toContain("1 ohne Übersetzung");

    await row(wrapper, "a").trigger("click");
    await switchToEnglish(wrapper);

    const field = blockForm(wrapper).find(".hero-block-form__text input");
    expect(field.element.value).toBe("");

    await field.setValue("Title");
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.draft.heroLayout.blocks[0].text).toEqual({
      de: "Titel",
      en: "Title",
    });
    expect(wrapper.find(".hero-editor__untranslated").exists()).toBe(false);
  });
});

/**
 * Section 9 of the spec: `details[].field` is a JSON path, and the editor puts
 * every one of them somewhere the author can act on — under the control, at
 * the section, or above the form when it can place it nowhere else.
 */
describe("HeroEditorDialog backend errors", () => {
  const TEXT_BLOCK = heroBlock({ id: "title", text: { de: "Titel" } });

  function withBlock(block = TEXT_BLOCK) {
    return heroLayoutResponse({
      heroLayout: heroLayout({ blocks: [block] }),
      isDefault: false,
    });
  }

  /** Drives one refused round-trip of the preview route. */
  async function refusePreview(wrapper, details) {
    ApiCatalogService.previewHeroLayout.mockRejectedValue(
      validationError(details)
    );
    await chooseHeight(wrapper, "Höhe auf Mobilgeräten", "Mittel");
    await settlePreview(wrapper);
  }

  function blockTextField(wrapper) {
    return blockForm(wrapper)
      .findAllComponents({ name: "v-text-field" })
      .wrappers.find((field) =>
        String(field.props("label")).startsWith("Text")
      );
  }

  function sectionErrors(wrapper, selector) {
    return wrapper.findAll(selector).wrappers.map((entry) => entry.text());
  }

  it("puts a Block's field error under its control and marks the row", async () => {
    const wrapper = await openEditor(withBlock());
    await row(wrapper, "title").trigger("click");

    await refusePreview(wrapper, [
      { field: "heroLayout.blocks[0].text.de", code: "required" },
    ]);

    expect(blockTextField(wrapper).props("errorMessages")).toBe("Pflichtfeld");
    expect(row(wrapper, "title").find(".hero-block-row__error").exists()).toBe(
      true
    );
    expect(button(wrapper, "Speichern").attributes("disabled")).toBe(
      "disabled"
    );
  });

  it("shows a German fault only in the German view, and keeps the badge", async () => {
    const wrapper = await openEditor(withBlock());
    await row(wrapper, "title").trigger("click");
    await refusePreview(wrapper, [
      { field: "heroLayout.blocks[0].text.de", code: "required" },
    ]);

    await switchToEnglish(wrapper);

    expect(blockTextField(wrapper).props("errorMessages")).toBeNull();
    expect(row(wrapper, "title").find(".hero-block-row__error").exists()).toBe(
      true
    );
  });

  it("names the medium a refused image points at", async () => {
    const wrapper = await openEditor(
      withBlock(heroImageBlock({ id: "logo", alt: { de: "Logo" } }))
    );
    await row(wrapper, "logo").trigger("click");

    await refusePreview(wrapper, [
      {
        field: "heroLayout.blocks[0].image",
        code: "invalid_custom",
        params: { reason: "not_public" },
      },
    ]);

    expect(blockForm(wrapper).text()).toContain("nicht öffentlich");
  });

  it("puts a height error at the Höhe section", async () => {
    const wrapper = await openEditor(withBlock());

    await refusePreview(wrapper, [
      { field: "heroLayout.height", code: "invalid_enum" },
    ]);

    expect(sectionErrors(wrapper, ".hero-editor__height-error")).toEqual([
      "Höhe auf der Startseite: Dieser Wert wird nicht unterstützt.",
    ]);
  });

  it("puts a Background error at the Hintergrund section", async () => {
    const wrapper = await openEditor(withBlock());

    await refusePreview(wrapper, [
      {
        field: "background.overlay.light.color",
        code: "invalid_format",
        params: { format: "hex" },
      },
    ]);

    expect(backgroundIssues(wrapper).join(" ")).toContain(
      "Farbe der Abdunklung"
    );
  });

  it("names the Block of a fault no control can carry", async () => {
    const wrapper = await openEditor(withBlock());

    await refusePreview(wrapper, [
      { field: "heroLayout.blocks[0].wibble", code: "unknown_field" },
    ]);

    expect(sectionErrors(wrapper, ".hero-editor__block-error")).toEqual([
      "Titel: Dieses Feld wird nicht unterstützt.",
    ]);
  });

  it("marks the Block the refused body named, not the one at that index now", async () => {
    const wrapper = await openEditor(
      heroLayoutResponse({
        heroLayout: heroLayout({
          blocks: [
            heroBlock({ id: "first", zone: "top-left", text: { de: "Eins" } }),
            heroBlock({
              id: "second",
              zone: "top-right",
              text: { de: "Zwei" },
            }),
          ],
        }),
        isDefault: false,
      })
    );
    await settlePreview(wrapper);

    // The round-trip goes out with both Blocks and is refused about the
    // second; the author deletes the first while it is in flight, so index 1
    // is nobody's by the time the answer lands.
    let refuse;
    ApiCatalogService.previewHeroLayout.mockReturnValueOnce(
      new Promise((_, reject) => {
        refuse = reject;
      })
    );
    await chooseHeight(wrapper, "Höhe auf Mobilgeräten", "Mittel");
    await settlePreview(wrapper);

    wrapper.vm.setBlocks(wrapper.vm.blocks.slice(1));
    await wrapper.vm.$nextTick();
    refuse(
      validationError([
        { field: "heroLayout.blocks[1].text.de", code: "required" },
      ])
    );
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(row(wrapper, "second").find(".hero-block-row__error").exists()).toBe(
      true
    );
  });

  it("puts a fault of the image reference at the Bild control", async () => {
    const wrapper = await openEditor(
      withBlock(heroImageBlock({ id: "logo", alt: { de: "Logo" } }))
    );
    await row(wrapper, "logo").trigger("click");

    // The backend names the key inside the reference; one control edits both.
    await refusePreview(wrapper, [
      {
        field: "heroLayout.blocks[0].image.mediaId",
        code: "invalid_custom",
        params: { reason: "not_instance" },
      },
    ]);

    expect(blockForm(wrapper).text()).toContain("Mediathek");
    expect(sectionErrors(wrapper, ".hero-editor__block-error")).toEqual([]);
  });

  it("shows a path it cannot place above the form rather than dropping it", async () => {
    const wrapper = await openEditor(withBlock());

    await refusePreview(wrapper, [{ field: "wibble", code: "required" }]);

    expect(wrapper.find(".hero-editor__errors").text()).toContain(
      "Pflichtfeld"
    );
  });

  it("clears the errors and releases the save on the next accepted Draft", async () => {
    const wrapper = await openEditor(withBlock());
    await row(wrapper, "title").trigger("click");
    await refusePreview(wrapper, [
      { field: "heroLayout.blocks[0].text.de", code: "required" },
    ]);

    ApiCatalogService.previewHeroLayout.mockResolvedValue({ data: RESOLVED });
    await chooseHeight(wrapper, "Höhe auf Unterseiten", "Hoch");
    await settlePreview(wrapper);

    expect(blockTextField(wrapper).props("errorMessages")).toBeNull();
    expect(row(wrapper, "title").find(".hero-block-row__error").exists()).toBe(
      false
    );
    expect(button(wrapper, "Speichern").attributes("disabled")).toBeUndefined();
  });

  it("keeps the dialog open with the fields marked when the save is refused", async () => {
    const wrapper = await openEditor(withBlock());
    await row(wrapper, "title").trigger("click");
    await settlePreview(wrapper);
    await chooseHeight(wrapper, "Höhe auf Mobilgeräten", "Mittel");
    await settlePreview(wrapper);

    ApiCatalogService.updateHeroLayout.mockRejectedValue(
      validationError([
        { field: "heroLayout.blocks[0].text.de", code: "required" },
      ])
    );
    await button(wrapper, "Speichern").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("input")).toBeUndefined();
    expect(blockTextField(wrapper).props("errorMessages")).toBe("Pflichtfeld");
    expect(toastMessages(wrapper)).toContain(
      "Kopfbereich nicht gespeichert — bitte die markierten Felder prüfen"
    );
  });
});
