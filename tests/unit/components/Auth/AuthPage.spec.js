import { describe, expect, it } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";

import AuthPage from "@/components/Auth/AuthPage.vue";

function mountAuthPage(instance = {}, propsData = {}) {
  const store = new Vuex.Store({
    modules: {
      instance: { namespaced: true, getters: { instance: () => instance } },
    },
  });

  return mountComponent(AuthPage, {
    store,
    propsData: { title: "Anmelden", ...propsData },
    slots: { default: "<p data-test='form'>Formular</p>" },
  });
}

describe("AuthPage — the card", () => {
  it("heads the card with the page's title and icon", () => {
    const wrapper = mountAuthPage(
      {},
      { title: "Passwort zurücksetzen", icon: "mdi-lock-reset" }
    );

    const title = wrapper.find("h1.auth-page__title");
    expect(title.text()).toBe("Passwort zurücksetzen");
    expect(title.find(".v-icon").classes()).toContain("mdi-lock-reset");
  });

  it("renders the page's form inside the card", () => {
    const wrapper = mountAuthPage();

    expect(wrapper.find(".auth-page__card [data-test='form']").exists()).toBe(
      true
    );
  });
});

describe("AuthPage — the provider under the card", () => {
  it("names the provider with its website and lists the configured legal documents", () => {
    const wrapper = mountAuthPage({
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
    const wrapper = mountAuthPage();

    expect(wrapper.find(".auth-page__footer").exists()).toBe(false);
  });
});
