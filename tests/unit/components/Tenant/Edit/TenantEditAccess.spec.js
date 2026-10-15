import { describe, expect, it, vi } from "vitest";
import TenantEditAccess from "@/components/Tenant/Edit/TenantEditAccess.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { testConnection: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowAuditExport: () => false },
}));
// The panel for Salto KS is unlocked with the Salto clean-up (map #501); the
// connection test is tested as it works once it is.
vi.mock("@/utilities/coming-soon", () => ({ SALTO_KS_COMING_SOON: false }));

/** A Nuki application saved before the customer service existed. */
function storedApps() {
  return {
    nuki: {
      type: "access",
      id: "nuki",
      title: "Nuki",
      apiToken: "",
      apiBaseUrl: "https://api.nuki.io",
      active: true,
    },
  };
}

/** The panels are collapsed; Vuetify renders their content once opened. */
async function mountAccess(apps = storedApps(), props = {}) {
  const wrapper = mountComponent(TenantEditAccess, {
    propsData: { tenant: { id: "t1" }, apps, ...props },
  });

  const headers = wrapper.findAll(".v-expansion-panel-header").wrappers;
  for (const header of headers) {
    await header.trigger("click");
  }
  await wrapper.vm.$nextTick();

  return wrapper;
}

function nukiPanel(wrapper) {
  return wrapper.findAll(".v-expansion-panel").at(0);
}

/**
 * Nuki gets the same customer-service form as the bike boxes, so that the
 * storefront can name a contact below the open button of a door. A stored
 * application from before the field existed has to read as an empty contact
 * rather than break the form.
 */
describe("TenantEditAccess customer service for Nuki", () => {
  it("shows the form for Nuki but not for Salto KS", async () => {
    const wrapper = await mountAccess();

    expect(nukiPanel(wrapper).text()).toContain("Kundenservice");
    expect(wrapper.findAll(".v-expansion-panel").at(1).text()).not.toContain(
      "Kundenservice"
    );
  });

  it("fills an empty contact into a stored Nuki app and emits the edit", async () => {
    const wrapper = await mountAccess();

    await nukiPanel(wrapper).find("input[type='tel']").setValue("030 1234");

    const emitted = wrapper.emitted("update:apps");
    expect(emitted.at(-1)[0].nuki.customerService).toEqual({
      name: "",
      email: "",
      phone: "030 1234",
    });
  });

  it("carries a saved contact into the form and out again", async () => {
    const apps = storedApps();
    apps.nuki.customerService = {
      name: "Hausmeisterei",
      email: "tuer@example.com",
      phone: "",
    };
    const wrapper = await mountAccess(apps);

    const emailInput = nukiPanel(wrapper).findAll("input[type='email']").at(0);
    expect(emailInput.element.value).toBe("tuer@example.com");

    await nukiPanel(wrapper).find("input[type='tel']").setValue("030 1234");

    const emitted = wrapper.emitted("update:apps");
    expect(emitted.at(-1)[0].nuki.customerService).toEqual({
      name: "Hausmeisterei",
      email: "tuer@example.com",
      phone: "030 1234",
    });
  });
});

/** A stored Salto KS application, its secrets left out as without plain text. */
function storedSaltoApps(overrides = {}) {
  return {
    ...storedApps(),
    "salto-ks": {
      type: "access",
      id: "salto-ks",
      title: "Salto KS",
      clientId: "client-id",
      clientSecret: "",
      username: "system-user@example.test",
      password: "",
      siteId: "site-1",
      environment: "accept",
      active: false,
      ...overrides,
    },
  };
}

const BOTH_STORED = {
  saltoSecretConfigured: true,
  saltoPasswordConfigured: true,
};

function saltoPanel(wrapper) {
  return wrapper.findAll(".v-expansion-panel").at(1);
}

function testButton(wrapper) {
  return saltoPanel(wrapper)
    .findAll("button")
    .filter((b) => b.text().includes("Verbindung testen"))
    .at(0);
}

async function runTest(wrapper, data) {
  ApiAccessAppsService.testConnection.mockResolvedValueOnce({ data });
  await testButton(wrapper).trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * The connection test of Salto KS runs on the stored secrets when the form
 * leaves them empty: the backend completes them as long as they belong to
 * the identity in the form, and says per secret what is missing otherwise
 * (ECCdigital/tickets#575).
 */
describe("TenantEditAccess connection test for Salto KS", () => {
  it("says it tests with the stored secrets when both fields are empty", async () => {
    const wrapper = await mountAccess(storedSaltoApps(), BOTH_STORED);

    expect(saltoPanel(wrapper).text()).toContain(
      "Testet mit den gespeicherten Secrets."
    );
  });

  it("says it tests with the secrets of the form when both are filled", async () => {
    const wrapper = await mountAccess(
      storedSaltoApps({ clientSecret: "secret", password: "password" }),
      BOTH_STORED
    );

    expect(saltoPanel(wrapper).text()).toContain(
      "Testet mit den Secrets aus dem Formular."
    );
  });

  it("sends empty secret fields empty, next to the identity", async () => {
    const wrapper = await mountAccess(storedSaltoApps(), BOTH_STORED);

    await runTest(wrapper, { success: true, message: "Connection successful" });

    expect(ApiAccessAppsService.testConnection).toHaveBeenLastCalledWith(
      "t1",
      {
        clientId: "client-id",
        clientSecret: "",
        username: "system-user@example.test",
        password: "",
        siteId: "site-1",
        environment: "accept",
      },
      "salto-ks"
    );
  });

  it("keeps testing with the stored secrets when only the site changes", async () => {
    const wrapper = await mountAccess(storedSaltoApps(), BOTH_STORED);

    const siteField = saltoPanel(wrapper)
      .findAll("input")
      .filter((input) => input.element.value === "site-1")
      .at(0);
    await siteField.setValue("site-2");

    expect(saltoPanel(wrapper).text()).toContain(
      "Testet mit den gespeicherten Secrets."
    );
    await runTest(wrapper, { success: true, message: "Connection successful" });
    expect(ApiAccessAppsService.testConnection).toHaveBeenLastCalledWith(
      "t1",
      expect.objectContaining({
        siteId: "site-2",
        clientSecret: "",
        password: "",
      }),
      "salto-ks"
    );
  });

  it("names per secret what is missing and why", async () => {
    const wrapper = await mountAccess(
      storedSaltoApps({ clientId: "new-client" }),
      BOTH_STORED
    );

    await runTest(wrapper, {
      success: false,
      code: "missing_secret",
      message: "Missing secrets: clientSecret, password",
      missing: [
        { field: "clientSecret", reason: "client_id_changed" },
        { field: "password", reason: "environment_changed" },
      ],
    });

    const text = saltoPanel(wrapper).text();
    expect(text).toContain(
      "Die Client-ID ist neu. Gib das passende Client Secret ein."
    );
    expect(text).toContain(
      "Die Umgebung ist neu. Gib das Passwort des System-Users für diese Umgebung ein."
    );
    expect(text).not.toContain("Missing secrets");
  });

  it("shows a working connection as before", async () => {
    const wrapper = await mountAccess(storedSaltoApps(), BOTH_STORED);

    await runTest(wrapper, {
      success: true,
      message: "Connection successful (accept)",
    });

    expect(saltoPanel(wrapper).text()).toContain(
      "Connection successful (accept)"
    );
  });
});
