import { describe, expect, it, vi } from "vitest";
import TenantEditAccess from "@/components/Tenant/Edit/TenantEditAccess.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: {
    testConnection: vi.fn(),
    getSaltoIqs: vi.fn(() => Promise.resolve({ data: [] })),
    startSaltoIqActivation: vi.fn(),
  },
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

function saltoPanel(wrapper) {
  return wrapper.findAll(".v-expansion-panel").at(1);
}

/**
 * A Salto KS application as it is stored once it was set up, its secrets left
 * out as without plain text.
 */
function storedSalto(overrides = {}) {
  return {
    ...storedApps(),
    "salto-ks": {
      type: "access",
      id: "salto-ks",
      title: "Salto KS",
      clientId: "client-1",
      clientSecret: "",
      username: "biletado@example.com",
      password: "",
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

const BOTH_STORED = {
  saltoSecretConfigured: true,
  saltoPasswordConfigured: true,
};

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
    const wrapper = await mountAccess(storedSalto(), BOTH_STORED);

    expect(saltoPanel(wrapper).text()).toContain(
      "Testet mit den gespeicherten Secrets."
    );
  });

  it("says it tests with the secrets of the form when both are filled", async () => {
    const wrapper = await mountAccess(
      storedSalto({ clientSecret: "secret", password: "password" }),
      BOTH_STORED
    );

    expect(saltoPanel(wrapper).text()).toContain(
      "Testet mit den Secrets aus dem Formular."
    );
  });

  it("sends empty secret fields empty, next to the identity", async () => {
    const wrapper = await mountAccess(storedSalto(), BOTH_STORED);

    await runTest(wrapper, { success: true, message: "Connection successful" });

    expect(ApiAccessAppsService.testConnection).toHaveBeenLastCalledWith(
      "t1",
      {
        clientId: "client-1",
        clientSecret: "",
        username: "biletado@example.com",
        password: "",
        siteId: "site-1",
        environment: "accept",
      },
      "salto-ks"
    );
  });

  it("keeps testing with the stored secrets when only the site changes", async () => {
    const wrapper = await mountAccess(storedSalto(), BOTH_STORED);

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
      storedSalto({ clientId: "new-client" }),
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
      "Die Client-ID ist neu. Geben Sie das passende Client Secret ein."
    );
    expect(text).toContain(
      "Die Umgebung ist neu. Geben Sie das Passwort des System-Users für diese Umgebung ein."
    );
    expect(text).not.toContain("Missing secrets");
  });

  it("shows a failure without checks as the plain message", async () => {
    const wrapper = await mountAccess(storedSalto(), BOTH_STORED);

    await runTest(wrapper, {
      success: false,
      message: "Missing required fields: clientId",
    });

    expect(saltoPanel(wrapper).text()).toContain(
      "Missing required fields: clientId"
    );
  });
});

const ALL_OK = {
  credentials: { status: "ok" },
  login: { status: "ok" },
  site: { status: "ok", locks: 4 },
  remoteAccess: { status: "ok" },
  remoteLockingRight: { status: "not_verifiable" },
  iqs: { status: "ok" },
};

const IQ = {
  customerReference: "Labortür",
  otpEnabled: true,
  online: true,
  restoreRequired: false,
  state: "activated",
};

/** The backend's answer to a test that ran (ECCdigital/tickets#576). */
function answer({ checks = {}, iqs, ...overrides } = {}) {
  const merged = { ...ALL_OK, ...checks };
  const connected = ["credentials", "login", "site"].every(
    (key) => merged[key].status === "ok"
  );
  return {
    success: connected,
    message: connected ? "Connection successful (accept)" : "invalid_client",
    environment: "accept",
    testedAt: "2026-10-15T09:41:00.000Z",
    testedWith: { clientSecret: "stored", password: "stored" },
    checks: merged,
    ...(connected && {
      details: {
        remoteAccess: merged.remoteAccess.status === "ok",
        remoteLockingRight: "not_verifiable",
        iqs: iqs || [
          { ...IQ, id: "1" },
          { ...IQ, id: "2" },
          { ...IQ, id: "3", otpEnabled: false, state: "not_activated" },
        ],
      },
    }),
    ...overrides,
  };
}

async function testedAccess(data, apps = storedSalto()) {
  const wrapper = await mountAccess(apps, BOTH_STORED);
  await runTest(wrapper, data);
  return wrapper;
}

function headline(wrapper) {
  return saltoPanel(wrapper).find("[data-test='salto-check-headline']").text();
}

function row(wrapper, key) {
  return saltoPanel(wrapper).find(`[data-test~='salto-check-${key}']`);
}

/**
 * The result of the connection test is a checklist under the button, one row
 * per check with sign, value and, where needed, what to do; the IQs as a
 * summary with a jump to the activation (ECCdigital/tickets#576, variant A of
 * #507).
 */
describe("TenantEditAccess checklist of the Salto KS connection test", () => {
  it("lists the six checks in their fixed order", async () => {
    const wrapper = await testedAccess(answer());

    const rows = saltoPanel(wrapper)
      .findAll("[data-test~='salto-check-row']")
      .wrappers.map((r) => r.attributes("data-test"));
    expect(rows).toEqual([
      "salto-check-row salto-check-credentials",
      "salto-check-row salto-check-login",
      "salto-check-row salto-check-site",
      "salto-check-row salto-check-remoteAccess",
      "salto-check-row salto-check-remoteLockingRight",
      "salto-check-row salto-check-iqs",
    ]);
    expect(row(wrapper, "credentials").text()).toContain(
      "Client-ID und Client Secret"
    );
    expect(row(wrapper, "credentials").text()).toContain("accept");
    expect(row(wrapper, "login").text()).toContain(
      "Anmeldung des System-Users"
    );
    expect(row(wrapper, "site").text()).toContain("Site");
    expect(row(wrapper, "site").text()).toContain("4 Schlösser");
    expect(row(wrapper, "remoteAccess").text()).toContain(
      "Fernöffnen für den System-User"
    );
    expect(row(wrapper, "remoteLockingRight").text()).toContain(
      "Recht zum Fernöffnen an den Türen"
    );
    expect(row(wrapper, "iqs").text()).toContain("IQs");
  });

  it("heads a working connection with its environment and the number of hints", async () => {
    const wrapper = await testedAccess(answer());

    // The remote locking right is the one hint: the API cannot check it.
    expect(headline(wrapper)).toBe(
      "Verbunden mit Salto KS (accept), 1 Hinweis"
    );
  });

  it("counts every row that needs a look as a hint", async () => {
    const wrapper = await testedAccess(
      answer({
        checks: { remoteAccess: { status: "unknown" } },
        iqs: [
          { ...IQ, id: "1" },
          { ...IQ, id: "2", state: "pending_pin" },
        ],
      })
    );

    expect(headline(wrapper)).toBe(
      "Verbunden mit Salto KS (accept), 3 Hinweise"
    );
  });

  it("heads a failed connection as no connection and leaves the rest unchecked", async () => {
    const wrapper = await testedAccess(
      answer({
        checks: {
          credentials: { status: "failed", code: "invalid_client" },
          login: { status: "skipped" },
          site: { status: "skipped" },
          remoteAccess: { status: "skipped" },
          iqs: { status: "skipped" },
        },
      })
    );

    expect(headline(wrapper)).toBe("Keine Verbindung zu Salto KS");
    expect(row(wrapper, "credentials").text()).toContain(
      "Salto lehnt Client-ID oder Client Secret ab."
    );
    for (const key of ["login", "site", "remoteAccess", "iqs"]) {
      expect(row(wrapper, key).text()).toContain("nicht geprüft");
    }
    expect(saltoPanel(wrapper).text()).not.toContain("invalid_client");
  });

  it.each([
    ["login", "invalid_grant", "Salto lehnt System-User oder Passwort ab."],
    ["site", "site_forbidden", "nicht die Rolle „site_admin“"],
    ["site", "site_missing", "Tragen Sie die Site-ID ein"],
    [
      "credentials",
      "timeout",
      "Salto antwortet nicht innerhalb von 30 Sekunden",
    ],
  ])("explains %s failed with %s in German", async (key, code, text) => {
    const wrapper = await testedAccess(
      answer({ checks: { [key]: { status: "failed", code } } })
    );

    expect(row(wrapper, key).text()).toContain(text);
    expect(row(wrapper, key).find(".mdi-close").exists()).toBe(true);
  });

  it("names a failure without code with Salto's message", async () => {
    const wrapper = await testedAccess(
      answer({
        checks: { site: { status: "failed" } },
        message: "Internal error",
      })
    );

    expect(row(wrapper, "site").text()).toContain("Internal error");
  });

  it("asks to allow remote opening when the system user may not, and stays connected", async () => {
    const wrapper = await testedAccess(
      answer({
        checks: {
          remoteAccess: { status: "failed", code: "remote_access_off" },
        },
      })
    );

    expect(headline(wrapper)).toContain("Verbunden mit Salto KS (accept)");
    expect(row(wrapper, "remoteAccess").text()).toContain(
      "Der System-User darf nicht fernöffnen."
    );
  });

  it("says the remote locking right cannot be checked over the API and points to the guide", async () => {
    const wrapper = await testedAccess(answer());

    const text = row(wrapper, "remoteLockingRight").text();
    expect(text).toContain("über die API nicht prüfbar");
    expect(text).toContain("Voraussetzungen in Salto KS");
  });

  it("puts a question mark where Salto gave no details, and stays connected", async () => {
    const wrapper = await testedAccess(
      answer({
        checks: {
          remoteAccess: { status: "unknown" },
          iqs: { status: "unknown" },
        },
        iqs: [],
      })
    );

    expect(headline(wrapper)).toContain("Verbunden mit Salto KS (accept)");
    for (const key of ["remoteAccess", "iqs"]) {
      expect(row(wrapper, key).find(".mdi-help").exists()).toBe(true);
      expect(row(wrapper, key).text()).toContain(
        "Salto hat dazu nichts geliefert."
      );
    }
  });

  it("sums the IQs up without a jump when all are activated", async () => {
    const wrapper = await testedAccess(answer(), {
      ...storedSalto({ active: true }),
    });

    expect(row(wrapper, "iqs").text()).toContain("3 IQs, 2 von 2 aktiviert");
    expect(
      row(wrapper, "iqs").find("[data-test='salto-to-activation']").exists()
    ).toBe(false);
  });

  it("names open IQs and devices offline, with a jump to the activation", async () => {
    const wrapper = await testedAccess(
      answer({
        iqs: [
          { ...IQ, id: "1" },
          { ...IQ, id: "2", state: "pending_pin" },
          { ...IQ, id: "3", state: "reactivation_required", online: false },
        ],
      }),
      storedSalto({ active: true })
    );
    const scrolled = [];
    Element.prototype.scrollIntoView = vi.fn(function () {
      scrolled.push(this);
    });

    const text = row(wrapper, "iqs").text();
    expect(text).toContain("3 IQs, 1 von 3 aktiviert");
    expect(text).toContain("2 IQs brauchen eine Aktivierung");
    expect(text).toContain("1 IQ offline");
    expect(text).not.toContain("Labortür");

    await row(wrapper, "iqs")
      .find("[data-test='salto-to-activation']")
      .trigger("click");

    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].textContent).toContain("IQ-Aktivierung für Remote-Open");
  });

  it("names per secret what the test ran with", async () => {
    const wrapper = await testedAccess(
      answer({ testedWith: { clientSecret: "stored", password: "form" } })
    );

    expect(
      saltoPanel(wrapper).find("[data-test='salto-tested-with']").text()
    ).toBe(
      "Getestet mit: Client Secret gespeichert, Passwort aus dem Formular"
    );
  });
});

/**
 * Salto hands out the first secret once per System-User and IQ. When the
 * System-User was activated at the IQ before, the one way out measured is a
 * new System-User; untested resets in Salto KS are not named
 * (ECCdigital/tickets#508).
 */
describe("TenantEditAccess activation of an IQ the System-User was activated at", () => {
  it("names a new System-User as the way out", async () => {
    ApiAccessAppsService.getSaltoIqs.mockResolvedValueOnce({
      data: [{ ...IQ, id: "1", state: "not_activated" }],
    });
    ApiAccessAppsService.startSaltoIqActivation.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { code: "salto_iq_already_activated_at_salto" },
      },
    });
    const wrapper = await mountAccess(storedSalto({ active: true }));
    await flushPromises();
    await wrapper.vm.$nextTick();

    const startButton = saltoPanel(wrapper)
      .findAll("button")
      .filter((b) => b.text().includes("Aktivierung starten"))
      .at(0);
    await startButton.trigger("click");
    await wrapper.vm.$nextTick();
    const wizard = () =>
      [...document.querySelectorAll(".v-dialog")].find((d) =>
        d.textContent.includes("IQ aktivieren")
      );
    wizard().querySelector("input[type='checkbox']").click();
    await wrapper.vm.$nextTick();
    [...wizard().querySelectorAll("button")]
      .find((b) => b.textContent.includes("Weiter"))
      .click();
    await flushPromises();
    await wrapper.vm.$nextTick();

    const text = wizard().querySelector(".v-alert.error--text").textContent;
    expect(text).toContain("bereits aktiviert");
    expect(text).toContain("neuen System-User");
    expect(text).toContain("nie aktiviert war");
    expect(text).toContain("aktivieren Sie die IQs neu");
    expect(text).toContain("ruhen");
    expect(text).not.toContain("Reset");
    expect(text).not.toContain("Einrichtungsanleitung");
  });
});
