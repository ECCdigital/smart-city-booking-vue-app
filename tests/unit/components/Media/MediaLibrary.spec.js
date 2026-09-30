import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import MediaLibrary from "@/components/Media/MediaLibrary.vue";
import ApiMediaService from "@/services/api/ApiMediaService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { activeDialog, dialogButton } from "@tests/unit/support/dialog";
import { filterCard, openFilterCard } from "@tests/unit/support/search";
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
    getMediaUsage: vi.fn(),
    deleteMedia: vi.fn(),
  },
}));

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookable: vi.fn() },
}));

// `FormatService` reads the lodash global that `main.js` installs.
vi.mock("@/services/FormatService", () => ({
  default: { bytes: (value) => `${value} B`, date: (value) => String(value) },
}));

vi.mock("@/services/permissions/MediaPermissionService", () => ({
  default: {
    allowCreate: vi.fn(() => true),
    allowUpdate: vi.fn(() => true),
    allowDelete: vi.fn(() => true),
    isInstanceOwner: vi.fn(() => false),
  },
}));

function store() {
  return new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t1" },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
}

function medium(id, overrides = {}) {
  return {
    id,
    title: "",
    originalFileName: `${id}.jpg`,
    kind: "image",
    mimeType: "image/jpeg",
    size: 1000,
    createdAt: "2026-01-02T10:00:00.000Z",
    visibility: "public",
    tags: [],
    variants: [],
    ...overrides,
  };
}

const ITEMS = [
  medium("hafen", { title: "Hafen bei Nacht" }),
  medium("saal", { visibility: "intern", tags: ["Räume"] }),
];

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

async function mountLibrary() {
  const wrapper = mountComponent(MediaLibrary, {
    store: store(),
    propsData: { scope: "tenant" },
    stubs: { MediaImage: true },
  });
  await settle(wrapper);
  return wrapper;
}

function tiles(wrapper) {
  return wrapper.findAll("[data-test='media-tile']").wrappers;
}

function lastListQuery() {
  const calls = ApiMediaService.getMediaList.mock.calls;
  return calls[calls.length - 1][1];
}

function buttonIn(element, label) {
  return Array.from(element.querySelectorAll("button")).find(
    (el) => el.textContent.trim() === label
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiMediaService.getMediaList.mockResolvedValue({
    data: { items: ITEMS, total: ITEMS.length },
  });
  ApiMediaService.getMediaUsage.mockResolvedValue({ data: [] });
});

describe("MediaLibrary on a phone", () => {
  beforeEach(() => setViewportWidth(PHONE_WIDTH));
  afterEach(() => resetViewportWidth());

  it("shows the media as a grid with name and size instead of the dropzone", async () => {
    const wrapper = await mountLibrary();

    expect(tiles(wrapper)).toHaveLength(2);
    expect(tiles(wrapper)[0].text()).toContain("Hafen bei Nacht");
    expect(tiles(wrapper)[0].text()).toContain("1000 B");
    expect(tiles(wrapper)[1].text()).toContain("saal.jpg");
    expect(wrapper.find(".media-library__dropzone").exists()).toBe(false);
  });

  it("opens a medium large and edits it on the full screen", async () => {
    const wrapper = await mountLibrary();

    await tiles(wrapper)[0].trigger("click");
    await settle(wrapper);
    expect(activeDialog().textContent).toContain("Hafen bei Nacht");
    expect(activeDialog().textContent).not.toContain("Metadaten");

    buttonIn(activeDialog(), "Bearbeiten").click();
    await settle(wrapper);

    expect(activeDialog().classList).toContain("v-dialog--fullscreen");
    expect(activeDialog().textContent).toContain("Metadaten");
  });

  it("filters by type, visibility and tag behind the funnel", async () => {
    const wrapper = await mountLibrary();

    await openFilterCard(wrapper);
    buttonIn(filterCard(), "Bilder").click();
    await settle(wrapper);
    expect(lastListQuery()).toMatchObject({ kind: "image", page: 1 });

    buttonIn(filterCard(), "intern").click();
    await settle(wrapper);
    expect(lastListQuery()).toMatchObject({ visibility: "intern" });

    buttonIn(filterCard(), "Räume").click();
    await settle(wrapper);
    expect(lastListQuery()).toMatchObject({ tag: "Räume" });

    buttonIn(filterCard(), "Alle").click();
    await settle(wrapper);
    expect(lastListQuery().kind).toBeUndefined();
  });

  it("uploads what the sheet picks, with the visibility chosen there", async () => {
    ApiMediaService.uploadMedia.mockResolvedValue({ data: medium("neu") });
    const wrapper = await mountLibrary();
    const file = new File(["x"], "foto.jpg");

    await wrapper.find("[data-test='media-upload']").trigger("click");
    await settle(wrapper);
    buttonIn(document.querySelector(".media-upload-sheet"), "intern").click();
    await settle(wrapper);
    const gallery = wrapper.find("input[accept='image/*'][multiple]");
    Object.defineProperty(gallery.element, "files", { value: [file] });
    await gallery.trigger("change");
    await settle(wrapper);

    expect(ApiMediaService.uploadMedia).toHaveBeenCalledWith(
      "tenant",
      { file, visibility: "intern" },
      expect.any(Function)
    );
  });

  it("closes the large view once its medium is deleted", async () => {
    ApiMediaService.deleteMedia.mockResolvedValue({});
    const wrapper = await mountLibrary();

    await tiles(wrapper)[0].trigger("click");
    await settle(wrapper);
    buttonIn(activeDialog(), "Löschen").click();
    await settle(wrapper);
    dialogButton("Endgültig löschen").click();
    await settle(wrapper);

    expect(ApiMediaService.deleteMedia).toHaveBeenCalledWith("tenant", "hafen");
    expect(activeDialog()).toBeNull();
  });
});

describe("MediaLibrary on a wide screen", () => {
  it("keeps the dropzone, the list and the panel beside it", async () => {
    const wrapper = await mountLibrary();

    expect(wrapper.find(".media-library__dropzone").exists()).toBe(true);
    expect(wrapper.find(".media-library__detail").exists()).toBe(true);
    expect(tiles(wrapper)).toHaveLength(0);
  });
});
