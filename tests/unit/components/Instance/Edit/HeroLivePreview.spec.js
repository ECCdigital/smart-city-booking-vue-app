import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import { mountComponent } from "@tests/unit/support/mount";
import { button } from "@tests/unit/support/vuetify";
import { HERO_BACKGROUND, heroLayout } from "@tests/unit/support/heroLayout";
import {
  HERO_PREVIEW_BLOCK_CLICK,
  HERO_PREVIEW_DRAFT,
  HERO_PREVIEW_PROTOCOL,
  HERO_PREVIEW_READY,
  HERO_PREVIEW_REPORT,
  HERO_PREVIEW_ZONE_CLICK,
} from "@/utils/heroPreviewProtocol";
import HeroLivePreview from "@/components/Instance/Edit/HeroLivePreview.vue";

const PORTAL_URL = "https://portal.example.org";
const ORIGIN = "https://portal.example.org";
const READY_TIMEOUT = 10000;

/** A resolved Draft, in the shape the preview route answers with. */
function preview(overrides = {}) {
  return {
    draftId: 1,
    heroLayout: heroLayout(),
    background: HERO_BACKGROUND,
    name: "Marktplatz",
    ...overrides,
  };
}

function mountPreview(propsData = {}) {
  return mountComponent(HeroLivePreview, {
    propsData: { portalUrl: PORTAL_URL, preview: preview(), ...propsData },
  });
}

function iframes(wrapper) {
  return wrapper.findAll("iframe").wrappers;
}

function sources(wrapper) {
  return iframes(wrapper).map((frame) => frame.attributes("src"));
}

/**
 * jsdom never loads a cross-origin frame, so the windows the component posts
 * to are stood in for. Every frame answers with its own spy, which is also
 * what a `ready` message names as its source.
 */
function stubFrameWindows(wrapper) {
  return iframes(wrapper).map((frame) => {
    const contentWindow = { postMessage: vi.fn() };
    Object.defineProperty(frame.element, "contentWindow", {
      configurable: true,
      value: contentWindow,
    });
    return contentWindow;
  });
}

/** A message the way a frame sends it: with an origin and a source window. */
async function fromFrame(data, { origin = ORIGIN, source = null } = {}) {
  const event = new MessageEvent("message", { data, origin });
  if (source) {
    Object.defineProperty(event, "source", { value: source });
  }
  window.dispatchEvent(event);
  await Vue.nextTick();
}

function readyMessage() {
  return { protocol: HERO_PREVIEW_PROTOCOL, type: HERO_PREVIEW_READY };
}

/** The reload button of the toolbar carries an icon, not a label. */
function reloadButton(wrapper) {
  return wrapper.find("button[title='Vorschau neu laden']");
}

/**
 * jsdom lays nothing out, so the spec says how wide the panel is and lets the
 * component measure it, the way the window's resize event does.
 */
function setPanelWidth(wrapper, width) {
  Object.defineProperty(wrapper.element, "clientWidth", {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
  return Vue.nextTick();
}

function noticeText(wrapper) {
  const notice = wrapper.find(".hero-live-preview__notice");
  return notice.exists() ? notice.text() : "";
}

/** The warning that stands over the frames when none has announced itself. */
function unreachableText(wrapper) {
  const alert = wrapper.find(".hero-live-preview__unreachable");
  return alert.exists() ? alert.text() : "";
}

describe("HeroLivePreview frames", () => {
  it("loads the German start-page preview route in both frames", () => {
    const wrapper = mountPreview();

    expect(sources(wrapper)).toEqual([
      `${ORIGIN}/preview/hero?mode=home`,
      `${ORIGIN}/preview/hero?mode=home`,
    ]);
  });

  it("renders the desktop frame at 1280 px and the mobile frame at 375 px", () => {
    const wrapper = mountPreview();
    const [desktop, mobile] = iframes(wrapper);

    expect(desktop.element.style.width).toBe("1280px");
    expect(mobile.element.style.width).toBe("375px");
  });

  it("scales the desktop frame down to the panel and leaves the mobile one alone", async () => {
    const wrapper = mountPreview();
    // The panel has no width in jsdom, so the spec sets one and measures.
    await setPanelWidth(wrapper, 1400);
    const [desktop, mobile] = iframes(wrapper);

    // 1400 minus the mobile frame's 375 and the gap leaves 1009 of 1280.
    expect(desktop.element.style.transform).toBe(`scale(${1009 / 1280})`);
    expect(mobile.element.style.transform).toBe("scale(1)");
  });

  it("scales the desktop frame to the whole panel once they stack", async () => {
    const wrapper = mountPreview();
    await setPanelWidth(wrapper, 900);

    expect(iframes(wrapper)[0].element.style.transform).toBe(
      `scale(${900 / 1280})`
    );
  });

  it("never scales the desktop frame up beyond its 1280 px", async () => {
    const wrapper = mountPreview();
    await setPanelWidth(wrapper, 3000);

    expect(iframes(wrapper)[0].element.style.transform).toBe("scale(1)");
  });

  it("stacks the two frames once the panel is narrower than 1100 px", async () => {
    const wrapper = mountPreview();
    await setPanelWidth(wrapper, 1099);

    expect(wrapper.find(".hero-live-preview__frames--stacked").exists()).toBe(
      true
    );
  });

  it("stands the frames beside each other on a wide panel", async () => {
    const wrapper = mountPreview();
    await setPanelWidth(wrapper, 1100);

    expect(wrapper.find(".hero-live-preview__frames--stacked").exists()).toBe(
      false
    );
  });

  it("offers a warning summary slot per frame", () => {
    const wrapper = mountComponent(HeroLivePreview, {
      propsData: { portalUrl: PORTAL_URL, preview: preview() },
      scopedSlots: {
        warnings: "<span class='summary'>{{ props.viewport }}</span>",
      },
    });

    expect(wrapper.findAll(".summary").wrappers.map((s) => s.text())).toEqual([
      "desktop",
      "mobile",
    ]);
  });
});

describe("HeroLivePreview toolbar", () => {
  it("switches both frames to the sub-page view", async () => {
    const wrapper = mountPreview();

    await button(wrapper, "Unterseite").trigger("click");
    await Vue.nextTick();

    expect(sources(wrapper)).toEqual([
      `${ORIGIN}/preview/hero?mode=compact`,
      `${ORIGIN}/preview/hero?mode=compact`,
    ]);
  });

  it("takes the English route from the header toggle", async () => {
    const wrapper = mountPreview();

    await wrapper.setProps({ locale: "en" });

    expect(sources(wrapper)).toEqual([
      `${ORIGIN}/en/preview/hero?mode=home`,
      `${ORIGIN}/en/preview/hero?mode=home`,
    ]);
  });

  it("sends the colour mode in the Draft instead of reloading", async () => {
    const wrapper = mountPreview();
    const frames = stubFrameWindows(wrapper);

    await button(wrapper, "Dunkel").trigger("click");
    await Vue.nextTick();

    expect(sources(wrapper)).toEqual([
      `${ORIGIN}/preview/hero?mode=home`,
      `${ORIGIN}/preview/hero?mode=home`,
    ]);
    frames.forEach((frame) => {
      expect(frame.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ colorMode: "dark" }),
        ORIGIN
      );
    });
  });

  it("loads both frames again on the reload button", async () => {
    const wrapper = mountPreview();
    const before = iframes(wrapper).map((frame) => frame.element);

    await reloadButton(wrapper).trigger("click");

    // The elements are replaced rather than navigated, so the storefront
    // loads afresh and the admin's own history stays clean.
    iframes(wrapper).forEach((frame, index) => {
      expect(frame.element).not.toBe(before[index]);
    });
  });
});

describe("HeroLivePreview without a Portal-URL", () => {
  it("says so instead of showing frames", () => {
    const wrapper = mountPreview({ portalUrl: "" });

    expect(noticeText(wrapper)).toBe("Portal-URL fehlt");
    expect(iframes(wrapper)).toHaveLength(0);
  });

  it("says so for an address that has no origin", () => {
    const wrapper = mountPreview({ portalUrl: "portal.example.org" });

    expect(noticeText(wrapper)).toBe("Portal-URL fehlt");
  });
});

describe("HeroLivePreview readiness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives up after ten seconds without a ready message", async () => {
    const wrapper = mountPreview();

    await vi.advanceTimersByTimeAsync(READY_TIMEOUT);
    await Vue.nextTick();

    expect(unreachableText(wrapper)).toContain(
      "Vorschau nicht erreichbar, Portal-URL und NUXT_ADMIN_BASE_URL prüfen"
    );
  });

  it("leaves the frames standing, so a slow one can still arrive", async () => {
    const wrapper = mountPreview();
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT);
    await Vue.nextTick();

    expect(iframes(wrapper)).toHaveLength(2);

    await fromFrame(readyMessage());

    expect(unreachableText(wrapper)).toBe("");
  });

  it("offers a reload that clears the warning", async () => {
    const wrapper = mountPreview();
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT);
    await Vue.nextTick();

    await button(wrapper, "Erneut versuchen").trigger("click");
    await Vue.nextTick();

    expect(iframes(wrapper)).toHaveLength(2);
    expect(unreachableText(wrapper)).toBe("");
  });

  it("stays quiet once a frame has announced itself", async () => {
    const wrapper = mountPreview();

    await fromFrame(readyMessage());
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT);
    await Vue.nextTick();

    expect(unreachableText(wrapper)).toBe("");
    expect(iframes(wrapper)).toHaveLength(2);
  });

  it("waits again after a reload", async () => {
    const wrapper = mountPreview();
    await fromFrame(readyMessage());

    await reloadButton(wrapper).trigger("click");
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT);
    await Vue.nextTick();

    expect(unreachableText(wrapper)).toContain("Vorschau nicht erreichbar");
  });

  it("waits again after the view has changed", async () => {
    const wrapper = mountPreview();
    await fromFrame(readyMessage());

    await button(wrapper, "Unterseite").trigger("click");
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT);
    await Vue.nextTick();

    expect(unreachableText(wrapper)).toContain("Vorschau nicht erreichbar");
  });

  it("never waits without a Portal-URL", async () => {
    const wrapper = mountPreview({ portalUrl: "" });

    await vi.advanceTimersByTimeAsync(READY_TIMEOUT);
    await Vue.nextTick();

    expect(noticeText(wrapper)).toBe("Portal-URL fehlt");
    expect(unreachableText(wrapper)).toBe("");
  });
});

describe("HeroLivePreview messages in", () => {
  it("answers a ready with the Draft it holds", async () => {
    const wrapper = mountPreview({ selectedBlockId: "block-1" });
    const [desktop] = stubFrameWindows(wrapper);

    await fromFrame(readyMessage(), { source: desktop });

    expect(desktop.postMessage).toHaveBeenCalledWith(
      {
        protocol: HERO_PREVIEW_PROTOCOL,
        type: HERO_PREVIEW_DRAFT,
        draftId: 1,
        heroLayout: heroLayout(),
        background: HERO_BACKGROUND,
        name: "Marktplatz",
        selectedBlockId: "block-1",
        colorMode: "light",
      },
      ORIGIN
    );
  });

  it("answers only the frame that asked", async () => {
    const wrapper = mountPreview();
    const [desktop, mobile] = stubFrameWindows(wrapper);

    await fromFrame(readyMessage(), { source: desktop });

    expect(desktop.postMessage).toHaveBeenCalledTimes(1);
    expect(mobile.postMessage).not.toHaveBeenCalled();
  });

  it("has nothing to answer with before the first Draft is resolved", async () => {
    const wrapper = mountPreview({ preview: null });
    const [desktop] = stubFrameWindows(wrapper);

    await fromFrame(readyMessage(), { source: desktop });

    expect(desktop.postMessage).not.toHaveBeenCalled();
  });

  it("passes the Preview Report and the two clicks on", async () => {
    const wrapper = mountPreview();
    const report = {
      protocol: HERO_PREVIEW_PROTOCOL,
      type: HERO_PREVIEW_REPORT,
      draftId: 1,
      viewport: "desktop",
      warnings: [],
    };

    await fromFrame(report);
    await fromFrame({
      protocol: HERO_PREVIEW_PROTOCOL,
      type: HERO_PREVIEW_ZONE_CLICK,
      zone: "top-left",
    });
    await fromFrame({
      protocol: HERO_PREVIEW_PROTOCOL,
      type: HERO_PREVIEW_BLOCK_CLICK,
      blockId: "block-2",
    });

    expect(wrapper.emitted("report")).toEqual([[report]]);
    expect(wrapper.emitted("zone-click")).toEqual([["top-left"]]);
    expect(wrapper.emitted("block-click")).toEqual([["block-2"]]);
  });

  it("ignores a message from another origin", async () => {
    const wrapper = mountPreview();
    const [desktop] = stubFrameWindows(wrapper);

    await fromFrame(readyMessage(), {
      origin: "https://evil.example.org",
      source: desktop,
    });
    await fromFrame(
      {
        protocol: HERO_PREVIEW_PROTOCOL,
        type: HERO_PREVIEW_ZONE_CLICK,
        zone: "top-left",
      },
      { origin: "https://evil.example.org" }
    );

    expect(desktop.postMessage).not.toHaveBeenCalled();
    expect(wrapper.emitted("zone-click")).toBeUndefined();
  });

  it("ignores another protocol version and an unlisted type", async () => {
    const wrapper = mountPreview();
    const [desktop] = stubFrameWindows(wrapper);

    await fromFrame(
      { protocol: 2, type: HERO_PREVIEW_READY },
      {
        source: desktop,
      }
    );
    await fromFrame(
      { protocol: HERO_PREVIEW_PROTOCOL, type: "hero-preview:whatever" },
      { source: desktop }
    );

    expect(desktop.postMessage).not.toHaveBeenCalled();
    expect(wrapper.emitted("zone-click")).toBeUndefined();
  });
});

describe("HeroLivePreview messages out", () => {
  it("posts a resolved Draft to both frames, at the Portal-URL's origin", async () => {
    const wrapper = mountPreview({ preview: null });
    const frames = stubFrameWindows(wrapper);

    await wrapper.setProps({ preview: preview({ draftId: 4 }) });

    frames.forEach((frame) => {
      expect(frame.postMessage).toHaveBeenCalledTimes(1);
      expect(frame.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ draftId: 4, type: HERO_PREVIEW_DRAFT }),
        ORIGIN
      );
      // Never a wildcard: only the portal may read the Draft.
      expect(frame.postMessage.mock.calls[0][1]).not.toBe("*");
    });
  });

  it("posts again when another Block is selected", async () => {
    const wrapper = mountPreview();
    const [desktop] = stubFrameWindows(wrapper);

    await wrapper.setProps({ selectedBlockId: "block-2" });

    expect(desktop.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ selectedBlockId: "block-2" }),
      ORIGIN
    );
  });

  it("posts nothing while no Draft has been resolved", async () => {
    const wrapper = mountPreview({ preview: null });
    const frames = stubFrameWindows(wrapper);

    await wrapper.setProps({ selectedBlockId: "block-2" });

    frames.forEach((frame) => {
      expect(frame.postMessage).not.toHaveBeenCalled();
    });
  });
});
