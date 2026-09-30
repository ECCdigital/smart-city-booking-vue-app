import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  activeDialog,
  activeDialogText,
  dialogButton,
} from "@tests/unit/support/dialog";
import toasts from "@/store/modules/toasts";
import { heroLayoutResponse } from "@tests/unit/support/heroLayout";

// The Hero Editor the entry card opens fills itself from the hero layout
// route; the tab around it is what is under test here.
vi.mock("@/services/api/ApiCatalogService", () => ({
  default: {
    getHeroLayout: vi.fn(),
    updateHeroLayout: vi.fn(),
    previewHeroLayout: vi.fn(),
  },
}));

import InstanceEditCatalog from "@/components/Instance/Edit/InstanceEditCatalog.vue";
import ApiCatalogService from "@/services/api/ApiCatalogService";

function instance(overrides = {}) {
  return {
    id: "i1",
    portalUrl: "https://portal.example.org",
    branding: {
      active: false,
      theme: { colors: { primary: "", secondary: "" } },
      logo: null,
      favicon: null,
      logoUrl: "",
      faviconUrl: "",
    },
    ...overrides,
  };
}

function catalog(overrides = {}) {
  return {
    type: "instance",
    name: "Marktplatz",
    visibility: "public",
    excludedTenantIds: [],
    ...overrides,
  };
}

function withBackground(background) {
  const base = instance();
  return { ...base, branding: { ...base.branding, background } };
}

function blocks(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `b${index}`,
    type: "text",
    zone: "middle-center",
    text: { de: `Block ${index}` },
  }));
}

function mountTab(propsData = {}) {
  // The two media fields open a picker backed by the media API; what is under
  // test is the tab around them.
  return mountComponent(InstanceEditCatalog, {
    store: new Vuex.Store({ modules: { toasts } }),
    propsData: { instance: instance(), catalog: catalog(), ...propsData },
    stubs: { MediaReferenceField: true, MediaReferenceImage: true },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiCatalogService.getHeroLayout.mockResolvedValue(heroLayoutResponse());
});

function fieldByLabel(wrapper, label) {
  return wrapper
    .findAll(".v-text-field")
    .wrappers.find((field) => field.find("label").text() === label);
}

function fieldMessage(field) {
  const message = field.find(".v-messages__message");
  return message.exists() ? message.text() : "";
}

function buttonByLabel(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((button) => button.text().trim() === label);
}

async function settle(wrapper) {
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

describe("InstanceEditCatalog Portalname", () => {
  it("is the first field of the catalog section, required, with the help text", () => {
    const wrapper = mountTab();

    const labels = wrapper
      .findAll(".v-text-field label, .v-select label")
      .wrappers.map((label) => label.text());
    expect(labels[0]).toBe("Portalname");

    const field = fieldByLabel(wrapper, "Portalname");
    expect(field.find("input").element.value).toBe("Marktplatz");
    expect(field.text()).toContain(
      "Erscheint im Browser-Titel, im Kopfbereich und auf den Anmeldeseiten."
    );
  });

  it("rejects an empty name on validate", async () => {
    const wrapper = mountTab();
    const field = fieldByLabel(wrapper, "Portalname");

    await field.find("input").setValue("   ");
    const valid = wrapper.vm.validate();
    await settle(wrapper);

    expect(valid).toBe(false);
    expect(fieldMessage(field)).toBe("Pflichtfeld");
  });

  it("shows the backend's required error on name inline", async () => {
    const wrapper = mountTab();
    const field = fieldByLabel(wrapper, "Portalname");

    wrapper.vm.showApiErrors([{ field: "name", code: "required" }]);
    await settle(wrapper);

    expect(fieldMessage(field)).toBe("Pflichtfeld");

    await field.find("input").setValue("Neuer Name");
    await settle(wrapper);

    // Once the error is gone the persistent hint takes the message slot back.
    expect(fieldMessage(field)).toMatch(/^Erscheint im Browser-Titel/);
  });

  it("emits the name with the catalog", async () => {
    const wrapper = mountTab();

    await fieldByLabel(wrapper, "Portalname").find("input").setValue("Neu");
    await settle(wrapper);

    const emitted = wrapper.emitted("update:catalog");
    expect(emitted.at(-1)[0].name).toBe("Neu");
  });
});

describe("InstanceEditCatalog Portal-URL", () => {
  it.each([
    ["portal.example.org"],
    ["ftp://portal.example.org"],
    ["/relative/path"],
    ["https://"],
  ])("rejects %s with an inline message", async (value) => {
    const wrapper = mountTab();
    const field = fieldByLabel(wrapper, "Portal-URL");

    await field.find("input").setValue(value);
    const valid = wrapper.vm.validate();
    await settle(wrapper);

    expect(valid).toBe(false);
    expect(fieldMessage(field)).toMatch(/http/);
  });

  it.each([
    [""],
    ["http://portal.example.org"],
    ["https://portal.example.org/de"],
  ])("accepts %j", async (value) => {
    const wrapper = mountTab();
    const field = fieldByLabel(wrapper, "Portal-URL");

    await field.find("input").setValue(value);
    const valid = wrapper.vm.validate();
    await settle(wrapper);

    expect(valid).toBe(true);
    expect(fieldMessage(field)).not.toMatch(/http/);
  });
});

describe("InstanceEditCatalog Theme colours", () => {
  it("asks to check both colours on light and dark surfaces", () => {
    const wrapper = mountTab();
    expect(wrapper.find(".theme-contrast-hint").text()).toContain(
      "sowohl auf hellen als auch auf dunklen Flächen (Light-Mode und Dark-Mode)"
    );
  });

  it("previews one primary and one secondary icon on a light and a dark tile", () => {
    const base = instance();
    const wrapper = mountTab({
      instance: {
        ...base,
        branding: {
          ...base.branding,
          theme: { colors: { primary: "#ff0000", secondary: "#00ff00" } },
        },
      },
    });

    const tiles = wrapper.findAll(".theme-preview__tile");
    expect(tiles.length).toBe(2);
    expect(tiles.at(0).attributes("data-surface")).toBe("light");
    expect(tiles.at(0).text()).toContain("Helle Fläche (Light-Mode)");
    expect(tiles.at(1).attributes("data-surface")).toBe("dark");
    expect(tiles.at(1).text()).toContain("Dunkle Fläche (Dark-Mode)");

    for (let index = 0; index < 2; index += 1) {
      const icons = tiles.at(index).findAll(".theme-preview__icon");
      expect(icons.length).toBe(2);
      expect(icons.at(0).attributes("data-role")).toBe("primary");
      expect(icons.at(0).attributes("style")).toContain("rgb(255, 0, 0)");
      expect(icons.at(1).attributes("data-role")).toBe("secondary");
      expect(icons.at(1).attributes("style")).toContain("rgb(0, 255, 0)");
    }
  });

  it("follows the colour while it is typed", async () => {
    const wrapper = mountTab();
    const primary = wrapper.find(".theme-preview__icon[data-role='primary']");
    expect(primary.attributes("style") || "").not.toContain("rgb(18, 52, 86)");

    await wrapper.setData({
      local: {
        ...wrapper.vm.local,
        branding: {
          ...wrapper.vm.local.branding,
          theme: { colors: { primary: "#123456", secondary: "" } },
        },
      },
    });

    expect(
      wrapper
        .find(".theme-preview__icon[data-role='primary']")
        .attributes("style")
    ).toContain("rgb(18, 52, 86)");
  });
});

describe("InstanceEditCatalog Kopfbereich entry card", () => {
  it("no longer offers the two old text fields", () => {
    const wrapper = mountTab();

    expect(fieldByLabel(wrapper, "Überschrift im Kopfbereich")).toBeUndefined();
    expect(fieldByLabel(wrapper, "Unterzeile im Kopfbereich")).toBeUndefined();
  });

  it("reads Standard-Layout while no layout is stored", () => {
    const wrapper = mountTab({ catalog: catalog({ heroLayout: null }) });

    expect(wrapper.text()).toContain("Standard-Layout");
    expect(wrapper.text()).not.toContain("Angepasst");
  });

  it.each([
    [{ version: 1, type: "variant", variant: "poly" }, "Muster"],
    [{ version: 1, type: "color", light: "#ffffff" }, "Farbe"],
    [
      { version: 1, type: "image", image: { source: "media", mediaId: "m1" } },
      "Bild",
    ],
    [undefined, "Muster"],
  ])("names the stored layout and background %j", (background, label) => {
    const wrapper = mountTab({
      instance: withBackground(background),
      catalog: catalog({ heroLayout: { version: 1, blocks: blocks(5) } }),
    });

    expect(wrapper.text()).toContain(
      `Angepasst · 5 Blöcke · Hintergrund: ${label}`
    );
  });

  it("counts a single block in the singular", () => {
    const wrapper = mountTab({
      catalog: catalog({ heroLayout: { version: 1, blocks: blocks(1) } }),
    });

    expect(wrapper.text()).toContain("Angepasst · 1 Block · Hintergrund");
  });

  it("disables the editor button with a hint while the tab has unsaved changes", () => {
    const wrapper = mountTab({ hasUnsavedChanges: true });

    const button = buttonByLabel(wrapper, "Kopfbereich bearbeiten");
    expect(button.attributes("disabled")).toBe("disabled");
    expect(wrapper.text()).toContain("Bitte zuerst speichern.");
  });

  it("offers the editor button without the hint once saved", () => {
    const wrapper = mountTab({ hasUnsavedChanges: false });

    const button = buttonByLabel(wrapper, "Kopfbereich bearbeiten");
    expect(button.attributes("disabled")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Bitte zuerst speichern.");
  });

  it("hands the stored Portal-URL to the editor, for its Live Preview", () => {
    const wrapper = mountTab();

    expect(
      wrapper.findComponent({ name: "HeroEditorDialog" }).props("portalUrl")
    ).toBe("https://portal.example.org");
  });

  it("hands an empty string on when no Portal-URL is stored", () => {
    const wrapper = mountTab({ instance: instance({ portalUrl: undefined }) });

    expect(
      wrapper.findComponent({ name: "HeroEditorDialog" }).props("portalUrl")
    ).toBe("");
  });

  it("opens the Kopfbereich dialog and asks for a refetch when it closes", async () => {
    const wrapper = mountTab();

    await buttonByLabel(wrapper, "Kopfbereich bearbeiten").trigger("click");
    await flushPromises();
    await settle(wrapper);

    expect(activeDialog()).not.toBeNull();
    expect(activeDialog().classList.contains("v-dialog--fullscreen")).toBe(
      true
    );
    expect(activeDialogText()).toContain("Kopfbereich");
    expect(wrapper.emitted("refetch")).toBeUndefined();

    dialogButton("Schließen").click();
    await flushPromises();
    await settle(wrapper);

    expect(wrapper.emitted("refetch")).toHaveLength(1);
    expect(activeDialog()).toBeNull();
  });
});
