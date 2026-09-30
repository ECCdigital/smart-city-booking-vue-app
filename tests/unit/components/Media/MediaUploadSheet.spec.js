import { describe, expect, it, vi } from "vitest";
import MediaUploadSheet from "@/components/Media/MediaUploadSheet.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

function mountSheet(propsData = {}) {
  return mountComponent(MediaUploadSheet, {
    propsData: { value: true, ...propsData },
  });
}

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/** The sheet detaches into `data-app`, so its rows are read off the document. */
function optionLabels() {
  return Array.from(
    document.querySelectorAll(".media-upload-sheet .v-list-item__title")
  ).map((el) => el.textContent.trim());
}

function sheetText() {
  return document.querySelector(".media-upload-sheet")?.textContent ?? "";
}

/** Hands `files` to a file input the way the browser's chooser does. */
async function pickFiles(input, files) {
  Object.defineProperty(input.element, "files", {
    value: files,
    configurable: true,
  });
  await input.trigger("change");
}

describe("MediaUploadSheet", () => {
  it("offers the gallery, the camera and the files", async () => {
    const wrapper = mountSheet();
    await settle(wrapper);

    expect(optionLabels()).toEqual([
      "Aus der Galerie wählen",
      "Foto aufnehmen",
      "Datei wählen",
    ]);
  });

  it("opens the chooser inside the tap and closes the sheet", async () => {
    const wrapper = mountSheet();
    await settle(wrapper);
    const click = vi.spyOn(
      wrapper.find("input[accept='image/*'][multiple]").element,
      "click"
    );

    document.querySelector("[data-test='upload-gallery']").click();
    await settle(wrapper);

    expect(click).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("input")).toEqual([[false]]);
  });

  it("takes a photo through the rear camera", () => {
    const wrapper = mountSheet();

    const camera = wrapper.find("input[capture]");
    expect(camera.attributes("capture")).toBe("environment");
    expect(camera.attributes("accept")).toBe("image/*");
  });

  it("hands the picked files on", async () => {
    const wrapper = mountSheet();
    const files = [new File(["a"], "a.jpg"), new File(["b"], "b.jpg")];

    await pickFiles(wrapper.find("input[accept='image/*'][multiple]"), files);

    expect(wrapper.emitted("pick")).toEqual([[files]]);
  });

  it("lets the caller's visibility be switched", async () => {
    const wrapper = mountSheet({ visibility: "public" });
    await settle(wrapper);

    expect(sheetText()).toContain("Sichtbarkeit");
    Array.from(document.querySelectorAll(".media-upload-sheet button"))
      .find((el) => el.textContent.trim() === "intern")
      .click();
    await settle(wrapper);

    expect(wrapper.emitted("update:visibility")).toEqual([["intern"]]);
  });

  it("offers no visibility where the caller decides it", async () => {
    const wrapper = mountSheet();
    await settle(wrapper);

    expect(sheetText()).not.toContain("Sichtbarkeit");
  });

  it("offers only the files where no image is allowed", async () => {
    const wrapper = mountSheet({ accept: "application/pdf" });
    await settle(wrapper);

    expect(optionLabels()).toEqual(["Datei wählen"]);
  });
});
