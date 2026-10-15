import { describe, expect, it, vi } from "vitest";
import TenantEditAccess from "@/components/Tenant/Edit/TenantEditAccess.vue";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { testConnection: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowAuditExport: () => false },
}));

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
async function mountAccess(apps = storedApps()) {
  const wrapper = mountComponent(TenantEditAccess, {
    propsData: { tenant: { id: "t1" }, apps },
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

function saltoPanel(wrapper) {
  return wrapper.findAll(".v-expansion-panel").at(1);
}

/** A Salto KS application as it is stored once it was set up. */
function storedSalto(overrides = {}) {
  return {
    ...storedApps(),
    "salto-ks": {
      type: "access",
      id: "salto-ks",
      title: "Salto KS",
      clientId: "client-1",
      username: "biletado@example.com",
      siteId: "site-1",
      environment: "accept",
      active: false,
      ...overrides,
    },
  };
}

/**
 * Admins of the tenant set Salto KS up themselves (ECCdigital/tickets#571).
 * Until 4.4 the panel was greyed out behind „Bald verfügbar“.
 */
describe("TenantEditAccess panel for Salto KS", () => {
  it("is editable, without the coming-soon badge", async () => {
    const wrapper = await mountAccess(storedSalto());
    const panel = saltoPanel(wrapper);

    expect(wrapper.text()).not.toContain("Bald verfügbar");
    const clientId = panel.find("input[type='text']");
    expect(clientId.element.matches(":disabled")).toBe(false);

    await clientId.setValue("client-2");

    const emitted = wrapper.emitted("update:apps");
    expect(emitted.at(-1)[0]["salto-ks"].clientId).toBe("client-2");
  });

  /**
   * What the System-User needs in Salto KS, before the credentials are typed
   * in (ECCdigital/tickets#508). Biletado can check none of it over the API.
   */
  it("names the prerequisites in Salto KS before the credentials", async () => {
    const wrapper = await mountAccess(storedSalto());
    const panel = saltoPanel(wrapper);

    const block = panel.find("[data-test='salto-prerequisites']");
    expect(block.exists()).toBe(true);
    const text = block.text();
    expect(text).toContain("Voraussetzungen in Salto KS");
    expect(text).toContain("Biletado – nicht löschen");
    expect(text).toContain("kein persönliches Konto");
    expect(text).toContain("site_admin");
    expect(text).toContain("Remote Opening");
    expect(text).toContain("Lock Options");
    expect(text).toContain("Postfach");
    expect(text).toContain("Salto-App");

    const credentials = panel
      .findAll(".section-title")
      .wrappers.find((title) => title.text() === "API-Zugangsdaten");
    expect(
      block.element.compareDocumentPosition(credentials.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // Salto doors open by app only; there is no PIN for the booking user.
  it("promises no PIN code in the description", async () => {
    const wrapper = await mountAccess(storedSalto());

    const description = saltoPanel(wrapper).find(".provider-description");
    expect(description.text()).toContain("per App");
    expect(description.text()).not.toContain("PIN");
  });

  it("preselects Production when Salto KS is set up anew", async () => {
    const wrapper = await mountAccess(storedApps());
    const panel = saltoPanel(wrapper);

    expect(panel.find(".v-select__selection").text()).toBe("Production");

    await panel.find("input[type='text']").setValue("client-1");

    const emitted = wrapper.emitted("update:apps");
    expect(emitted.at(-1)[0]["salto-ks"].environment).toBe("production");
  });

  // Reading it as production would switch a running tenant silently.
  it("keeps a stored configuration without environment on Accept", async () => {
    const wrapper = await mountAccess(storedSalto({ environment: undefined }));
    const panel = saltoPanel(wrapper);

    expect(panel.find(".v-select__selection").text()).toBe("Accept (Sandbox)");
  });
});
