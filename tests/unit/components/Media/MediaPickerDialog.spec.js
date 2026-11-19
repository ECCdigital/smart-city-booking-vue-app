import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MediaPickerDialog from "@/components/Media/MediaPickerDialog.vue";
import ApiMediaService from "@/services/api/ApiMediaService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { activeDialog, activeDialogText } from "@tests/unit/support/dialog";
import {
  PHONE_WIDTH,
  resetViewportWidth,
  setViewportWidth,
} from "@tests/unit/support/viewport";

vi.mock("@/services/api/ApiMediaService", () => ({
  MEDIA_SCOPE: { TENANT: "tenant", INSTANCE: "instance" },
  default: {
    getMediaList: vi.fn(),
    uploadMedia: vi.fn(),
  },
}));

vi.mock("@/services/MediaResolveService", () => ({
  default: { prime: vi.fn() },
}));

// `FormatService` reads the lodash global that `main.js` installs.
vi.mock("@/services/FormatService", () => ({
  default: { bytes: (value) => `${value} B` },
}));

vi.mock("@/services/permissions/MediaPermissionService", () => ({
  default: { allowCreate: vi.fn(() => true) },
}));

function medium(id) {
  return {
    id,
    title: id,
    originalFileName: `${id}.jpg`,
    kind: "image",
    size: 1000,
    visibility: "public",
    tags: [],
  };
}

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

/** Mounts the picker closed and opens it, which is what loads the grid. */
async function openPicker() {
  const wrapper = mountComponent(MediaPickerDialog, {
    propsData: { value: false, multiple: true },
    stubs: { MediaImage: true },
  });
  await wrapper.setProps({ value: true });
  await settle(wrapper);
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiMediaService.getMediaList.mockResolvedValue({
    data: { items: [medium("hafen"), medium("saal")], total: 2 },
  });
  setViewportWidth(PHONE_WIDTH);
});

afterEach(() => resetViewportWidth());

describe("MediaPickerDialog on a phone", () => {
  it("fills the screen with the library's two-column grid", async () => {
    const wrapper = await openPicker();

    expect(activeDialog().classList).toContain("v-dialog--fullscreen");
    expect(wrapper.find(".media-picker__grid--phone").exists()).toBe(true);
    expect(wrapper.findAll(".media-picker__tile")).toHaveLength(2);
  });

  it("uploads through the sheet instead of a dropzone and picks the upload", async () => {
    ApiMediaService.uploadMedia.mockResolvedValue({ data: medium("neu") });
    const wrapper = await openPicker();
    const file = new File(["x"], "foto.jpg");

    await wrapper
      .findAll(".v-tab")
      .wrappers.find((tab) => tab.text().trim() === "Upload")
      .trigger("click");
    await settle(wrapper);
    expect(wrapper.find(".media-picker__dropzone").exists()).toBe(false);

    await wrapper.find("[data-test='picker-upload']").trigger("click");
    await settle(wrapper);
    const gallery = wrapper.find("input[accept='image/*'][multiple]");
    Object.defineProperty(gallery.element, "files", { value: [file] });
    await gallery.trigger("change");
    await settle(wrapper);

    expect(ApiMediaService.uploadMedia).toHaveBeenCalledWith("tenant", {
      file,
      visibility: "public",
    });
    expect(activeDialogText()).toContain("1 ausgewählt");
  });
});

describe("MediaPickerDialog for fonts", () => {
  async function openFontPicker() {
    const wrapper = mountComponent(MediaPickerDialog, {
      propsData: { value: false, kind: "font", scope: "instance" },
      stubs: { MediaImage: true },
    });
    await wrapper.setProps({ value: true });
    await settle(wrapper);
    await wrapper
      .findAll(".v-tab")
      .wrappers.find((tab) => tab.text().trim() === "Upload")
      .trigger("click");
    await settle(wrapper);
    return wrapper;
  }

  /** The input behind „Datei wählen“ of the sheet. */
  function filesInput(wrapper) {
    return wrapper
      .findAll("input[type='file']")
      .wrappers.find((input) => input.attributes("accept") !== "image/*");
  }

  function pickFiles(input, files) {
    Object.defineProperty(input.element, "files", { value: files });
    return input.trigger("change");
  }

  it("offers woff2 alone, up to 500 KB", async () => {
    const wrapper = await openFontPicker();

    await wrapper.find("[data-test='picker-upload']").trigger("click");
    await settle(wrapper);

    expect(filesInput(wrapper).attributes("accept")).toBe(".woff2,font/woff2");
    expect(document.body.textContent).toContain("woff2 bis 500 KB");
    // A font comes from the files, not from the gallery or the camera.
    expect(document.querySelector("[data-test='upload-files']")).not.toBeNull();
    expect(document.querySelector("[data-test='upload-gallery']")).toBeNull();
    expect(document.querySelector("[data-test='upload-camera']")).toBeNull();
  });

  it("refuses a TTF, OTF or WOFF before the upload and says to bring it as woff2", async () => {
    const wrapper = await openFontPicker();
    await wrapper.find("[data-test='picker-upload']").trigger("click");
    await settle(wrapper);

    await pickFiles(filesInput(wrapper), [new File(["x"], "Hausschrift.otf")]);
    await settle(wrapper);

    expect(ApiMediaService.uploadMedia).not.toHaveBeenCalled();
    expect(activeDialogText()).toContain(
      "„Hausschrift.otf“ ist eine OTF-Datei. Schriften bitte als woff2 hochladen."
    );
  });

  it("uploads a woff2 and picks it", async () => {
    ApiMediaService.uploadMedia.mockResolvedValue({
      data: { ...medium("haus"), kind: "font" },
    });
    const wrapper = await openFontPicker();
    await wrapper.find("[data-test='picker-upload']").trigger("click");
    await settle(wrapper);

    const file = new File(["wOF2"], "Hausschrift.woff2");
    await pickFiles(filesInput(wrapper), [file]);
    await settle(wrapper);

    expect(ApiMediaService.uploadMedia).toHaveBeenCalledWith("instance", {
      file,
      visibility: "public",
    });
    expect(activeDialogText()).toContain("1 ausgewählt");
  });
});
