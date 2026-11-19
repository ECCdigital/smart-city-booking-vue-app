import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { activeDialog } from "@tests/unit/support/dialog";
import { button } from "@tests/unit/support/vuetify";

vi.mock("@/services/api/ApiMediaService", () => ({
  MEDIA_SCOPE: { TENANT: "tenant", INSTANCE: "instance" },
  default: {
    getMediaList: vi.fn(),
    uploadMedia: vi.fn(),
    getMediaFileUrl: vi.fn(() => "/file"),
  },
}));

vi.mock("@/services/MediaResolveService", () => ({
  default: { prime: vi.fn(), resolve: vi.fn() },
}));

// `FormatService` reads the lodash global that `main.js` installs.
vi.mock("@/services/FormatService", () => ({
  default: { bytes: (value) => `${value} B` },
}));

vi.mock("@/services/permissions/MediaPermissionService", () => ({
  default: { allowCreate: vi.fn(() => true) },
}));

import PortalFooter from "@/components/Instance/Edit/PortalFooter.vue";
import ApiMediaService from "@/services/api/ApiMediaService";
import MediaResolveService from "@/services/MediaResolveService";

// The BMWSB funding logo of the release check: text in the picture, about 4:3.
function medium(id, overrides = {}) {
  return {
    id,
    title: `Logo ${id}`,
    originalFileName: `${id}.png`,
    kind: "image",
    size: 1000,
    visibility: "public",
    width: 400,
    height: 300,
    tags: [],
    ...overrides,
  };
}

function reference(mediaId) {
  return { source: "media", mediaId, url: null };
}

function footerLogo(mediaId, overrides = {}) {
  return {
    image: reference(mediaId),
    size: "md",
    link: "",
    imageDark: null,
    ...overrides,
  };
}

// The field of the variant opens a picker of its own; what counts here is
// what the section hands it and takes back.
const MediaReferenceFieldStub = {
  name: "MediaReferenceField",
  props: {
    value: { type: Object, default: null },
    label: { type: String, default: "" },
    scope: { type: String, default: "" },
    publicOnly: { type: Boolean, default: false },
    allowExternal: { type: Boolean, default: true },
  },
  render(h) {
    return h("div");
  },
};

// The image of a logo in the mock: which reference it shows, and how big.
const MediaReferenceImageStub = {
  name: "MediaReferenceImage",
  props: {
    reference: { type: Object, default: null },
    height: { type: [Number, String], default: undefined },
    width: { type: [Number, String], default: undefined },
  },
  render(h) {
    return h("div");
  },
};

/**
 * The section as the Portal tab holds it: the tab merges every `patch` into
 * its branding and hands it back down, so a spec can click its way through
 * several steps.
 */
function mountFooter(footerLogos = []) {
  const Host = {
    name: "PortalFooterHost",
    data() {
      return { branding: { active: true, footerLogos } };
    },
    render(h) {
      return h(PortalFooter, {
        ref: "footer",
        props: { branding: this.branding, portalName: "Marktplatz" },
        on: {
          patch: (changes) => {
            this.branding = { ...this.branding, ...changes };
          },
        },
      });
    },
  };
  return mountComponent(Host, {
    stubs: {
      MediaImage: true,
      MediaReferenceImage: MediaReferenceImageStub,
      MediaReferenceField: MediaReferenceFieldStub,
    },
  });
}

function logosOf(wrapper) {
  return wrapper.vm.branding.footerLogos;
}

function mockLogos(wrapper) {
  return wrapper.findAll("[data-test='footer-logo']");
}

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

async function openPicker(wrapper) {
  await wrapper.find("[data-test='footer-add']").trigger("click");
  await settle(wrapper);
}

async function pickInDialog(wrapper, ids) {
  const dialog = activeDialog();
  for (const id of ids) {
    const tile = Array.from(
      dialog.querySelectorAll(".media-picker__tile")
    ).find((element) => element.textContent.includes(`Logo ${id}`));
    tile.click();
    await wrapper.vm.$nextTick();
  }
  Array.from(dialog.querySelectorAll("button"))
    .find((element) => element.textContent.trim() === "Übernehmen")
    .click();
  await settle(wrapper);
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiMediaService.getMediaList.mockResolvedValue({
    data: {
      items: [medium("bmwsb"), medium("land"), medium("stadt")],
      total: 3,
    },
  });
  MediaResolveService.resolve.mockImplementation((scope, id) =>
    Promise.resolve(medium(id))
  );
});

describe("PortalFooter adding logos", () => {
  it("adds several public images at once, each in M without link or variant", async () => {
    const wrapper = mountFooter();

    await openPicker(wrapper);
    await pickInDialog(wrapper, ["bmwsb", "land"]);

    expect(logosOf(wrapper)).toEqual([footerLogo("bmwsb"), footerLogo("land")]);
    expect(mockLogos(wrapper)).toHaveLength(2);
  });

  it("marks the media already in the footer as assigned in the picker", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb")]);

    await openPicker(wrapper);

    const tiles = Array.from(
      activeDialog().querySelectorAll(".media-picker__tile")
    );
    const assigned = tiles.filter((tile) =>
      tile.textContent.includes("zugeordnet")
    );
    expect(assigned.map((tile) => tile.textContent)).toEqual([
      expect.stringContaining("Logo bmwsb"),
    ]);
  });

  it("takes no more than 12 logos and says which ones it left out", async () => {
    const eleven = Array.from({ length: 11 }, (_, i) => footerLogo(`m${i}`));
    const wrapper = mountFooter(eleven);

    await openPicker(wrapper);
    await pickInDialog(wrapper, ["bmwsb", "land"]);

    expect(logosOf(wrapper)).toHaveLength(12);
    expect(logosOf(wrapper)[11]).toEqual(footerLogo("bmwsb"));
    expect(wrapper.find("[data-test='footer-limit']").text()).toBe(
      "Höchstens 12 Logos: 1 Logo nicht hinzugefügt."
    );
  });

  it("offers no „+ Logo“ once 12 logos stand", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => footerLogo(`m${i}`));
    const wrapper = mountFooter(twelve);

    const add = wrapper.find("[data-test='footer-add']");
    expect(add.attributes("disabled")).toBe("disabled");
    expect(add.attributes("title")).toBe("Höchstens 12 Logos");
  });
});

function fields(wrapper) {
  return wrapper.find("[data-test='footer-logo-fields']");
}

async function selectLogo(wrapper, index) {
  await mockLogos(wrapper).at(index).trigger("click");
  await settle(wrapper);
}

function linkField(wrapper) {
  return fields(wrapper)
    .findAll(".v-text-field")
    .wrappers.find((field) => field.find("label").text() === "Link (optional)");
}

function darkField(wrapper) {
  return wrapper
    .findAllComponents({ name: "MediaReferenceField" })
    .wrappers.find(
      (field) =>
        field.props("label") === "Variante für den Dunkelmodus (optional)"
    );
}

describe("PortalFooter fields of a logo", () => {
  it("opens no fields until a logo is clicked, then those of that logo", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb"), footerLogo("land")]);
    await settle(wrapper);
    expect(fields(wrapper).exists()).toBe(false);

    await selectLogo(wrapper, 1);

    expect(fields(wrapper).text()).toContain("Logo land");
    expect(mockLogos(wrapper).at(1).attributes("aria-pressed")).toBe("true");
    expect(mockLogos(wrapper).at(0).attributes("aria-pressed")).toBe("false");
  });

  it("sets the size S, M or L, M by default", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb"), footerLogo("land")]);
    await selectLogo(wrapper, 0);

    const sizes = fields(wrapper).findAll(".v-btn-toggle .v-btn");
    expect(sizes.wrappers.map((entry) => entry.text())).toEqual([
      "S",
      "M",
      "L",
    ]);
    expect(button(fields(wrapper), "M").classes()).toContain("v-btn--active");

    await button(fields(wrapper), "L").trigger("click");
    await settle(wrapper);

    expect(logosOf(wrapper)[0].size).toBe("lg");
    expect(logosOf(wrapper)[1].size).toBe("md");
  });

  it("sets a link and stores a cleared one as empty", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb")]);
    await selectLogo(wrapper, 0);

    await linkField(wrapper)
      .find("input")
      .setValue("https://www.bmwsb.bund.de");
    expect(logosOf(wrapper)[0].link).toBe("https://www.bmwsb.bund.de");

    await linkField(wrapper).find("input").setValue("");
    expect(logosOf(wrapper)[0].link).toBe("");
  });

  it("sets and drops the variant for dark mode, only from the library and public", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb")]);
    await selectLogo(wrapper, 0);

    const field = darkField(wrapper);
    expect(field.props("publicOnly")).toBe(true);
    expect(field.props("allowExternal")).toBe(false);
    expect(field.props("scope")).toBe("instance");

    field.vm.$emit("input", reference("bmwsb-dunkel"));
    await settle(wrapper);
    expect(logosOf(wrapper)[0].imageDark).toEqual(reference("bmwsb-dunkel"));

    darkField(wrapper).vm.$emit("input", null);
    await settle(wrapper);
    expect(logosOf(wrapper)[0].imageDark).toBeNull();
  });
});

function section(wrapper) {
  return wrapper.vm.$refs.footer;
}

function fieldMessage(field) {
  const message = field.find(".v-messages__message");
  return message.exists() ? message.text() : "";
}

describe("PortalFooter link check on save", () => {
  it("passes with empty and absolute http(s) links", async () => {
    const wrapper = mountFooter([
      footerLogo("bmwsb", { link: "https://www.bmwsb.bund.de" }),
      footerLogo("land"),
    ]);

    expect(section(wrapper).validate()).toBe(true);
  });

  it("refuses a link that is no http(s) address and opens the logo that holds it", async () => {
    const wrapper = mountFooter([
      footerLogo("bmwsb"),
      footerLogo("land", { link: "javascript:alert(1)" }),
    ]);
    await settle(wrapper);

    expect(section(wrapper).validate()).toBe(false);
    await settle(wrapper);

    expect(fields(wrapper).text()).toContain("Logo land");
    expect(fieldMessage(linkField(wrapper))).toBe(
      "Bitte eine vollständige Adresse mit http:// oder https:// angeben oder das Feld leeren."
    );
  });

  it("says so at once when a link is typed that cannot be stored", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb")]);
    await selectLogo(wrapper, 0);

    await linkField(wrapper).find("input").setValue("www.bmwsb.bund.de");
    await settle(wrapper);

    expect(fieldMessage(linkField(wrapper))).toBe(
      "Bitte eine vollständige Adresse mit http:// oder https:// angeben oder das Feld leeren."
    );
  });
});

function action(wrapper, label) {
  return fields(wrapper).find(`button[aria-label='${label}']`);
}

function mediaIdsOf(wrapper) {
  return logosOf(wrapper).map((logo) => logo.image.mediaId);
}

describe("PortalFooter order of the logos", () => {
  it("moves the open logo right and left, and its fields stay open", async () => {
    const wrapper = mountFooter([
      footerLogo("bmwsb", { size: "lg" }),
      footerLogo("land"),
      footerLogo("stadt"),
    ]);
    await selectLogo(wrapper, 0);
    expect(action(wrapper, "Nach links").attributes("disabled")).toBe(
      "disabled"
    );

    await action(wrapper, "Nach rechts").trigger("click");
    await settle(wrapper);
    expect(mediaIdsOf(wrapper)).toEqual(["land", "bmwsb", "stadt"]);
    expect(logosOf(wrapper)[1].size).toBe("lg");
    expect(fields(wrapper).text()).toContain("Logo bmwsb");
    expect(mockLogos(wrapper).at(1).attributes("aria-pressed")).toBe("true");

    await action(wrapper, "Nach rechts").trigger("click");
    await settle(wrapper);
    expect(mediaIdsOf(wrapper)).toEqual(["land", "stadt", "bmwsb"]);
    expect(action(wrapper, "Nach rechts").attributes("disabled")).toBe(
      "disabled"
    );

    await action(wrapper, "Nach links").trigger("click");
    await settle(wrapper);
    expect(mediaIdsOf(wrapper)).toEqual(["land", "bmwsb", "stadt"]);
  });

  it("removes the open logo and closes its fields", async () => {
    const wrapper = mountFooter([
      footerLogo("bmwsb"),
      footerLogo("land"),
      footerLogo("stadt"),
    ]);
    await selectLogo(wrapper, 1);

    await action(wrapper, "Entfernen").trigger("click");
    await settle(wrapper);

    expect(mediaIdsOf(wrapper)).toEqual(["bmwsb", "stadt"]);
    expect(mockLogos(wrapper)).toHaveLength(2);
    expect(fields(wrapper).exists()).toBe(false);
  });
});

function mock(wrapper) {
  return wrapper.find(".portal-footer-mock");
}

function imageOf(logo) {
  return logo.findComponent({ name: "MediaReferenceImage" });
}

async function showDark(wrapper) {
  await button(wrapper, "Dunkel").trigger("click");
  await settle(wrapper);
}

describe("PortalFooter mock of the footer", () => {
  it("shows the logos in order at 60 % of 48, 80 and 120 px", async () => {
    const wrapper = mountFooter([
      footerLogo("bmwsb", { size: "lg" }),
      footerLogo("land", { size: "md" }),
      footerLogo("stadt", { size: "sm" }),
    ]);
    await settle(wrapper);

    const images = mockLogos(wrapper).wrappers.map(imageOf);
    expect(images.map((image) => image.props("reference").mediaId)).toEqual([
      "bmwsb",
      "land",
      "stadt",
    ]);
    expect(images.map((image) => image.props("height"))).toEqual([72, 48, 29]);
    // 4:3 like the funding logo of the release check.
    expect(images.map((image) => image.props("width"))).toEqual([96, 64, 39]);
  });

  it("keeps a wide logo within 3.5 times its height", async () => {
    MediaResolveService.resolve.mockImplementation((scope, id) =>
      Promise.resolve(medium(id, { width: 1000, height: 100 }))
    );
    const wrapper = mountFooter([footerLogo("band")]);
    await settle(wrapper);

    expect(imageOf(mockLogos(wrapper).at(0)).props("width")).toBe(168);
  });

  it("shows the portal name under the logos", () => {
    const wrapper = mountFooter([footerLogo("bmwsb")]);

    expect(mock(wrapper).text()).toContain("Marktplatz");
  });

  it("starts light and switches to dark", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb")]);
    expect(mock(wrapper).attributes("data-mode")).toBe("light");

    await showDark(wrapper);

    expect(mock(wrapper).attributes("data-mode")).toBe("dark");
  });

  it("puts a logo without variant on a white plate in dark mode only", async () => {
    const wrapper = mountFooter([footerLogo("bmwsb")]);
    const plate = () =>
      mockLogos(wrapper).at(0).classes("portal-footer-mock__logo--plate");
    expect(plate()).toBe(false);

    await showDark(wrapper);

    expect(plate()).toBe(true);
    expect(imageOf(mockLogos(wrapper).at(0)).props("reference").mediaId).toBe(
      "bmwsb"
    );
  });

  it("shows the variant without plate in dark mode", async () => {
    const wrapper = mountFooter([
      footerLogo("bmwsb", { imageDark: reference("bmwsb-dunkel") }),
    ]);
    expect(imageOf(mockLogos(wrapper).at(0)).props("reference").mediaId).toBe(
      "bmwsb"
    );

    await showDark(wrapper);

    const logo = mockLogos(wrapper).at(0);
    expect(logo.classes("portal-footer-mock__logo--plate")).toBe(false);
    expect(imageOf(logo).props("reference").mediaId).toBe("bmwsb-dunkel");
  });
});
