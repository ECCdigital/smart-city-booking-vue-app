import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiMediaService", () => ({
  MEDIA_SCOPE: { TENANT: "tenant", INSTANCE: "instance" },
  default: {
    getMediaList: vi.fn(),
    getMediaFilePath: vi.fn(),
  },
}));

vi.mock("@/services/permissions/MediaPermissionService", () => ({
  default: { allowCreate: () => false },
}));

import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import ApiMediaService from "@/services/api/ApiMediaService";

beforeEach(() => {
  vi.clearAllMocks();
  ApiMediaService.getMediaList.mockResolvedValue({ data: { data: [] } });
});

/** Mounts the field empty, so nothing is resolved against the media API. */
function fieldWith(propsData = {}) {
  return mountComponent(MediaReferenceField, {
    propsData: { value: null, label: "Bild", ...propsData },
  });
}

function picker(wrapper) {
  return wrapper.findComponent({ name: "MediaPickerDialog" });
}

/** Opens the picker the way the user does, through „Auswählen“. */
async function openPicker(wrapper) {
  await wrapper
    .findAll("button")
    .wrappers.find((button) => button.text().includes("Auswählen"))
    .trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

function tabLabels(wrapper) {
  return wrapper.findAll(".v-tab").wrappers.map((tab) => tab.text().trim());
}

describe("MediaReferenceField and the external address", () => {
  it("offers the picker's „Externer Link“ tab by default", async () => {
    const wrapper = fieldWith();

    expect(picker(wrapper).props("allowExternal")).toBe(true);

    await openPicker(wrapper);

    expect(tabLabels(wrapper)).toContain("Externer Link");
  });

  /**
   * A site whose reference the backend only accepts as a medium of the library
   * — the Hero's image Blocks — turns the tab off rather than let an author
   * store a value the save would reject.
   */
  it("hides the tab where only a medium of the library is allowed", async () => {
    const wrapper = fieldWith({ allowExternal: false });

    expect(picker(wrapper).props("allowExternal")).toBe(false);

    await openPicker(wrapper);

    expect(tabLabels(wrapper)).not.toContain("Externer Link");
    expect(tabLabels(wrapper)).toContain("Mediathek");
  });
});
