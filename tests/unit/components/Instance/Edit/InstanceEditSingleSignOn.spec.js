import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";

const auth = vi.hoisted(() => ({ mode: "direct" }));

vi.mock("@/services/auth/authMode", () => ({
  getAuthMode: () => auth.mode,
  isBffAuthMode: () => auth.mode === "bff",
}));
vi.mock("@/services/api/ApiAuthService", () => ({
  default: { getSsoAddresses: vi.fn() },
}));

import ApiAuthService from "@/services/api/ApiAuthService";
import InstanceEditSingleSignOn from "@/components/Instance/Edit/InstanceEditSingleSignOn.vue";

/** The Adresse the Admin UI runs under in the test browser. */
const ORIGIN = window.location.origin;

/** A further Adresse of the Admin UI in the allowlist of the BFF. */
const SECOND = "https://booking.example.de";

/**
 * The BFF's answer (`GET <BFF>/auth/sso/addresses`) for an allowlist of the
 * given Adressen, with the Rücksprungadressen it builds under `/admin`.
 */
function bffAnswer(origins, allowlist = "active") {
  return {
    allowlist,
    addresses: origins.map((origin) => ({
      origin,
      redirectUris: [`${origin}/admin/api/auth/sso/callback`],
      postLogoutRedirectUris: [
        `${origin}/admin/login`,
        `${origin}/admin/api/auth/sso/login*`,
      ],
    })),
  };
}

beforeEach(() => {
  auth.mode = "direct";
  vi.stubEnv("BASE_URL", "/admin/");
  ApiAuthService.getSsoAddresses.mockReset();
  ApiAuthService.getSsoAddresses.mockResolvedValue(bffAnswer([ORIGIN]));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

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
    portalUrl: "https://portal.example.de/start",
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
  it("shows the Keycloak form and no card authentication", async () => {
    const wrapper = mountTab({
      instance: instance({ applications: [keycloak(), cardAuth()] }),
    });
    await openConnection(wrapper);

    expect(fieldLabels(wrapper)).toEqual(
      expect.arrayContaining(["Keycloak-URL", "Realm", "Client Secret"])
    );
    expect(wrapper.text()).not.toContain("Karten-Authentifizierung");
    expect(wrapper.text()).not.toContain("Ehrenamtskarte");
  });
});

describe("InstanceEditSingleSignOn clients", () => {
  it("names the clients „Web-Client“ and „API-Client“ and says what each is for", async () => {
    const wrapper = mountTab();
    await openConnection(wrapper);

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
      await openConnection(wrapper);

      await field(wrapper, label).find("input").setValue("neu");
      await settle(wrapper);

      const { applications } = wrapper.emitted("update:instance").at(-1)[0];
      const app = applications.find((a) => a.id === "keycloak");
      expect(app[key]).toBe("neu");
      expect(applications.find((a) => a.id === "card-1")).toEqual(cardAuth());
    }
  );
});

function statusCard(wrapper) {
  return wrapper.find("[data-test='sso-status']");
}

describe("InstanceEditSingleSignOn status card", () => {
  it("shows the Issuer and the mode direct", () => {
    const wrapper = mountTab();

    const card = statusCard(wrapper);
    expect(card.text()).toContain("https://sso.example.de/realms/biletado");
    expect(card.text()).toContain("direct");
    expect(card.text()).not.toContain("Noch nicht eingerichtet");
  });

  it("shows the mode BFF", () => {
    auth.mode = "bff";
    const wrapper = mountTab();

    expect(statusCard(wrapper).text()).toContain("BFF");
  });
});

/** SSO not set up: the Keycloak application as the view creates it. */
function emptyKeycloak() {
  return keycloak({
    active: false,
    serverUrl: "",
    realm: "",
    publicClient: "",
    privateClient: "",
    privateClientSecret: "",
  });
}

function connection(wrapper) {
  return wrapper.find("[data-test='sso-connection']");
}

async function openConnection(wrapper) {
  await connection(wrapper).find(".v-expansion-panel-header").trigger("click");
  await settle(wrapper);
}

describe("InstanceEditSingleSignOn not set up", () => {
  it("says „Noch nicht eingerichtet“ and shows the form open", () => {
    const wrapper = mountTab({
      instance: instance({ applications: [emptyKeycloak()] }),
    });

    expect(statusCard(wrapper).text()).toContain("Noch nicht eingerichtet");
    expect(connection(wrapper).text()).toContain("Verbindung zu Keycloak");
    expect(fieldLabels(wrapper)).toContain("Keycloak-URL");
  });

  it("is not set up while the Client Secret is missing", () => {
    const wrapper = mountTab({
      instance: instance({
        applications: [keycloak({ privateClientSecret: "" })],
      }),
    });

    expect(statusCard(wrapper).text()).toContain("Noch nicht eingerichtet");
    expect(fieldLabels(wrapper)).toContain("Client Secret");
  });
});

describe("InstanceEditSingleSignOn connection", () => {
  it("folds the form under „Verbindung zu Keycloak“ once set up", async () => {
    const wrapper = mountTab();

    expect(connection(wrapper).text()).toContain("Verbindung zu Keycloak");
    expect(fieldLabels(wrapper)).not.toContain("Keycloak-URL");

    await openConnection(wrapper);

    expect(fieldLabels(wrapper)).toContain("Keycloak-URL");
    expect(wrapper.text()).not.toContain("Single Sign-On (Keycloak)");
  });
});

function steps(wrapper) {
  return wrapper.findAll("[data-test='guide-step']").wrappers;
}

function stepHeadings(wrapper) {
  return steps(wrapper).map(
    (step) =>
      `${step.find("[data-test='guide-step-number']").text()} ${step
        .find("[data-test='guide-step-title']")
        .text()}`
  );
}

function withRoleMapping(roles) {
  return instance({
    applications: [keycloak({ roleMapping: { active: true, roles } })],
  });
}

describe("InstanceEditSingleSignOn checklist", () => {
  it("numbers the steps in the order of the setup, without Client-Rollen", () => {
    const wrapper = mountTab();

    expect(stepHeadings(wrapper)).toEqual([
      "1 Realm anlegen",
      "2 Web-Client anlegen",
      "3 Rücksprungadressen und Web Origins eintragen",
      "4 Audience-Mapper anlegen",
      "5 API-Client anlegen",
      "6 Portal-URL prüfen",
    ]);
  });

  it("adds „Client-Rollen zuordnen“ with an active role mapping", () => {
    const wrapper = mountTab({
      instance: withRoleMapping([
        { tenantId: "t1", keycloakRole: "raumverwaltung", tenantRoleId: "r1" },
      ]),
    });

    expect(stepHeadings(wrapper)).toEqual([
      "1 Realm anlegen",
      "2 Web-Client anlegen",
      "3 Rücksprungadressen und Web Origins eintragen",
      "4 Audience-Mapper anlegen",
      "5 API-Client anlegen",
      "6 Client-Rollen zuordnen",
      "7 Portal-URL prüfen",
    ]);
  });
});

function stepTitled(wrapper, title) {
  return steps(wrapper).find(
    (step) => step.find("[data-test='guide-step-title']").text() === title
  );
}

/** Opens a folded step and hands back its panel. */
async function openStep(wrapper, title) {
  const step = stepTitled(wrapper, title);
  if (!step.classes("v-expansion-panel--active")) {
    await step.find(".v-expansion-panel-header").trigger("click");
    await settle(wrapper);
  }
  return stepTitled(wrapper, title);
}

/** The settings of a step as „<name in Keycloak> <value>“. */
function settings(step) {
  return step
    .findAll("[data-test='guide-setting']")
    .wrappers.map(
      (row) =>
        `${row.find("[data-test='guide-setting-name']").text()} ${row
          .find("[data-test='guide-setting-value']")
          .text()}`
    );
}

describe("InstanceEditSingleSignOn step „Realm anlegen“", () => {
  it("names the realm, the Issuer and the Keycloak versions", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, "Realm anlegen");

    expect(settings(step)).toEqual([
      "Realm name biletado",
      "Issuer https://sso.example.de/realms/biletado",
    ]);
    expect(step.text()).toContain("Keycloak 26.x ab 26.7.3");
    expect(step.text()).toContain("empfohlen 26.8.x");
  });
});

describe("InstanceEditSingleSignOn clients in the checklist", () => {
  it("sets the Web-Client up as a public client with PKCE S256 only", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, "Web-Client anlegen");

    expect(settings(step)).toEqual([
      "Client ID biletado-web",
      "Client authentication Off",
      "Standard flow On",
      "Direct access grants Off",
      "Implicit flow Off",
      "Service accounts roles Off",
      "PKCE Method S256",
    ]);
  });

  it("puts the Audience-Mapper into the Web-Client's own scope and asks to sign in again", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, "Audience-Mapper anlegen");

    expect(settings(step)).toEqual([
      "Client scope biletado-web-dedicated",
      "Mapper type Audience",
      "Included Client Audience biletado-api",
      "Add to access token On",
      "Add to ID token Off",
    ]);
    expect(step.text()).toContain("neu an");
  });

  it("sets the API-Client up as a confidential client without flows or addresses", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, "API-Client anlegen");

    expect(settings(step)).toEqual([
      "Client ID biletado-api",
      "Enabled On",
      "Client authentication On",
      "Standard flow Off",
      "Direct access grants Off",
      "Implicit flow Off",
      "Service accounts roles Off",
      "Valid redirect URIs keine",
      "Web origins keine",
    ]);
    expect(step.text()).toContain("Client Secret");
    expect(step.text()).not.toContain("Allow token introspection");
  });
});

/** The value boxes of a step: the text and whether it can be copied. */
function values(step) {
  return step.findAll("[data-test='guide-value']").wrappers.map((value) => ({
    text: value.text(),
    copy: value.find("button").exists(),
  }));
}

function valueBox(step, text) {
  return step
    .findAll("[data-test='guide-value']")
    .wrappers.find(
      (value) =>
        value.find("code").exists() && value.find("code").text() === text
    );
}

describe("InstanceEditSingleSignOn copying", () => {
  let writeText;

  beforeEach(() => {
    writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it("copies one value on its own", async () => {
    const wrapper = mountTab();
    const step = await openStep(wrapper, "Audience-Mapper anlegen");

    await valueBox(step, "biletado-api").find("button").trigger("click");
    await settle(wrapper);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("biletado-api");
  });

  it("offers every value of the instance to copy, not the fixed settings", async () => {
    const wrapper = mountTab();
    const step = await openStep(wrapper, "Web-Client anlegen");

    expect(values(step)).toEqual([
      { text: "biletado-web", copy: true },
      { text: "Off", copy: false },
      { text: "On", copy: false },
      { text: "Off", copy: false },
      { text: "Off", copy: false },
      { text: "Off", copy: false },
      { text: "S256", copy: false },
    ]);
  });
});

describe("InstanceEditSingleSignOn placeholders", () => {
  it("opens every step and shows placeholders for the missing values", () => {
    const wrapper = mountTab({
      instance: instance({ applications: [emptyKeycloak()] }),
    });

    expect(
      steps(wrapper).every((step) => step.classes("v-expansion-panel--active"))
    ).toBe(true);
    expect(values(stepTitled(wrapper, "Realm anlegen"))).toEqual([
      { text: "‹Realm›", copy: false },
      { text: "‹Keycloak-URL›/realms/‹Realm›", copy: false },
    ]);
    expect(values(stepTitled(wrapper, "Web-Client anlegen"))[0]).toEqual({
      text: "‹Client-ID des Web-Clients›",
      copy: false,
    });
    expect(settings(stepTitled(wrapper, "Audience-Mapper anlegen"))).toEqual(
      expect.arrayContaining([
        "Client scope ‹Client-ID des Web-Clients›-dedicated",
        "Included Client Audience ‹Client-ID des API-Clients›",
      ])
    );
    expect(values(stepTitled(wrapper, "API-Client anlegen"))[0]).toEqual({
      text: "‹Client-ID des API-Clients›",
      copy: false,
    });
  });

  it("keeps the steps folded once SSO is set up", () => {
    const wrapper = mountTab();

    expect(
      steps(wrapper).some((step) => step.classes("v-expansion-panel--active"))
    ).toBe(false);
  });
});

const ADDRESSES = "Rücksprungadressen und Web Origins eintragen";

/**
 * The Adressen of the step as they read: per Adresse the app and per field
 * of the Web-Client its entries.
 */
function addresses(step) {
  return step.findAll("[data-test='guide-address']").wrappers.map((address) => {
    const fields = {};
    address
      .findAll("[data-test='guide-address-field']")
      .wrappers.forEach((field) => {
        fields[field.find("[data-test='guide-setting-name']").text()] = field
          .findAll("[data-test='guide-value'] code")
          .wrappers.map((value) => value.text());
      });
    return {
      app: address.find("[data-test='guide-address-app']").text(),
      fields,
    };
  });
}

/** Mounts the tab and lets the BFF's answer arrive. */
async function mountAnswered(propsData = {}) {
  const wrapper = mountTab(propsData);
  await flushPromises();
  await settle(wrapper);
  return wrapper;
}

describe("InstanceEditSingleSignOn Rücksprungadressen in direct mode", () => {
  it("lists the Admin UI's entries from the sign-in and the Storefront's from the Portal-URL", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, ADDRESSES);

    expect(addresses(step)).toEqual([
      {
        app: "Admin UI",
        fields: {
          "Valid redirect URIs": [
            `${ORIGIN}/admin/login/sso`,
            `${ORIGIN}/admin/silent-check-sso.html`,
          ],
          "Valid post logout redirect URIs": [
            `${ORIGIN}/admin/`,
            `${ORIGIN}/admin/login/sso*`,
          ],
          "Web origins": [ORIGIN],
        },
      },
      {
        app: "Storefront",
        fields: {
          "Valid redirect URIs": [
            "https://portal.example.de/api/auth/sso/callback",
          ],
          "Valid post logout redirect URIs": [
            "https://portal.example.de/api/auth/sso/login*",
          ],
          "Web origins": ["https://portal.example.de"],
        },
      },
    ]);
  });

  it("marks only the entry for „Benutzer wechseln“ with * and no Web origin with +", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, ADDRESSES);
    const entries = addresses(step).flatMap((address) =>
      Object.values(address.fields).flat()
    );

    expect(entries.filter((entry) => entry.includes("*"))).toEqual([
      `${ORIGIN}/admin/login/sso*`,
      "https://portal.example.de/api/auth/sso/login*",
    ]);
    expect(entries.some((entry) => entry.includes("+"))).toBe(false);
    expect(values(step).every((value) => value.copy)).toBe(true);
  });

  it("does not ask the BFF for its Adressen", async () => {
    await mountAnswered();

    expect(ApiAuthService.getSsoAddresses).not.toHaveBeenCalled();
  });

  it("says that every further domain of the Admin UI needs the same entries", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, ADDRESSES);

    expect(step.text()).toContain("weitere Domain");
    expect(step.text()).toContain("dieselben Einträge");
  });

  it("knows the Adressen before anything is set up", () => {
    const wrapper = mountTab({
      instance: instance({ applications: [emptyKeycloak()] }),
    });

    const entries = addresses(stepTitled(wrapper, ADDRESSES));
    expect(entries.map((address) => address.fields["Web origins"])).toEqual([
      [ORIGIN],
      ["https://portal.example.de"],
    ]);
  });
});

function hints(wrapper) {
  return wrapper
    .findAll("[data-test='guide-hint']")
    .wrappers.map((hint) => hint.text());
}

describe("InstanceEditSingleSignOn Portal-URL", () => {
  it("names the Portal-URL in its step, for the Storefront to be reachable under it", async () => {
    const wrapper = mountTab();

    const step = await openStep(wrapper, "Portal-URL prüfen");

    expect(settings(step)).toEqual([
      "Portal-URL https://portal.example.de/start",
    ]);
    expect(values(step)).toEqual([
      { text: "https://portal.example.de/start", copy: true },
    ]);
    expect(step.text()).toContain("Storefront");
    expect(step.text()).toContain("erreichbar");
    expect(hints(wrapper)).toEqual([]);
  });

  it("asks to set the Portal-URL above the checklist and shows no values for the Storefront without it", async () => {
    const wrapper = mountTab({ instance: instance({ portalUrl: "" }) });

    expect(hints(wrapper)).toHaveLength(1);
    expect(hints(wrapper)[0]).toContain("Portal-URL");
    expect(hints(wrapper)[0]).toContain("Tab „Portal“");

    const step = await openStep(wrapper, ADDRESSES);
    expect(addresses(step).map((address) => address.app)).toEqual(["Admin UI"]);
    expect(step.text()).toContain(
      "Ohne Portal-URL keine Werte für die Storefront"
    );
    expect(step.text()).not.toContain("/api/auth/sso/");

    const portal = await openStep(wrapper, "Portal-URL prüfen");
    expect(values(portal)).toEqual([]);
    expect(portal.text()).toContain("Tab „Portal“");
  });
});

describe("InstanceEditSingleSignOn Rücksprungadressen in BFF mode without an answer of the BFF", () => {
  beforeEach(() => {
    auth.mode = "bff";
    ApiAuthService.getSsoAddresses.mockRejectedValue(serverError(502));
  });

  it("says above the checklist that the list may be incomplete", async () => {
    const wrapper = await mountAnswered();

    expect(hints(wrapper)).toHaveLength(1);
    expect(hints(wrapper)[0]).toContain("vielleicht unvollständig");
  });

  it("names the own Adresse with its Rücksprungadressen as placeholders", async () => {
    const wrapper = await mountAnswered();

    const step = await openStep(wrapper, ADDRESSES);
    const [adminUi, storefront] = addresses(step);

    expect(adminUi).toEqual({
      app: "Admin UI",
      fields: {
        "Valid redirect URIs": [
          "‹Rücksprungadresse des BFF nach der Anmeldung›",
        ],
        "Valid post logout redirect URIs": [
          "‹Rücksprungadresse des BFF nach der Abmeldung›",
          "‹Rücksprungadresse des BFF für „Benutzer wechseln“›",
        ],
        "Web origins": [ORIGIN],
      },
    });
    expect(storefront.fields["Web origins"]).toEqual([
      "https://portal.example.de",
    ]);
    expect(step.text()).not.toContain("/login/sso");
    expect(step.text()).not.toContain("weitere Domain");

    const adminValues = values(step.find("[data-test='guide-address']"));
    expect(adminValues.filter((value) => value.copy)).toEqual([
      { text: ORIGIN, copy: true },
    ]);
  });
});

describe("InstanceEditSingleSignOn Rücksprungadressen in BFF mode with the BFF's Adressen", () => {
  beforeEach(() => {
    auth.mode = "bff";
  });

  it("lists every Adresse of the allowlist with the Rücksprungadressen the BFF names", async () => {
    ApiAuthService.getSsoAddresses.mockResolvedValue(
      bffAnswer([ORIGIN, SECOND])
    );
    const wrapper = await mountAnswered();

    const step = await openStep(wrapper, ADDRESSES);

    expect(addresses(step)).toEqual([
      {
        app: "Admin UI",
        fields: {
          "Valid redirect URIs": [`${ORIGIN}/admin/api/auth/sso/callback`],
          "Valid post logout redirect URIs": [
            `${ORIGIN}/admin/login`,
            `${ORIGIN}/admin/api/auth/sso/login*`,
          ],
          "Web origins": [ORIGIN],
        },
      },
      {
        app: "Admin UI",
        fields: {
          "Valid redirect URIs": [
            "https://booking.example.de/admin/api/auth/sso/callback",
          ],
          "Valid post logout redirect URIs": [
            "https://booking.example.de/admin/login",
            "https://booking.example.de/admin/api/auth/sso/login*",
          ],
          "Web origins": ["https://booking.example.de"],
        },
      },
      {
        app: "Storefront",
        fields: {
          "Valid redirect URIs": [
            "https://portal.example.de/api/auth/sso/callback",
          ],
          "Valid post logout redirect URIs": [
            "https://portal.example.de/api/auth/sso/login*",
          ],
          "Web origins": ["https://portal.example.de"],
        },
      },
    ]);
    expect(values(step).every((value) => value.copy)).toBe(true);
    expect(hints(wrapper)).toEqual([]);
    expect(ApiAuthService.getSsoAddresses).toHaveBeenCalledTimes(1);
  });

  it("says above the checklist that the BFF accepts every Adresse with an empty allowlist, and names only the own one", async () => {
    ApiAuthService.getSsoAddresses.mockResolvedValue(
      bffAnswer([ORIGIN], "empty")
    );
    const wrapper = await mountAnswered();

    expect(hints(wrapper)).toHaveLength(1);
    expect(hints(wrapper)[0]).toContain("Allowlist des BFF ist leer");
    expect(hints(wrapper)[0]).toContain("jede Adresse an");

    const step = await openStep(wrapper, ADDRESSES);
    const [adminUi, ...others] = addresses(step);
    expect(adminUi.fields).toEqual({
      "Valid redirect URIs": [`${ORIGIN}/admin/api/auth/sso/callback`],
      "Valid post logout redirect URIs": [
        `${ORIGIN}/admin/login`,
        `${ORIGIN}/admin/api/auth/sso/login*`,
      ],
      "Web origins": [ORIGIN],
    });
    expect(others.map((address) => address.app)).toEqual(["Storefront"]);
  });

  it("names the own Adresse with placeholders and no hint while the answer is on its way", async () => {
    ApiAuthService.getSsoAddresses.mockReturnValue(new Promise(() => {}));
    const wrapper = await mountAnswered();

    expect(hints(wrapper)).toEqual([]);
    const step = await openStep(wrapper, ADDRESSES);
    expect(addresses(step)[0].fields).toEqual({
      "Valid redirect URIs": ["‹Rücksprungadresse des BFF nach der Anmeldung›"],
      "Valid post logout redirect URIs": [
        "‹Rücksprungadresse des BFF nach der Abmeldung›",
        "‹Rücksprungadresse des BFF für „Benutzer wechseln“›",
      ],
      "Web origins": [ORIGIN],
    });
  });

  it("warns above the checklist that SSO sign-in fails here when the own Adresse is missing from the allowlist", async () => {
    ApiAuthService.getSsoAddresses.mockResolvedValue(bffAnswer([SECOND]));
    const wrapper = await mountAnswered();

    expect(hints(wrapper)).toHaveLength(1);
    expect(hints(wrapper)[0]).toContain(ORIGIN);
    expect(hints(wrapper)[0]).toContain("fehlt in der Allowlist des BFF");
    expect(hints(wrapper)[0]).toContain("SSO-Anmeldung von hier scheitert");

    const step = await openStep(wrapper, ADDRESSES);
    expect(
      addresses(step).map((address) => address.fields["Web origins"])
    ).toEqual([["https://booking.example.de"], ["https://portal.example.de"]]);
  });
});

describe("InstanceEditSingleSignOn Client-Rollen", () => {
  const ROLES = "Client-Rollen zuordnen";

  it("lists each Keycloak role of the role mapping once, to copy", async () => {
    const wrapper = mountTab({
      instance: withRoleMapping([
        { tenantId: "t1", keycloakRole: "raumverwaltung", tenantRoleId: "r1" },
        { tenantId: "t2", keycloakRole: "sportstaetten", tenantRoleId: "r2" },
        { tenantId: "t3", keycloakRole: "raumverwaltung", tenantRoleId: "r3" },
        { tenantId: "t4", keycloakRole: "", tenantRoleId: null },
      ]),
    });

    const step = await openStep(wrapper, ROLES);

    expect(
      step
        .findAll("[data-test='guide-role'] [data-test='guide-value']")
        .wrappers.map((value) => ({
          text: value.text(),
          copy: value.find("button").exists(),
        }))
    ).toEqual([
      { text: "raumverwaltung", copy: true },
      { text: "sportstaetten", copy: true },
    ]);
    expect(step.text()).toContain("biletado-web");
    expect(settings(step)).toContain("Full scope allowed Off");
  });

  it("warns that the mapping applies only at SSO sign-in and removes roles granted by hand", async () => {
    const wrapper = mountTab({
      instance: withRoleMapping([
        { tenantId: "t1", keycloakRole: "raumverwaltung", tenantRoleId: "r1" },
      ]),
    });

    const step = await openStep(wrapper, ROLES);
    const warning = step.find("[data-test='guide-step-warning']").text();

    expect(warning).toContain("nur bei der SSO-Anmeldung");
    expect(warning).toContain("von Hand vergebene Rollen");
  });

  it("says that the role mapping names no Keycloak role yet", async () => {
    const wrapper = mountTab({ instance: withRoleMapping([]) });

    const step = await openStep(wrapper, ROLES);

    expect(step.findAll("[data-test='guide-role']")).toHaveLength(0);
    expect(step.text()).toContain("noch keine Keycloak-Rolle");
  });

  it("leaves the step out while the role mapping is off, even with roles", () => {
    const wrapper = mountTab({
      instance: instance({
        applications: [
          keycloak({
            roleMapping: {
              active: false,
              roles: [
                {
                  tenantId: "t1",
                  keycloakRole: "raumverwaltung",
                  tenantRoleId: "r1",
                },
              ],
            },
          }),
        ],
      }),
    });

    expect(stepTitled(wrapper, ROLES)).toBeUndefined();
  });
});
