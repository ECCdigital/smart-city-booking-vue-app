import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { defaultBranding } from "@/utils/instanceBranding";

import PortalAuthPages from "@/components/Instance/Edit/PortalAuthPages.vue";
import MediaReferenceImage from "@/components/Media/MediaReferenceImage.vue";

// The logo reads its medium from the media API; what is under test is the
// section around it. The double keeps the props, so the spec reads what the
// logo is asked to show.
const MediaReferenceImageDouble = {
  name: "MediaReferenceImage",
  props: MediaReferenceImage.props,
  render(h) {
    return h("div");
  },
};

function mountSection(branding = {}, propsData = {}) {
  return mountComponent(PortalAuthPages, {
    propsData: {
      branding: { ...defaultBranding(), ...branding },
      portalName: "Marktplatz",
      ...propsData,
    },
    stubs: { MediaReferenceImage: MediaReferenceImageDouble },
  });
}

function radios(wrapper) {
  return wrapper.findAll(".v-radio").wrappers;
}

function radio(wrapper, label) {
  return radios(wrapper).find((item) => item.text().trim() === label);
}

function checkedLabel(wrapper) {
  const checked = radios(wrapper).find(
    (item) => item.find("input").element.getAttribute("aria-checked") === "true"
  );
  return checked ? checked.text().trim() : null;
}

/**
 * The section „Anmeldeseiten“ of the Portal tab (ECCdigital/tickets#534): the
 * height of the logo in the login card of the storefront, S, M or L with
 * 56, 96 and 160 px, S as today.
 */
describe("PortalAuthPages size of the logo", () => {
  it("offers S, M and L with their heights, S as today", () => {
    const wrapper = mountSection();

    expect(radios(wrapper).map((item) => item.text().trim())).toEqual([
      "S · 56 px (wie heute)",
      "M · 96 px",
      "L · 160 px",
    ]);
    expect(wrapper.text()).toContain("Auf dem Telefon höchstens M.");
  });

  it("starts on S", () => {
    const wrapper = mountSection();

    expect(checkedLabel(wrapper)).toBe("S · 56 px (wie heute)");
  });

  it("shows the stored size", () => {
    const wrapper = mountSection({ authLogoSize: "lg" });

    expect(checkedLabel(wrapper)).toBe("L · 160 px");
  });

  it("reads a size it does not know as S", () => {
    const wrapper = mountSection({ authLogoSize: "xl" });

    expect(checkedLabel(wrapper)).toBe("S · 56 px (wie heute)");
  });

  it("sends the chosen size as a patch", async () => {
    const wrapper = mountSection();

    await radio(wrapper, "M · 96 px").find("input").trigger("click");

    expect(wrapper.emitted("patch")).toEqual([[{ authLogoSize: "md" }]]);
  });
});

const LOGO = { source: "media", mediaId: "m1", url: null };
const LOGO_DARK = { source: "media", mediaId: "m2", url: null };

function card(wrapper, mode) {
  return wrapper.find(`.portal-login-preview[data-mode="${mode}"]`);
}

function logoIn(wrapper, mode) {
  const logo = card(wrapper, mode).find(".portal-login-preview__logo");
  return logo.exists() ? logo : null;
}

function logoImage(wrapper, mode) {
  return logoIn(wrapper, mode).findComponent({ name: "MediaReferenceImage" });
}

/**
 * Beside the choice a small login card in light and dark, as the storefront
 * draws it: logo and Portal Name on top of the card, the card at half its
 * size so both fit the column.
 */
describe("PortalAuthPages login card", () => {
  it("shows the card in light and in dark with the Portal Name", () => {
    const wrapper = mountSection();

    for (const mode of ["light", "dark"]) {
      expect(card(wrapper, mode).exists()).toBe(true);
      expect(
        card(wrapper, mode).find(".portal-login-preview__name").text()
      ).toBe("Marktplatz");
    }
  });

  it("draws the logo at half the chosen height", async () => {
    const wrapper = mountSection({ logo: LOGO });

    expect(logoImage(wrapper, "light").props("height")).toBe(28);

    await wrapper.setProps({
      branding: { ...defaultBranding(), logo: LOGO, authLogoSize: "lg" },
    });

    expect(logoImage(wrapper, "light").props("height")).toBe(80);
    expect(logoImage(wrapper, "dark").props("height")).toBe(80);
  });

  it("lets the Portal Name stand alone without a logo", () => {
    const wrapper = mountSection();

    expect(logoIn(wrapper, "light")).toBeNull();
    expect(logoIn(wrapper, "dark")).toBeNull();
  });

  it("inverts the logo in dark while no variant for dark is set", () => {
    const wrapper = mountSection({ logo: LOGO });

    expect(logoImage(wrapper, "dark").props("reference")).toEqual(LOGO);
    expect(logoImage(wrapper, "dark").classes()).toContain(
      "portal-app-logo--inverted"
    );
    expect(logoImage(wrapper, "light").classes()).not.toContain(
      "portal-app-logo--inverted"
    );
  });

  it("shows the variant for dark as it is", () => {
    const wrapper = mountSection({ logo: LOGO, logoDark: LOGO_DARK });

    expect(logoImage(wrapper, "light").props("reference")).toEqual(LOGO);
    expect(logoImage(wrapper, "dark").props("reference")).toEqual(LOGO_DARK);
    expect(logoImage(wrapper, "dark").classes()).not.toContain(
      "portal-app-logo--inverted"
    );
  });
});
