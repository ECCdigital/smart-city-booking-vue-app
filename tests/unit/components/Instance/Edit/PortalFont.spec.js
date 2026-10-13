import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";
import { heroLayoutResponse } from "@tests/unit/support/heroLayout";
import {
  activeDialog,
  activeDialogText,
  dialogButton,
} from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiCatalogService", () => ({
  default: {
    getHeroLayout: vi.fn(),
    updateHeroLayout: vi.fn(),
    previewHeroLayout: vi.fn(),
  },
}));

vi.mock("@/services/api/ApiMediaService", () => ({
  MEDIA_SCOPE: { TENANT: "tenant", INSTANCE: "instance" },
  default: {
    getMediaList: vi.fn(),
    getMediaFileBlob: vi.fn(),
    uploadMedia: vi.fn(),
  },
}));

vi.mock("@/services/MediaResolveService", () => ({
  default: { resolve: vi.fn(), prime: vi.fn() },
}));

vi.mock("@/services/permissions/MediaPermissionService", () => ({
  default: { allowCreate: vi.fn(() => true) },
}));

// Unpacking a woff2 is the reader's own spec; here it answers what a file
// would.
vi.mock("@/utils/instanceFonts", async (importOriginal) => ({
  ...(await importOriginal()),
  fontDefaultWeight: vi.fn(),
}));

import InstanceEditCatalog from "@/components/Instance/Edit/InstanceEditCatalog.vue";
import ApiCatalogService from "@/services/api/ApiCatalogService";
import ApiMediaService from "@/services/api/ApiMediaService";
import MediaResolveService from "@/services/MediaResolveService";
import { fontDefaultWeight } from "@/utils/instanceFonts";

const KB = 1024;

function fontMedium(id, overrides = {}) {
  return {
    id,
    title: `Schrift ${id}`,
    originalFileName: `${id}.woff2`,
    kind: "font",
    mimeType: "font/woff2",
    size: 48 * KB,
    visibility: "public",
    tags: [],
    ...overrides,
  };
}

function instance(font = null) {
  return {
    id: "i1",
    portalUrl: "https://portal.example.org",
    branding: {
      active: true,
      theme: { colors: { primary: "#1d4ed8", secondary: "#f59e0b" } },
      logo: null,
      favicon: null,
      logoUrl: "",
      faviconUrl: "",
      font,
    },
  };
}

function ownFont(mediaId, license = null) {
  return {
    source: "media",
    reference: { source: "media", mediaId, url: null },
    license,
  };
}

const STORED_LICENSE = {
  confirmedAt: "2026-10-01T08:00:00.000Z",
  confirmedBy: "admin@example.org",
};

function mountTab(font = null) {
  return mountComponent(InstanceEditCatalog, {
    store: new Vuex.Store({ modules: { toasts } }),
    propsData: {
      instance: instance(font),
      catalog: { type: "instance", name: "Marktplatz", excludedTenantIds: [] },
    },
    stubs: { MediaReferenceField: true, MediaReferenceImage: true },
  });
}

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

/** What the section shows: the font tiles in their order. */
function tiles(wrapper) {
  return wrapper.findAll("[data-test='font-tile']").wrappers;
}

function tileNamed(wrapper, name) {
  return tiles(wrapper).find(
    (tile) => tile.find(".portal-font__name").text() === name
  );
}

function checkedTileNames(wrapper) {
  return tiles(wrapper)
    .filter((tile) => tile.attributes("aria-checked") === "true")
    .map((tile) => tile.find(".portal-font__name").text());
}

/** The font of the last change the tab sent up. */
function emittedFont(wrapper) {
  const updates = wrapper.emitted("update:instance") || [];
  return updates[updates.length - 1][0].branding.font;
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiCatalogService.getHeroLayout.mockResolvedValue(heroLayoutResponse());
  ApiMediaService.getMediaList.mockResolvedValue({
    data: { items: [fontMedium("f1")], total: 1 },
  });
  ApiMediaService.getMediaFileBlob.mockResolvedValue({
    data: new Blob(["wOF2"]),
  });
  MediaResolveService.resolve.mockImplementation((scope, id) =>
    Promise.resolve(fontMedium(id))
  );
  fontDefaultWeight.mockResolvedValue(null);
});

describe("PortalFont tiles", () => {
  it("offers the system font, the nine of the list and an own font", () => {
    const wrapper = mountTab();

    expect(
      tiles(wrapper).map((tile) => tile.find(".portal-font__name").text())
    ).toEqual([
      "Systemschrift",
      "Inter",
      "Open Sans",
      "Roboto",
      "Noto Sans",
      "Public Sans",
      "Atkinson Hyperlegible Next",
      "IBM Plex Sans",
      "Figtree",
      "Noto Serif",
      "Eigene Schrift",
    ]);
  });

  it("shows every font of the list with Aa, a sample line in itself and its kind", () => {
    const wrapper = mountTab();
    const serif = tileNamed(wrapper, "Noto Serif");
    const sans = tileNamed(wrapper, "Figtree");

    expect(serif.find(".portal-font__aa").text()).toBe("Aa");
    expect(serif.find(".portal-font__sample").text()).toContain(
      "Räume, Sportplätze und Lastenräder buchen"
    );
    expect(serif.find(".portal-font__sample").attributes("style")).toContain(
      "noto-serif"
    );
    expect(serif.find(".portal-font__meta").text()).toBe("Mit Serifen");
    expect(sans.find(".portal-font__meta").text()).toBe("Serifenlos");
  });

  it("marks the system font as chosen while the branding has no font", () => {
    const wrapper = mountTab(null);

    expect(checkedTileNames(wrapper)).toEqual(["Systemschrift"]);
  });

  it("marks the stored font of the list as chosen", () => {
    const wrapper = mountTab({ source: "curated", id: "ibm-plex-sans" });

    expect(checkedTileNames(wrapper)).toEqual(["IBM Plex Sans"]);
  });

  it("chooses a font of the list by its id, and the system font as null", async () => {
    const wrapper = mountTab();

    await tileNamed(wrapper, "Noto Serif").trigger("click");
    expect(emittedFont(wrapper)).toEqual({
      source: "curated",
      id: "noto-serif",
    });
    expect(checkedTileNames(wrapper)).toEqual(["Noto Serif"]);

    await tileNamed(wrapper, "Systemschrift").trigger("click");
    expect(emittedFont(wrapper)).toBeNull();
  });
});

/** Clicks the tile of the picker that shows the medium `title`. */
async function pickTile(wrapper, title) {
  const tile = Array.from(
    activeDialog().querySelectorAll(".media-picker__tile")
  ).find((element) => element.textContent.includes(title));
  tile.click();
  await settle(wrapper);
}

async function pickOwnFont(wrapper, title = "Schrift f1") {
  await tileNamed(wrapper, "Eigene Schrift").trigger("click");
  await settle(wrapper);
  await pickTile(wrapper, title);
  dialogButton("Übernehmen").click();
  await settle(wrapper);
}

describe("PortalFont own font", () => {
  it("opens the library with fonts alone, public ones only and no external link", async () => {
    const wrapper = mountTab();

    await tileNamed(wrapper, "Eigene Schrift").trigger("click");
    await settle(wrapper);

    expect(ApiMediaService.getMediaList).toHaveBeenCalledWith(
      "instance",
      expect.objectContaining({ kind: "font" })
    );
    expect(activeDialogText()).toContain("Nur Schriften");
    expect(activeDialogText()).toContain("intern = nicht wählbar");
    expect(activeDialogText()).not.toContain("Externer Link");
  });

  it("leaves an intern font unpickable", async () => {
    ApiMediaService.getMediaList.mockResolvedValue({
      data: {
        items: [fontMedium("f9", { title: "Entwurf", visibility: "intern" })],
        total: 1,
      },
    });
    const wrapper = mountTab();

    await tileNamed(wrapper, "Eigene Schrift").trigger("click");
    await settle(wrapper);
    await pickTile(wrapper, "Entwurf");

    expect(dialogButton("Übernehmen").disabled).toBe(true);
  });

  it("takes the picked font as a reference without licence and shows it in its tile", async () => {
    const wrapper = mountTab();

    await pickOwnFont(wrapper);

    expect(emittedFont(wrapper)).toEqual(ownFont("f1"));
    const tile = tileNamed(wrapper, "Schrift f1");
    expect(tile.attributes("aria-checked")).toBe("true");
    expect(tile.find(".portal-font__meta").text()).toContain("48 KB");
    expect(tile.find("[data-test='font-change']").text()).toBe("ändern");
  });

  it("shows a stored own font with its name and size", async () => {
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    expect(MediaResolveService.resolve).toHaveBeenCalledWith("instance", "f2");
    expect(checkedTileNames(wrapper)).toEqual(["Schrift f2"]);
  });

  it("changes the file through „ändern“ and keeps the own font when another tile was chosen in between", async () => {
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    await tileNamed(wrapper, "Inter").trigger("click");
    await tileNamed(wrapper, "Schrift f2").trigger("click");
    expect(emittedFont(wrapper)).toEqual(ownFont("f2", STORED_LICENSE));

    await tileNamed(wrapper, "Schrift f2")
      .find("[data-test='font-change']")
      .trigger("click");
    await settle(wrapper);
    expect(activeDialogText()).toContain("Nur Schriften");
  });
});

function hints(wrapper) {
  return wrapper
    .findAll("[data-test='font-hint']")
    .wrappers.map((hint) => hint.text());
}

describe("PortalFont hints on an own font", () => {
  it("warns from 100 KB on that the font comes too late more often", async () => {
    MediaResolveService.resolve.mockResolvedValue(
      fontMedium("f2", { size: 100 * KB })
    );
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    expect(hints(wrapper)).toHaveLength(1);
    expect(hints(wrapper)[0]).toContain("100 KB");
    expect(hints(wrapper)[0]).toContain("langsamem Netz");
    expect(hints(wrapper)[0]).toContain("verkleinerte Datei");
  });

  it("stays quiet below 100 KB and for a variable font that starts at 400", async () => {
    MediaResolveService.resolve.mockResolvedValue(
      fontMedium("f2", { size: 99 * KB })
    );
    fontDefaultWeight.mockResolvedValue(400);
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    expect(hints(wrapper)).toEqual([]);
  });

  it("warns when the default of a variable font is not the weight 400, read from its file", async () => {
    fontDefaultWeight.mockResolvedValue(200);
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    expect(ApiMediaService.getMediaFileBlob).toHaveBeenCalledWith(
      "instance",
      "f2"
    );
    expect(fontDefaultWeight).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(hints(wrapper)).toHaveLength(1);
    expect(hints(wrapper)[0]).toContain("Gewicht 200");
    expect(hints(wrapper)[0]).toContain("Ersatzschrift");
  });

  it("shows no hint while another tile is chosen", async () => {
    fontDefaultWeight.mockResolvedValue(200);
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    await tileNamed(wrapper, "Inter").trigger("click");

    expect(hints(wrapper)).toEqual([]);
  });
});

const LICENSE_TEXT =
  "Wir haben eine Lizenz, die die Schrift als Webfont auf unserer Website erlaubt.";

function licenseBox(wrapper) {
  return wrapper.find("[data-test='font-license']");
}

function licenseTicked(wrapper) {
  return licenseBox(wrapper).find("input").element.checked;
}

async function tickLicense(wrapper) {
  await licenseBox(wrapper).find("input").trigger("click");
  await settle(wrapper);
}

describe("PortalFont licence of an own font", () => {
  it("asks for the tick for a new font and refuses to save without it", async () => {
    const wrapper = mountTab();
    await pickOwnFont(wrapper);

    expect(licenseBox(wrapper).text()).toContain(LICENSE_TEXT);
    expect(licenseTicked(wrapper)).toBe(false);

    expect(wrapper.vm.validate()).toBe(false);
    await settle(wrapper);
    expect(licenseBox(wrapper).text()).toContain(
      "Ohne Bestätigung nicht speicherbar"
    );
  });

  it("saves the font with the tick", async () => {
    const wrapper = mountTab();
    await pickOwnFont(wrapper);

    await tickLicense(wrapper);

    expect(emittedFont(wrapper)).toEqual(ownFont("f1", { confirmed: true }));
    expect(wrapper.vm.validate()).toBe(true);
  });

  it("reads a stored confirmation as ticked", async () => {
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    expect(licenseTicked(wrapper)).toBe(true);
    expect(wrapper.vm.validate()).toBe(true);
  });

  it("asks for the tick again once the file changes", async () => {
    const wrapper = mountTab(ownFont("f2", STORED_LICENSE));
    await settle(wrapper);

    await tileNamed(wrapper, "Schrift f2")
      .find("[data-test='font-change']")
      .trigger("click");
    await settle(wrapper);
    await pickTile(wrapper, "Schrift f1");
    dialogButton("Übernehmen").click();
    await settle(wrapper);

    expect(emittedFont(wrapper)).toEqual(ownFont("f1"));
    expect(licenseTicked(wrapper)).toBe(false);
    expect(wrapper.vm.validate()).toBe(false);
  });

  it("needs no tick for the system font or a font of the list", async () => {
    const wrapper = mountTab();
    await pickOwnFont(wrapper);

    await tileNamed(wrapper, "Roboto").trigger("click");

    expect(licenseBox(wrapper).exists()).toBe(false);
    expect(wrapper.vm.validate()).toBe(true);
  });

  it("shows the backend's refusal of a font without licence at the tick", async () => {
    const wrapper = mountTab();
    await pickOwnFont(wrapper);

    wrapper.vm.showApiErrors([
      { field: "branding.font.license", code: "required" },
    ]);
    await settle(wrapper);

    expect(licenseBox(wrapper).text()).toContain(
      "Ohne Bestätigung nicht speicherbar"
    );
  });
});

function savedNote(wrapper) {
  const note = wrapper.find("[data-test='font-saved']");
  return note.exists() ? note.text() : "";
}

describe("PortalFont after saving", () => {
  it("says when the portal shows a changed font", async () => {
    const wrapper = mountTab();
    await tileNamed(wrapper, "Figtree").trigger("click");

    wrapper.vm.onSaved();
    await settle(wrapper);

    expect(savedNote(wrapper)).toContain("ab dem nächsten Aufruf einer Seite");
    expect(savedNote(wrapper)).toContain("erst nach dem Neuladen");
  });

  it("says nothing after a save that left the font alone", async () => {
    const wrapper = mountTab({ source: "curated", id: "inter" });

    wrapper.vm.onSaved();
    await settle(wrapper);

    expect(savedNote(wrapper)).toBe("");
  });

  it("drops the message with the next change of the font", async () => {
    const wrapper = mountTab();
    await tileNamed(wrapper, "Figtree").trigger("click");
    wrapper.vm.onSaved();
    await settle(wrapper);

    await tileNamed(wrapper, "Inter").trigger("click");

    expect(savedNote(wrapper)).toBe("");
  });
});
