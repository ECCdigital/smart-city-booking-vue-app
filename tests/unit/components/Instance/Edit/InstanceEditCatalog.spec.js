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
import { toggleSwitch } from "@tests/unit/support/vuetify";

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
  // The media fields and the font's picker are backed by the media API; what
  // is under test is the tab around them.
  return mountComponent(InstanceEditCatalog, {
    store: new Vuex.Store({ modules: { toasts } }),
    propsData: { instance: instance(), catalog: catalog(), ...propsData },
    stubs: {
      MediaReferenceField: true,
      MediaReferenceImage: true,
      MediaPickerDialog: true,
    },
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

function section(wrapper, title) {
  return wrapper
    .findAllComponents({ name: "SubSection" })
    .wrappers.find((entry) => entry.props("title") === title);
}

function sectionTitles(wrapper) {
  return wrapper
    .findAllComponents({ name: "SubSection" })
    .wrappers.map((entry) => entry.props("title"));
}

function withColors(colors) {
  const base = instance();
  return {
    ...base,
    branding: {
      ...base.branding,
      theme: { colors: { primary: "", secondary: "", accent: "", ...colors } },
    },
  };
}

function colorRow(wrapper, key) {
  return wrapper.find(`.portal-color-row[data-color='${key}']`);
}

/** The part of the preview tile in one mode of one colour row. */
function previewPart(wrapper, key, mode, part) {
  return colorRow(wrapper, key).find(
    `.portal-color-preview[data-mode='${mode}'] [data-part='${part}']`
  );
}

function lastBranding(wrapper) {
  return wrapper.emitted("update:instance").at(-1)[0].branding;
}

const ACCENT_FALLBACK_SENTENCE =
  "Badges und Streifen in Primär, „Pauschal“ in Sekundär, wie heute";

describe("InstanceEditCatalog sections by area of the page", () => {
  it("orders the appearance by area of the page, then the Kopfbereich", () => {
    const wrapper = mountTab();

    expect(sectionTitles(wrapper)).toEqual([
      "Farben",
      "Kopfleiste",
      "Schrift",
      "Anmeldeseiten",
      "Fußbereich",
      "Kopfbereich",
    ]);
  });

  it("keeps App-Logo and Favicon in the Kopfleiste", () => {
    const wrapper = mountTab();
    const labels = section(wrapper, "Kopfleiste")
      .findAllComponents({ name: "MediaReferenceField" })
      .wrappers.map((field) => field.attributes("label"));

    expect(labels).toEqual(["App-Logo", "Favicon"]);
  });

  it("stores a new App-Logo as reference and drops the legacy address", async () => {
    const wrapper = mountTab({
      instance: {
        ...instance(),
        branding: {
          ...instance().branding,
          logoUrl: "https://old.example/l.png",
        },
      },
    });
    const reference = { source: "media", mediaId: "m1", url: null };

    section(wrapper, "Kopfleiste")
      .findAllComponents({ name: "MediaReferenceField" })
      .at(0)
      .vm.$emit("input", reference);
    await settle(wrapper);

    expect(lastBranding(wrapper).logo).toEqual(reference);
    expect(lastBranding(wrapper).logoUrl).toBe("");
  });
});

describe("InstanceEditCatalog Farben", () => {
  it("begins with the switch Benutzerdefiniertes Theme", async () => {
    const wrapper = mountTab();
    const colors = section(wrapper, "Farben");

    expect(colors.text().indexOf("Benutzerdefiniertes Theme")).toBeLessThan(
      colors.text().indexOf("Primärfarbe")
    );

    await toggleSwitch(colors, "Benutzerdefiniertes Theme");

    expect(lastBranding(wrapper).active).toBe(true);
  });

  it("names what each colour carries", () => {
    const wrapper = mountTab();

    expect(colorRow(wrapper, "primary").text()).toContain("Interaktiv");
    expect(colorRow(wrapper, "secondary").text()).toContain("Auswahl");
    expect(colorRow(wrapper, "accent").text()).toContain("Badges und Dekor");
  });

  it("leaves an empty accent with the placeholder and says what applies then", () => {
    const wrapper = mountTab({ instance: withColors({}) });
    const field = fieldByLabel(wrapper, "Akzentfarbe (optional)");

    expect(field.find("input").element.value).toBe("");
    expect(field.find("input").attributes("placeholder")).toBe("Nicht gesetzt");
    expect(colorRow(wrapper, "accent").text()).toContain(
      ACCENT_FALLBACK_SENTENCE
    );
  });

  it("drops the sentence once an accent is set", () => {
    const wrapper = mountTab({ instance: withColors({ accent: "#f59e0b" }) });

    expect(
      fieldByLabel(wrapper, "Akzentfarbe (optional)").find("input").element
        .value
    ).toBe("#f59e0b");
    expect(colorRow(wrapper, "accent").text()).not.toContain(
      ACCENT_FALLBACK_SENTENCE
    );
  });

  it("sends a typed accent with the instance", async () => {
    const wrapper = mountTab();

    await fieldByLabel(wrapper, "Akzentfarbe (optional)")
      .find("input")
      .setValue("#f59e0b");

    expect(lastBranding(wrapper).theme.colors).toEqual({
      primary: "",
      secondary: "",
      accent: "#f59e0b",
    });
  });

  it("empties a cleared accent to an empty string, not null", async () => {
    const wrapper = mountTab({ instance: withColors({ accent: "#f59e0b" }) });
    const field = fieldByLabel(wrapper, "Akzentfarbe (optional)");

    await field.find(".v-input__icon--clear button").trigger("click");
    await settle(wrapper);

    expect(lastBranding(wrapper).theme.colors.accent).toBe("");
    expect(colorRow(wrapper, "accent").text()).toContain(
      ACCENT_FALLBACK_SENTENCE
    );
  });

  it("refuses an accent that is no #rrggbb on validate", async () => {
    const wrapper = mountTab();
    const field = fieldByLabel(wrapper, "Akzentfarbe (optional)");

    await field.find("input").setValue("#abc");
    const valid = wrapper.vm.validate();
    await settle(wrapper);

    expect(valid).toBe(false);
    expect(fieldMessage(field)).toMatch(/#rrggbb/);
  });

  it.each([["light"], ["dark"]])(
    "previews the primary colour on the result card's price and button, %s",
    (mode) => {
      const wrapper = mountTab({
        instance: withColors({ primary: "#1976d2", secondary: "#ffd54f" }),
      });

      expect(
        previewPart(wrapper, "primary", mode, "price").attributes("style")
      ).toContain("color: rgb(25, 118, 210)");
      const button = previewPart(wrapper, "primary", mode, "button");
      expect(button.text()).toBe("Buchen");
      expect(button.attributes("style")).toContain(
        "background: rgb(25, 118, 210)"
      );
      expect(button.attributes("style")).toContain("color: rgb(255, 255, 255)");
    }
  );

  it.each([["light"], ["dark"]])(
    "previews the secondary colour on a selected chip with its contrast, %s",
    (mode) => {
      const wrapper = mountTab({
        instance: withColors({ primary: "#1976d2", secondary: "#ffd54f" }),
      });
      const chip = previewPart(wrapper, "secondary", mode, "chip-selected");

      expect(chip.attributes("style")).toContain(
        "background: rgb(255, 213, 79)"
      );
      expect(chip.attributes("style")).toContain("color: rgb(0, 0, 0)");
    }
  );

  it.each([["light"], ["dark"]])(
    "previews the accent on category circle, stripe and both badges, %s",
    (mode) => {
      const wrapper = mountTab({
        instance: withColors({
          primary: "#1976d2",
          secondary: "#26a69a",
          accent: "#ffd54f",
        }),
      });
      const accent = "rgb(255, 213, 79)";

      for (const part of ["category", "stripe", "badge-type", "badge-flat"]) {
        expect(
          previewPart(wrapper, "accent", mode, part).attributes("style")
        ).toContain(`background: ${accent}`);
      }
      expect(
        previewPart(wrapper, "accent", mode, "badge-type").attributes("style")
      ).toContain("color: rgb(0, 0, 0)");
    }
  );

  it("falls back to today's colours without accent: primary, „Pauschal“ secondary", () => {
    const wrapper = mountTab({
      instance: withColors({ primary: "#1976d2", secondary: "#26a69a" }),
    });
    const style = (part) =>
      previewPart(wrapper, "accent", "light", part).attributes("style");

    expect(style("category")).toContain("background: rgb(25, 118, 210)");
    expect(style("stripe")).toContain("background: rgb(25, 118, 210)");
    expect(style("badge-type")).toContain("background: rgb(25, 118, 210)");
    expect(style("badge-flat")).toContain("background: rgb(38, 166, 154)");
  });

  it("follows the accent while it is typed", async () => {
    const wrapper = mountTab({
      instance: withColors({ primary: "#1976d2", secondary: "#26a69a" }),
    });

    await fieldByLabel(wrapper, "Akzentfarbe (optional)")
      .find("input")
      .setValue("#f59e0b");
    await settle(wrapper);

    for (const mode of ["light", "dark"]) {
      expect(
        previewPart(wrapper, "accent", mode, "stripe").attributes("style")
      ).toContain("background: rgb(245, 158, 11)");
    }
  });

  it("follows the primary colour while it is typed", async () => {
    const wrapper = mountTab();

    await fieldByLabel(wrapper, "Primärfarbe")
      .find("input")
      .setValue("#123456");
    await settle(wrapper);

    expect(
      previewPart(wrapper, "primary", "light", "button").attributes("style")
    ).toContain("background: rgb(18, 52, 86)");
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
