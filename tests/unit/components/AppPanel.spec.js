import { describe, expect, it } from "vitest";
import AppPanel from "@/components/AppPanel.vue";
import { mountComponent } from "@tests/unit/support/mount";

describe("AppPanel — the provider's logo", () => {
  // A dark provider logo all but vanished on the dark panel header
  // (ECCdigital/tickets#307). The plate is light under .theme--dark and
  // transparent in the light theme, as behind the instance logo.
  it("sits on the logo plate", () => {
    const wrapper = mountComponent(AppPanel, {
      propsData: { title: "Pareva", logo: "/pareva-logo.png" },
    });
    const logo = wrapper.find("img.app-panel__logo");

    expect(logo.attributes("src")).toBe("/pareva-logo.png");
  });

  it("shows the icon when there is no logo", () => {
    const wrapper = mountComponent(AppPanel, {
      propsData: { title: "Rechnung", icon: "mdi-file" },
    });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find(".v-icon").classes()).toContain("mdi-file");
  });
});
