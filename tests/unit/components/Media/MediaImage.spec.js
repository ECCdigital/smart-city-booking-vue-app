import { describe, expect, it, vi } from "vitest";
import MediaImage from "@/components/Media/MediaImage.vue";
import ApiMediaService from "@/services/api/ApiMediaService";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiMediaService", () => ({
  default: { getMediaFileUrl: vi.fn(), getMediaFileBlob: vi.fn() },
}));

describe("MediaImage", () => {
  it("shows a font as the font icon and loads no file", () => {
    const wrapper = mountComponent(MediaImage, {
      propsData: {
        media: { id: "f1", kind: "font", visibility: "public" },
        scope: "instance",
      },
    });

    expect(wrapper.find(".v-icon").classes()).toContain("mdi-format-font");
    expect(ApiMediaService.getMediaFileUrl).not.toHaveBeenCalled();
    expect(ApiMediaService.getMediaFileBlob).not.toHaveBeenCalled();
  });
});
