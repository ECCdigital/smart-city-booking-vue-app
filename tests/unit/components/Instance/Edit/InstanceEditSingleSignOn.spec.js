import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import InstanceEditSingleSignOn from "@/components/Instance/Edit/InstanceEditSingleSignOn.vue";

function keycloak(overrides = {}) {
  return {
    id: "keycloak",
    type: "auth",
    active: true,
    title: "",
    serverUrl: "https://sso.example.de",
    realm: "biletado",
    publicClient: "biletado-web",
    privateClient: "biletado-api",
    privateClientSecret: "secret",
    roleMapping: { active: false, roles: [] },
    ...overrides,
  };
}

function instance(overrides = {}) {
  return {
    id: "instance",
    applications: [keycloak()],
    ...overrides,
  };
}

function mountTab(propsData = {}) {
  return mountComponent(InstanceEditSingleSignOn, {
    propsData: { instance: instance(), ...propsData },
  });
}

function field(wrapper, label) {
  return wrapper
    .findAll(".v-text-field")
    .wrappers.find((f) => f.find("label").text() === label);
}

function cardAuth(overrides = {}) {
  return {
    id: "card-1",
    type: "card-auth",
    label: "Ehrenamtskarte",
    ...overrides,
  };
}

async function settle(wrapper) {
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

function fieldLabels(wrapper) {
  return wrapper
    .findAll(".v-text-field label")
    .wrappers.map((label) => label.text());
}

describe("InstanceEditSingleSignOn", () => {
  it("shows the Keycloak form and no card authentication", () => {
    const wrapper = mountTab({
      instance: instance({ applications: [keycloak(), cardAuth()] }),
    });

    expect(fieldLabels(wrapper)).toEqual(
      expect.arrayContaining(["Keycloak-URL", "Realm", "Client Secret"])
    );
    expect(wrapper.text()).not.toContain("Karten-Authentifizierung");
    expect(wrapper.text()).not.toContain("Ehrenamtskarte");
  });
});

describe("InstanceEditSingleSignOn clients", () => {
  it("names the clients „Web-Client“ and „API-Client“ and says what each is for", () => {
    const wrapper = mountTab();

    const webClient = field(wrapper, "Web-Client");
    const apiClient = field(wrapper, "API-Client");
    expect(webClient.find("input").element.value).toBe("biletado-web");
    expect(webClient.text()).toContain("public Client");
    expect(webClient.text()).toContain("Admin UI und Storefront");
    expect(apiClient.find("input").element.value).toBe("biletado-api");
    expect(apiClient.text()).toContain("confidential Client");
    expect(apiClient.text()).toContain("Tokens");
    expect(fieldLabels(wrapper)).not.toContain("Client-ID für Web-Anwendung");
    expect(fieldLabels(wrapper)).not.toContain("Client-ID für Api-Zugriff");
  });

  it.each([
    ["Web-Client", "publicClient"],
    ["API-Client", "privateClient"],
  ])(
    "hands the typed %s on as %s of the Keycloak application, keeping the cards",
    async (label, key) => {
      const wrapper = mountTab({
        instance: instance({ applications: [keycloak(), cardAuth()] }),
      });

      await field(wrapper, label).find("input").setValue("neu");
      await settle(wrapper);

      const { applications } = wrapper.emitted("update:instance").at(-1)[0];
      const app = applications.find((a) => a.id === "keycloak");
      expect(app[key]).toBe("neu");
      expect(applications.find((a) => a.id === "card-1")).toEqual(cardAuth());
    }
  );
});
