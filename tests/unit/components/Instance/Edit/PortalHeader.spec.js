import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import PortalHeader from "@/components/Instance/Edit/PortalHeader.vue";
import { defaultBranding } from "@/utils/instanceBranding";

/**
 * The section „Kopfleiste“ of the Portal tab (map #510): the colour of the
 * header bar as three cards, App-Logo and its variant for dark mode as a pair
 * of tiles, and the Favicon. The section reads the branding and reports what
 * it changes as `patch`; the tab merges it back, as `mountHeader` does here.
 */

const LOGO = { source: "media", mediaId: "logo-1", url: null };
const LOGO_DARK = { source: "media", mediaId: "logo-dark-1", url: null };

function branding(overrides = {}) {
  const base = defaultBranding();
  return {
    ...base,
    ...overrides,
    theme: {
      colors: { ...base.theme.colors, ...(overrides.colors || {}) },
    },
  };
}

function mountHeader(props = {}) {
  // The media fields open a picker backed by the media API, and the images
  // resolve through it; what is under test is the section around them.
  const wrapper = mountComponent(PortalHeader, {
    propsData: { branding: branding(), ...props },
    stubs: { MediaReferenceField: true, MediaReferenceImage: true },
  });
  wrapper.vm.$on("patch", (changes) =>
    wrapper.setProps({ branding: { ...wrapper.props("branding"), ...changes } })
  );
  return wrapper;
}

function lastPatch(wrapper) {
  return wrapper.emitted("patch").at(-1)[0];
}

function cards(wrapper) {
  return wrapper.findAll("[role='radio']").wrappers;
}

function card(wrapper, value) {
  return wrapper.find(`[role='radio'][data-header='${value}']`);
}

function bar(wrapper, value, mode) {
  return card(wrapper, value).find(`.portal-header-bar[data-mode='${mode}']`);
}

function mediaField(wrapper, label) {
  return wrapper
    .findAllComponents({ name: "MediaReferenceField" })
    .wrappers.find((field) => field.props("label") === label);
}

function logoTile(wrapper, mode) {
  return wrapper.find(`.portal-app-logo-tile[data-mode='${mode}']`);
}

const VARIANT_LABEL = "Variante für den Dunkelmodus (optional)";

describe("PortalHeader cards of the header bar", () => {
  it("offers Neutral, Primär as today and Sekundär, with Primär as default", () => {
    const wrapper = mountHeader();

    expect(cards(wrapper).map((entry) => entry.text())).toEqual([
      expect.stringContaining("Neutral"),
      expect.stringContaining("Primär"),
      expect.stringContaining("Sekundär"),
    ]);
    expect(card(wrapper, "primary").text()).toContain("wie heute");
    expect(
      cards(wrapper).map((entry) => entry.attributes("aria-checked"))
    ).toEqual(["false", "true", "false"]);
  });

  it("reads a missing or unknown header as Primär", () => {
    for (const header of [undefined, "", "tertiary"]) {
      const wrapper = mountHeader({ branding: branding({ header }) });

      expect(card(wrapper, "primary").attributes("aria-checked")).toBe("true");
    }
  });

  it("sends the chosen card as header and marks it", async () => {
    const wrapper = mountHeader();

    await card(wrapper, "neutral").trigger("click");

    expect(lastPatch(wrapper)).toEqual({ header: "neutral" });
    expect(card(wrapper, "neutral").attributes("aria-checked")).toBe("true");
    expect(card(wrapper, "primary").attributes("aria-checked")).toBe("false");
  });

  it("chooses a card from the keyboard", async () => {
    const wrapper = mountHeader();

    await card(wrapper, "secondary").trigger("keydown", { key: "Enter" });

    expect(lastPatch(wrapper)).toEqual({ header: "secondary" });
  });
});

function activeTab(wrapper, value, mode) {
  return bar(wrapper, value, mode).find("[data-part='tab-active']");
}

function stripe(wrapper, value, mode) {
  return bar(wrapper, value, mode).find("[data-part='tab-stripe']");
}

const BLUE = { hex: "#1976d2", rgb: "rgb(25, 118, 210)" };
const TEAL = { hex: "#26a69a", rgb: "rgb(38, 166, 154)" };
const YELLOW = { hex: "#ffd54f", rgb: "rgb(255, 213, 79)" };
const WHITE = "rgb(255, 255, 255)";
const BLACK = "rgb(0, 0, 0)";
// The storefront's near-black (gray-900), also the ground of its dark footer.
const NEAR_BLACK = "rgb(16, 24, 40)";

describe("PortalHeader bars in light and dark", () => {
  it("draws every card as a bar in light and in dark", () => {
    const wrapper = mountHeader();

    for (const value of ["neutral", "primary", "secondary"]) {
      expect(bar(wrapper, value, "light").exists()).toBe(true);
      expect(bar(wrapper, value, "dark").exists()).toBe(true);
    }
  });

  it("keeps Neutral fixed: white with near-black text, dark the footer's ground with white text", () => {
    const wrapper = mountHeader({
      branding: branding({
        colors: { primary: YELLOW.hex, secondary: TEAL.hex },
      }),
    });

    const light = bar(wrapper, "neutral", "light").attributes("style");
    const dark = bar(wrapper, "neutral", "dark").attributes("style");
    expect(light).toContain(`background: ${WHITE}`);
    expect(light).toContain(`color: ${NEAR_BLACK}`);
    expect(dark).toContain(`background: ${NEAR_BLACK}`);
    expect(dark).toContain(`color: ${WHITE}`);
  });

  it.each([["light"], ["dark"]])(
    "puts Primär and Sekundär on their colour with its contrast, %s",
    (mode) => {
      const wrapper = mountHeader({
        branding: branding({
          colors: { primary: YELLOW.hex, secondary: BLUE.hex },
        }),
      });

      const primary = bar(wrapper, "primary", mode).attributes("style");
      const secondary = bar(wrapper, "secondary", mode).attributes("style");
      expect(primary).toContain(`background: ${YELLOW.rgb}`);
      expect(primary).toContain(`color: ${BLACK}`);
      expect(secondary).toContain(`background: ${BLUE.rgb}`);
      expect(secondary).toContain(`color: ${WHITE}`);
    }
  );

  it("sets the active tab in Sekundär with a Primär stripe on Neutral and Primär", () => {
    const wrapper = mountHeader({
      branding: branding({
        colors: { primary: BLUE.hex, secondary: YELLOW.hex },
      }),
    });

    for (const value of ["neutral", "primary"]) {
      const tab = activeTab(wrapper, value, "light").attributes("style");
      expect(tab).toContain(`background: ${YELLOW.rgb}`);
      expect(tab).toContain(`color: ${BLACK}`);
      expect(stripe(wrapper, value, "light").attributes("style")).toContain(
        `background: ${BLUE.rgb}`
      );
    }
  });

  it("sets the active tab in Primär with a Sekundär stripe on Sekundär", () => {
    const wrapper = mountHeader({
      branding: branding({
        colors: { primary: BLUE.hex, secondary: YELLOW.hex },
      }),
    });

    const tab = activeTab(wrapper, "secondary", "dark").attributes("style");
    expect(tab).toContain(`background: ${BLUE.rgb}`);
    expect(tab).toContain(`color: ${WHITE}`);
    expect(stripe(wrapper, "secondary", "dark").attributes("style")).toContain(
      `background: ${YELLOW.rgb}`
    );
  });

  it("shows the storefront's own colours while the instance sets none", () => {
    const wrapper = mountHeader();

    expect(bar(wrapper, "primary", "light").attributes("style")).toContain(
      "background: rgb(255, 139, 0)"
    );
    expect(bar(wrapper, "secondary", "light").attributes("style")).toContain(
      "background: rgb(29, 158, 204)"
    );
  });

  it("follows a colour while it is typed", async () => {
    const wrapper = mountHeader();

    await wrapper.setProps({
      branding: branding({ colors: { primary: TEAL.hex } }),
    });

    expect(bar(wrapper, "primary", "dark").attributes("style")).toContain(
      `background: ${TEAL.rgb}`
    );
  });
});

function shownLogo(scope) {
  return scope.findComponent({ name: "PortalAppLogo" });
}

function logoImage(scope) {
  return shownLogo(scope).findComponent({ name: "MediaReferenceImage" });
}

describe("PortalHeader App-Logo in the bars", () => {
  it("shows the App-Logo in light and inverts it in dark without variant", () => {
    const wrapper = mountHeader({ branding: branding({ logo: LOGO }) });

    const light = logoImage(bar(wrapper, "primary", "light"));
    const dark = logoImage(bar(wrapper, "primary", "dark"));
    expect(light.props("reference")).toEqual(LOGO);
    expect(light.classes()).not.toContain("portal-app-logo--inverted");
    expect(dark.props("reference")).toEqual(LOGO);
    expect(dark.classes()).toContain("portal-app-logo--inverted");
  });

  it("shows the variant in dark, not inverted", () => {
    const wrapper = mountHeader({
      branding: branding({ logo: LOGO, logoDark: LOGO_DARK }),
    });

    const dark = logoImage(bar(wrapper, "neutral", "dark"));
    expect(dark.props("reference")).toEqual(LOGO_DARK);
    expect(dark.classes()).not.toContain("portal-app-logo--inverted");
    expect(
      logoImage(bar(wrapper, "neutral", "light")).props("reference")
    ).toEqual(LOGO);
  });

  it("holds the place of a missing App-Logo", () => {
    const wrapper = mountHeader();

    expect(logoImage(bar(wrapper, "primary", "light")).exists()).toBe(false);
    expect(shownLogo(bar(wrapper, "primary", "light")).text()).toBe("Logo");
  });
});

describe("PortalHeader variant of the App-Logo for dark mode", () => {
  it("offers the variant next to the App-Logo, public media of the library only, with the hint", () => {
    const wrapper = mountHeader();
    const field = mediaField(wrapper, VARIANT_LABEL);

    expect(field.props("publicOnly")).toBe(true);
    expect(field.props("allowExternal")).toBe(false);
    expect(field.props("hint")).toContain(
      "Für Logos, die invertiert falsche Farben bekommen"
    );
    expect(field.props("hint")).toContain(
      "Passt das Logo ohne Änderung auf dunklen Grund, wählen Sie dasselbe Bild."
    );
  });

  it("names the tiles Hell and „Dunkel · invertiert“ without variant", () => {
    const wrapper = mountHeader({ branding: branding({ logo: LOGO }) });

    expect(logoTile(wrapper, "light").text()).toContain("Hell");
    expect(logoTile(wrapper, "dark").text()).toContain("Dunkel · invertiert");
    expect(logoImage(logoTile(wrapper, "dark")).classes()).toContain(
      "portal-app-logo--inverted"
    );
  });

  it("names the dark tile Dunkel and shows the variant once there is one", () => {
    const wrapper = mountHeader({
      branding: branding({ logo: LOGO, logoDark: LOGO_DARK }),
    });

    expect(logoTile(wrapper, "dark").text()).toContain("Dunkel");
    expect(logoTile(wrapper, "dark").text()).not.toContain("invertiert");
    expect(logoImage(logoTile(wrapper, "dark")).props("reference")).toEqual(
      LOGO_DARK
    );
  });

  it("sends a chosen variant and shows it in the bars", async () => {
    const wrapper = mountHeader({ branding: branding({ logo: LOGO }) });

    mediaField(wrapper, VARIANT_LABEL).vm.$emit("input", LOGO_DARK);
    await wrapper.vm.$nextTick();

    expect(lastPatch(wrapper)).toEqual({ logoDark: LOGO_DARK });
    expect(
      logoImage(bar(wrapper, "primary", "dark")).props("reference")
    ).toEqual(LOGO_DARK);
    expect(logoTile(wrapper, "dark").text()).not.toContain("invertiert");
  });

  it("sends a removed variant as null and inverts again", async () => {
    const wrapper = mountHeader({
      branding: branding({ logo: LOGO, logoDark: LOGO_DARK }),
    });

    mediaField(wrapper, VARIANT_LABEL).vm.$emit("input", null);
    await wrapper.vm.$nextTick();

    expect(lastPatch(wrapper)).toEqual({ logoDark: null });
    expect(logoTile(wrapper, "dark").text()).toContain("Dunkel · invertiert");
  });
});

describe("PortalHeader Favicon", () => {
  it("stands in the section next to the App-Logo", () => {
    const labels = mountHeader()
      .findAllComponents({ name: "MediaReferenceField" })
      .wrappers.map((field) => field.props("label"));

    expect(labels).toEqual(["App-Logo", VARIANT_LABEL, "Favicon"]);
  });
});
