import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import MediaDetailPanel from "@/components/Media/MediaDetailPanel.vue";
import ApiMediaService, { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaPermissionService from "@/services/permissions/MediaPermissionService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";
import {
  activeDialog,
  activeDialogText,
  dialogButton,
} from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiMediaService", () => ({
  MEDIA_SCOPE: { TENANT: "tenant", INSTANCE: "instance" },
  default: {
    getMediaUsage: vi.fn(),
    updateMedia: vi.fn(),
    deleteMedia: vi.fn(),
    getAbsoluteMediaUrl: vi.fn(() => "https://example.org/media/m1"),
  },
}));

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookable: vi.fn() },
}));

// `FormatService` reads the lodash global that `main.js` installs; the panel's
// facts block is not what these specs are about.
vi.mock("@/services/FormatService", () => ({
  default: { bytes: (value) => `${value} B`, date: (value) => String(value) },
}));

vi.mock("@/services/permissions/MediaPermissionService", () => ({
  default: {
    allowUpdate: vi.fn(() => true),
    allowDelete: vi.fn(() => true),
    isInstanceOwner: vi.fn(() => true),
  },
}));

const addToast = vi.fn();

/**
 * `router-link` without a router. The destination rides along as an attribute
 * so that a spec can read it off the DOM - including out of a `v-dialog`,
 * which detaches from the wrapper's element.
 */
const RouterLink = {
  name: "RouterLink",
  props: { to: { type: [String, Object], required: true } },
  render(h) {
    return h(
      "a",
      { attrs: { "data-to": JSON.stringify(this.to) } },
      this.$slots.default
    );
  },
};

function store() {
  return new Vuex.Store({
    modules: { toasts: { namespaced: true, actions: { add: addToast } } },
  });
}

function medium(overrides = {}) {
  return {
    id: "m1",
    title: "Titelbild",
    originalFileName: "titel.jpg",
    mimeType: "image/jpeg",
    size: 2048,
    createdAt: "2026-01-02T10:00:00.000Z",
    visibility: "public",
    tags: [],
    variants: [],
    ...overrides,
  };
}

function heroUsage() {
  return { type: "hero", id: "c1", title: "Marktplatz" };
}

/** A 409 whose body is the usage proof - what blocks a delete and a save. */
function usageConflict(entries) {
  const error = new Error("Request failed with status code 409");
  error.response = { status: 409, data: entries };
  return error;
}

async function mountPanel({ scope = MEDIA_SCOPE.TENANT, usage = [] } = {}) {
  ApiMediaService.getMediaUsage.mockResolvedValue({ data: usage });
  const wrapper = mountComponent(MediaDetailPanel, {
    store: store(),
    propsData: { media: medium(), scope },
    stubs: { MediaImage: true, RouterLink },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

function usageRows(wrapper) {
  return wrapper.findAll(".media-usage__entry").wrappers;
}

function routeOf(element) {
  const link = element.querySelector("a[data-to]");
  return link ? JSON.parse(link.getAttribute("data-to")) : null;
}

function buttonByLabel(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((button) => button.text().trim() === label);
}

function fieldByLabel(wrapper, label) {
  return wrapper
    .findAll(".v-text-field, .v-select")
    .wrappers.find((field) => field.find("label").text() === label);
}

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

const PORTAL_TAB = { name: "instances", query: { tab: "portal" } };

describe("MediaDetailPanel usage type hero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MediaPermissionService.allowUpdate.mockReturnValue(true);
    MediaPermissionService.allowDelete.mockReturnValue(true);
    MediaPermissionService.isInstanceOwner.mockReturnValue(true);
  });

  it("names the Kopfbereich with its own icon", async () => {
    const wrapper = await mountPanel({ usage: [heroUsage()] });

    const [row] = usageRows(wrapper);
    expect(row.text()).toContain("Kopfbereich");
    expect(row.find(".mdi-page-layout-header").exists()).toBe(true);
  });

  it("links to the Portal tab in the instance scope", async () => {
    const wrapper = await mountPanel({
      scope: MEDIA_SCOPE.INSTANCE,
      usage: [heroUsage()],
    });

    expect(routeOf(usageRows(wrapper)[0].element)).toEqual(PORTAL_TAB);
  });

  it("links to the Portal tab in the tenant scope for an instance admin", async () => {
    const wrapper = await mountPanel({ usage: [heroUsage()] });

    expect(routeOf(usageRows(wrapper)[0].element)).toEqual(PORTAL_TAB);
  });

  it("names the Kopfbereich without a link for everyone else", async () => {
    MediaPermissionService.isInstanceOwner.mockReturnValue(false);

    const wrapper = await mountPanel({ usage: [heroUsage()] });

    const [row] = usageRows(wrapper);
    expect(row.text()).toContain("Kopfbereich");
    expect(routeOf(row.element)).toBeNull();
  });
});

describe("MediaDetailPanel deletion blocked by a Kopfbereich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MediaPermissionService.allowUpdate.mockReturnValue(true);
    MediaPermissionService.allowDelete.mockReturnValue(true);
    MediaPermissionService.isInstanceOwner.mockReturnValue(true);
  });

  it("lists the blocking Kopfbereich with its link", async () => {
    const wrapper = await mountPanel();
    ApiMediaService.deleteMedia.mockRejectedValueOnce(
      usageConflict([heroUsage()])
    );

    await buttonByLabel(wrapper, "Löschen").trigger("click");
    await settle(wrapper);
    dialogButton("Endgültig löschen").click();
    await settle(wrapper);

    expect(activeDialogText()).toContain("Löschen nicht möglich");
    expect(activeDialogText()).toContain("Kopfbereich");
    expect(routeOf(activeDialog())).toEqual(PORTAL_TAB);
    expect(wrapper.emitted("deleted")).toBeUndefined();
  });
});

describe("MediaDetailPanel visibility downgrade refused", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MediaPermissionService.allowUpdate.mockReturnValue(true);
    MediaPermissionService.allowDelete.mockReturnValue(true);
    MediaPermissionService.isInstanceOwner.mockReturnValue(true);
  });

  async function switchToIntern(wrapper) {
    await fieldByLabel(wrapper, "Sichtbarkeit")
      .find(".v-input__slot")
      .trigger("click");
    await settle(wrapper);
    const option = Array.from(
      document.querySelectorAll(".v-menu__content .v-list-item")
    ).find((el) => el.textContent.includes("intern"));
    option.click();
    await settle(wrapper);
  }

  function selectedVisibility(wrapper) {
    return fieldByLabel(wrapper, "Sichtbarkeit")
      .find(".v-select__selection")
      .text();
  }

  it("names the blocking usages and leaves the form open", async () => {
    const wrapper = await mountPanel();
    ApiMediaService.updateMedia.mockRejectedValueOnce(
      usageConflict([heroUsage()])
    );

    await switchToIntern(wrapper);
    await buttonByLabel(wrapper, "Speichern").trigger("click");
    await settle(wrapper);

    expect(activeDialogText()).toContain("Sichtbarkeit nicht änderbar");
    expect(activeDialogText()).toContain("nicht auf intern gestellt werden");
    expect(activeDialogText()).toContain("Kopfbereich");
    expect(routeOf(activeDialog())).toEqual(PORTAL_TAB);
    // The form keeps the refused value, so the switch back is one click.
    expect(selectedVisibility(wrapper)).toContain("intern");
    expect(wrapper.emitted("updated")).toBeUndefined();
    expect(addToast).not.toHaveBeenCalled();
  });

  // A save the proof stops without a downgrade must not claim the downgrade was
  // refused - only the title changed here.
  it("stays neutral when the refused save left the visibility alone", async () => {
    const wrapper = await mountPanel();
    ApiMediaService.updateMedia.mockRejectedValueOnce(
      usageConflict([heroUsage()])
    );

    await fieldByLabel(wrapper, "Titel").find("input").setValue("Neuer Titel");
    await buttonByLabel(wrapper, "Speichern").trigger("click");
    await settle(wrapper);

    expect(activeDialogText()).toContain("Änderung nicht möglich");
    expect(activeDialogText()).not.toContain("intern");
    expect(activeDialogText()).toContain("Kopfbereich");
  });

  it("still shows the generic error when the failure is not a usage conflict", async () => {
    const wrapper = await mountPanel();
    ApiMediaService.updateMedia.mockRejectedValueOnce(serverError());

    await switchToIntern(wrapper);
    await buttonByLabel(wrapper, "Speichern").trigger("click");
    await settle(wrapper);

    expect(addToast).toHaveBeenCalled();
    expect(addToast.mock.calls[0][1].type).toBe("error");
  });
});
