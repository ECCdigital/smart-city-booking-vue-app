import { describe, expect, it } from "vitest";
import Vuex from "vuex";
import { RouterLinkStub } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";

import AuthPage from "@/components/Auth/AuthPage.vue";

function mountAuthPage(active, instance = {}, propsData = {}) {
  const store = new Vuex.Store({
    modules: {
      instance: { namespaced: true, getters: { instance: () => instance } },
    },
  });

  return mountComponent(AuthPage, {
    store,
    propsData: { active, ...propsData },
    stubs: { RouterLink: RouterLinkStub },
    slots: { default: "<p data-test='form'>Formular</p>" },
  });
}

describe("AuthPage — the switch between the two pages", () => {
  it("marks the active page and links to the other one", () => {
    const wrapper = mountAuthPage("register");

    const pills = wrapper.findAllComponents(RouterLinkStub);
    expect(pills).toHaveLength(2);
    expect(pills.at(0).props("to")).toEqual({ name: "login" });
    expect(pills.at(1).props("to")).toEqual({ name: "register" });

    expect(pills.at(0).classes()).not.toContain("auth-page__pill--active");
    expect(pills.at(1).classes()).toContain("auth-page__pill--active");
    expect(pills.at(1).attributes("aria-current")).toBe("page");
    expect(pills.at(0).attributes("aria-current")).toBeUndefined();
  });

  it("heads a page of its own with its title instead of the switch", () => {
    const wrapper = mountAuthPage(
      null,
      {},
      { title: "Passwort zurücksetzen", icon: "mdi-lock-reset" }
    );

    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0);
    expect(wrapper.find(".auth-page__title").text()).toBe(
      "Passwort zurücksetzen"
    );
  });

  it("renders the page's form inside the card", () => {
    const wrapper = mountAuthPage("login");

    expect(wrapper.find(".auth-page__card [data-test='form']").exists()).toBe(
      true
    );
  });
});

describe("AuthPage — the provider under the card", () => {
  it("names the provider with its website and lists the configured legal documents", () => {
    const wrapper = mountAuthPage("login", {
      contactAddress: "Stadt Musterhausen",
      contactUrl: "https://www.musterhausen.de",
      dataProtection: { url: "https://www.musterhausen.de/datenschutz" },
      legalNotice: {},
      termsAndConditions: { url: "https://www.musterhausen.de/agb" },
    });

    const provider = wrapper.find(".auth-page__provider");
    expect(provider.text()).toContain("Bereitgestellt von Stadt Musterhausen");
    expect(provider.find("a").attributes("href")).toBe(
      "https://www.musterhausen.de"
    );

    const legal = wrapper.findAll(".auth-page__legal a");
    expect(legal.wrappers.map((a) => a.text())).toEqual(["Datenschutz", "AGB"]);
    expect(legal.at(1).attributes("href")).toBe(
      "https://www.musterhausen.de/agb"
    );
  });

  it("shows no footer for an instance without provider or legal documents", () => {
    const wrapper = mountAuthPage("login");

    expect(wrapper.find(".auth-page__footer").exists()).toBe(false);
  });
});
