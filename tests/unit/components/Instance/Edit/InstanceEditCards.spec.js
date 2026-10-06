import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import InstanceEditCards from "@/components/Instance/Edit/InstanceEditCards.vue";

function keycloak() {
  return {
    id: "keycloak",
    type: "auth",
    serverUrl: "https://sso.example.de",
    realm: "biletado",
    roleMapping: { active: false, roles: [] },
  };
}

function cardAuth(overrides = {}) {
  return {
    id: "card-1",
    type: "card-auth",
    label: "Ehrenamtskarte",
    enabled: true,
    ...overrides,
  };
}

function instance(overrides = {}) {
  return {
    id: "instance",
    applications: [keycloak(), cardAuth()],
    ...overrides,
  };
}

function mountTab(propsData = {}) {
  return mountComponent(InstanceEditCards, {
    propsData: { instance: instance(), ...propsData },
  });
}

async function settle(wrapper) {
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

/** The confirmation dialog detaches into the `data-app` container. */
function dialogButton(text) {
  return [...document.querySelectorAll(".v-dialog--active button")].find(
    (button) => button.textContent.trim() === text
  );
}

describe("InstanceEditCards", () => {
  it("shows the card authentication and no Keycloak form", () => {
    const wrapper = mountTab();

    expect(wrapper.text()).toContain("Karten-Authentifizierung");
    expect(wrapper.text()).toContain("Ehrenamtskarte");
    expect(wrapper.text()).not.toContain("Keycloak-URL");
    expect(wrapper.text()).not.toContain("Web-Client");
  });

  it("hands a removed card authentication on with the instance, keeping Keycloak", async () => {
    const wrapper = mountTab();

    const remove = wrapper
      .findAll(".v-btn")
      .wrappers.find((button) => button.find(".mdi-delete").exists());
    await remove.trigger("click");
    await settle(wrapper);
    dialogButton("Entfernen").click();
    await settle(wrapper);

    const { applications } = wrapper.emitted("update:instance").at(-1)[0];
    expect(applications).toEqual([keycloak()]);
  });
});
