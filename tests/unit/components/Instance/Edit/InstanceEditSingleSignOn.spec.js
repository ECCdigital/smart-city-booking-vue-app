import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  serverError,
  validationError,
} from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

const auth = vi.hoisted(() => ({ mode: "direct" }));

vi.mock("@/services/auth/authMode", () => ({
  getAuthMode: () => auth.mode,
  isBffAuthMode: () => auth.mode === "bff",
}));
vi.mock("@/services/api/ApiAuthService", () => ({
  default: { getSsoAddresses: vi.fn() },
}));
vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { checkKeycloakRealm: vi.fn() },
}));

import ApiAuthService from "@/services/api/ApiAuthService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
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
  ApiInstanceService.checkKeycloakRealm.mockReset();
  ApiInstanceService.checkKeycloakRealm.mockResolvedValue(checkAnswer([]));
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

  it("asks to correct a Portal-URL that is no full Adresse, instead of calling it empty, and shows no values for the Storefront", async () => {
    const wrapper = mountTab({
      instance: instance({ portalUrl: "portal.example.de/start" }),
    });

    expect(hints(wrapper)).toEqual([
      "Die Portal-URL ist keine vollständige Adresse mit http:// oder https://. Korrigieren Sie sie im Tab „Portal“, dann nennt die Anleitung auch die Rücksprungadressen der Storefront.",
    ]);

    const step = await openStep(wrapper, ADDRESSES);
    expect(addresses(step).map((address) => address.app)).toEqual(["Admin UI"]);
    expect(step.text()).not.toContain("/api/auth/sso/");
    expect(step.text()).not.toContain("ist leer");

    const portal = await openStep(wrapper, "Portal-URL prüfen");
    expect(values(portal)).toEqual([]);
    expect(portal.text()).toContain(
      "Die Portal-URL ist keine vollständige Adresse mit http:// oder https://. Korrigieren Sie sie im Tab „Portal“."
    );
    expect(portal.text()).not.toContain("ist leer");
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

/** The tab with the toasts of the app, for what copying says. */
function mountTabWithToasts(propsData = {}) {
  const store = new Vuex.Store({ modules: { toasts } });
  const wrapper = mountComponent(InstanceEditSingleSignOn, {
    store,
    propsData: { instance: instance(), ...propsData },
  });
  return Object.assign(wrapper, { store });
}

function toastMessages(wrapper) {
  return wrapper.store.getters["toasts/all"].map((toast) => toast.message);
}

/**
 * Opens „Als Text“ in the status card, clicks an entry of the menu and hands
 * back what it toasted (the toasts module keeps its state across stores).
 */
async function copyAsText(wrapper, entry) {
  const before = toastMessages(wrapper).length;
  await statusCard(wrapper)
    .find("[data-test='sso-text-menu']")
    .trigger("click");
  await settle(wrapper);
  const menus = document.querySelectorAll(".sso-text-menu");
  const item = Array.from(
    menus[menus.length - 1].querySelectorAll(".v-list-item")
  ).find((candidate) => candidate.textContent.trim() === entry);
  item.click();
  await flushPromises();
  await settle(wrapper);
  return toastMessages(wrapper).slice(before);
}

/** The lines of the text that open a step: „<number>. <title>“. */
function stepLines(text) {
  return text.split("\n").filter((line) => /^\d+\. /.test(line));
}

describe("InstanceEditSingleSignOn Anleitung als Text", () => {
  let writeText;

  beforeEach(() => {
    writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  /** What „Anleitung kopieren“ put into the clipboard. */
  async function copiedGuide(wrapper) {
    await copyAsText(wrapper, "Anleitung kopieren");
    expect(writeText).toHaveBeenCalledTimes(1);
    return writeText.mock.calls[0][0];
  }

  it("copies a header with instance, mode, Keycloak versions, Keycloak-URL, Realm and Issuer, then the numbered steps", async () => {
    const wrapper = mountTabWithToasts();

    const text = await copiedGuide(wrapper);

    expect(text.split("\n").slice(0, 9)).toEqual([
      "Keycloak-Realm für Biletado einrichten",
      `Instanz: ${ORIGIN}`,
      "Modus: direct",
      "Für Keycloak 26.x ab 26.7.3, empfohlen 26.8.x.",
      "",
      "Keycloak-URL: https://sso.example.de",
      "Realm: biletado",
      "Issuer: https://sso.example.de/realms/biletado",
      "",
    ]);
    expect(stepLines(text)).toEqual([
      "1. Realm anlegen",
      "2. Web-Client anlegen",
      "3. Rücksprungadressen und Web Origins eintragen",
      "4. Audience-Mapper anlegen",
      "5. API-Client anlegen",
      "6. Portal-URL prüfen",
    ]);
  });

  it("says in a toast that the Anleitung is in the clipboard", async () => {
    const wrapper = mountTabWithToasts();

    const toasted = await copyAsText(wrapper, "Anleitung kopieren");

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(toasted).toEqual([
      "Die Anleitung liegt als Text in der Zwischenablage.",
    ]);
  });

  it("lists every step's settings as „Name: Wert“ with its notes", async () => {
    const wrapper = mountTabWithToasts();

    const text = await copiedGuide(wrapper);

    expect(text).toContain(
      [
        "1. Realm anlegen",
        "   Realm name: biletado",
        "   Issuer: https://sso.example.de/realms/biletado",
        "   Für Keycloak 26.x ab 26.7.3, empfohlen 26.8.x.",
        "",
        "2. Web-Client anlegen",
        "   Client ID: biletado-web",
        "   Client authentication: Off",
        "   Standard flow: On",
        "   Direct access grants: Off",
        "   Implicit flow: Off",
        "   Service accounts roles: Off",
        "   PKCE Method: S256",
        "",
      ].join("\n")
    );
    expect(text).toContain(
      [
        "4. Audience-Mapper anlegen",
        "   Client scope: biletado-web-dedicated",
        "   Mapper type: Audience",
        "   Included Client Audience: biletado-api",
        "   Add to access token: On",
        "   Add to ID token: Off",
        "   Melden Sie sich danach neu an, damit Ihr Token den API-Client als Audience trägt.",
        "",
      ].join("\n")
    );
    expect(text).toContain(
      [
        "   Valid redirect URIs: keine",
        "   Web origins: keine",
        "   Das Client Secret des API-Clients kommt unter „Verbindung zu Keycloak“ ins Feld „Client Secret“.",
        "",
        "6. Portal-URL prüfen",
        "   Portal-URL: https://portal.example.de/start",
        "   Die Storefront muss unter der Portal-URL erreichbar sein und sie als eigene Adresse kennen.",
      ].join("\n")
    );
    expect(text.endsWith("kennen.")).toBe(true);
  });

  it("lists the Rücksprungadressen and Web origins per Adresse of Admin UI and Storefront", async () => {
    const wrapper = mountTabWithToasts();

    const text = await copiedGuide(wrapper);

    expect(text).toContain(
      [
        "3. Rücksprungadressen und Web Origins eintragen",
        `   Admin UI: ${ORIGIN}`,
        "     Valid redirect URIs:",
        `       ${ORIGIN}/admin/login/sso`,
        `       ${ORIGIN}/admin/silent-check-sso.html`,
        "     Valid post logout redirect URIs:",
        `       ${ORIGIN}/admin/`,
        `       ${ORIGIN}/admin/login/sso*  („Benutzer wechseln“)`,
        "     Web origins:",
        `       ${ORIGIN}`,
        "   Jede weitere Domain des Admin UI braucht dieselben Einträge, mit ihrer eigenen Adresse.",
        "   Storefront: https://portal.example.de",
        "     Valid redirect URIs:",
        "       https://portal.example.de/api/auth/sso/callback",
        "     Valid post logout redirect URIs:",
        "       https://portal.example.de/api/auth/sso/login*  („Benutzer wechseln“)",
        "     Web origins:",
        "       https://portal.example.de",
        "   Am Web-Client biletado-web, je Eintrag eine Zeile. Jede Rücksprungadresse gilt genau so; nur die für „Benutzer wechseln“ endet mit *. Web origins sind die genauen Adressen, ohne +.",
        "",
        "4. Audience-Mapper anlegen",
      ].join("\n")
    );
  });

  it("follows the role mapping: the step „Client-Rollen zuordnen“ with the roles and the warning", async () => {
    const wrapper = mountTabWithToasts({
      instance: withRoleMapping([
        { tenantId: "t1", keycloakRole: "raumverwaltung", tenantRoleId: "r1" },
        { tenantId: "t2", keycloakRole: "sportstaetten", tenantRoleId: "r2" },
      ]),
    });

    const text = await copiedGuide(wrapper);

    expect(stepLines(text).slice(-2)).toEqual([
      "6. Client-Rollen zuordnen",
      "7. Portal-URL prüfen",
    ]);
    expect(text).toContain(
      [
        "6. Client-Rollen zuordnen",
        "   Achtung: Die Rollenzuordnung greift nur bei der SSO-Anmeldung. Dabei entfernt sie auch von Hand vergebene Rollen.",
        "   Keycloak-Rollen der Rollenzuordnung:",
        "     raumverwaltung",
        "     sportstaetten",
        "   Full scope allowed: Off",
        "   Legen Sie diese Keycloak-Rollen als Client-Rollen am Web-Client biletado-web an und weisen Sie sie den Personen zu.",
        "   Der Client scope „roles“ mit dem Mapper für Client-Rollen bleibt Default. Ordnen Sie die Client-Rollen gezielt als Scope zu, statt Full scope allowed einzuschalten.",
        "",
        "7. Portal-URL prüfen",
      ].join("\n")
    );
  });

  it("follows the mode BFF without the BFF's answer: the hint above the steps and the BFF's Rücksprungadressen as placeholders", async () => {
    auth.mode = "bff";
    ApiAuthService.getSsoAddresses.mockRejectedValue(serverError(502));
    const wrapper = mountTabWithToasts();
    await flushPromises();

    const text = await copiedGuide(wrapper);

    expect(text).toContain("Modus: BFF");
    expect(text).toContain(
      [
        "Hinweise",
        "- Der BFF hat seine Adressen nicht genannt, die Liste ist vielleicht unvollständig. Die Anleitung nennt nur die Adresse, unter der Sie gerade arbeiten, und ihre Rücksprungadressen als Platzhalter: Nur der BFF kennt seine Pfade.",
        "",
        "1. Realm anlegen",
      ].join("\n")
    );
    expect(text).toContain(
      [
        `   Admin UI: ${ORIGIN}`,
        "     Valid redirect URIs:",
        "       ‹Rücksprungadresse des BFF nach der Anmeldung›",
        "     Valid post logout redirect URIs:",
        "       ‹Rücksprungadresse des BFF nach der Abmeldung›",
        "       ‹Rücksprungadresse des BFF für „Benutzer wechseln“›  („Benutzer wechseln“)",
        "     Web origins:",
        `       ${ORIGIN}`,
        "   Storefront: https://portal.example.de",
      ].join("\n")
    );
  });

  it("toasts the failure and no success when the clipboard refuses", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const wrapper = mountTabWithToasts();

    const toasted = await copyAsText(wrapper, "Anleitung kopieren");

    expect(toasted).toEqual([
      "Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
    ]);
  });

  it("never contains the Client Secret", async () => {
    const wrapper = mountTabWithToasts({
      instance: instance({
        applications: [
          keycloak({
            privateClientSecret: "s3cr3t-9f2c",
            roleMapping: {
              active: true,
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

    const text = await copiedGuide(wrapper);

    expect(text).toContain("Client Secret");
    expect(text).not.toContain("s3cr3t-9f2c");
  });

  it("puts placeholders for the missing values and the hints above the steps", async () => {
    const wrapper = mountTabWithToasts({
      instance: instance({ portalUrl: "", applications: [emptyKeycloak()] }),
    });

    const text = await copiedGuide(wrapper);

    expect(text).toContain(
      [
        "Keycloak-URL: ‹Keycloak-URL›",
        "Realm: ‹Realm›",
        "Issuer: ‹Keycloak-URL›/realms/‹Realm›",
        "",
        "Hinweise",
        "- Die Portal-URL ist leer. Setzen Sie sie im Tab „Portal“, dann nennt die Anleitung auch die Rücksprungadressen der Storefront.",
        "",
        "1. Realm anlegen",
        "   Realm name: ‹Realm›",
        "   Issuer: ‹Keycloak-URL›/realms/‹Realm›",
      ].join("\n")
    );
    expect(text).toContain("   Client ID: ‹Client-ID des Web-Clients›");
    expect(text).toContain(
      "   Client scope: ‹Client-ID des Web-Clients›-dedicated"
    );
    expect(text).toContain(
      "   Included Client Audience: ‹Client-ID des API-Clients›"
    );
    expect(text).toContain("   Client ID: ‹Client-ID des API-Clients›");
    expect(text).toContain(
      [
        `       ${ORIGIN}`,
        "   Jede weitere Domain des Admin UI braucht dieselben Einträge, mit ihrer eigenen Adresse.",
        "   Storefront",
        "   Ohne Portal-URL keine Werte für die Storefront.",
      ].join("\n")
    );
    expect(text).not.toContain("/api/auth/sso/");
    expect(text).toContain(
      [
        "6. Portal-URL prüfen",
        "   Die Portal-URL ist leer. Setzen Sie sie im Tab „Portal“.",
      ].join("\n")
    );
  });
});

/**
 * The moment of the check, built in local time so the time it reads as does
 * not depend on the time zone the spec runs in.
 */
const CHECKED_AT = new Date(2026, 9, 1, 14, 3, 12).toISOString();

/** The backend's answer to „Realm prüfen“ (`POST api/instances/keycloak/check`). */
function checkAnswer(rows) {
  return { checkedAt: CHECKED_AT, rows };
}

function checkButton(wrapper) {
  return statusCard(wrapper).find("[data-test='sso-check']");
}

/** Clicks „Realm prüfen“ and lets the answer arrive. */
async function runCheck(wrapper) {
  await checkButton(wrapper).trigger("click");
  await flushPromises();
  await settle(wrapper);
}

/** What „Realm prüfen“ sent: the body of `POST api/instances/keycloak/check`. */
function sentBody() {
  expect(ApiInstanceService.checkKeycloakRealm).toHaveBeenCalledTimes(1);
  return ApiInstanceService.checkKeycloakRealm.mock.calls[0][0];
}

const STOREFRONT_APP = {
  app: "storefront",
  origin: "https://portal.example.de",
  redirectUris: ["https://portal.example.de/api/auth/sso/callback"],
  postLogoutRedirectUris: ["https://portal.example.de/api/auth/sso/login*"],
};

describe("InstanceEditSingleSignOn „Realm prüfen“ request", () => {
  it("sends the mode direct and the Rücksprungadressen the Anleitung shows, with * on „Benutzer wechseln“", async () => {
    const wrapper = mountTab();

    await runCheck(wrapper);

    expect(checkButton(wrapper).text()).toBe("Realm prüfen");
    expect(sentBody()).toEqual({
      mode: "direct",
      apps: [
        {
          app: "adminUi",
          origin: ORIGIN,
          redirectUris: [
            `${ORIGIN}/admin/login/sso`,
            `${ORIGIN}/admin/silent-check-sso.html`,
          ],
          postLogoutRedirectUris: [
            `${ORIGIN}/admin/`,
            `${ORIGIN}/admin/login/sso*`,
          ],
        },
        STOREFRONT_APP,
      ],
    });
  });
});

/** The state a step shows after the check, or `null` while it shows its number. */
function stepState(step) {
  const state = step.find("[data-test='guide-step-state']");
  return state.exists() ? state.text() : null;
}

function isOpen(step) {
  return step.classes("v-expansion-panel--active");
}

/**
 * The results of the check in an open step as they read: per result its
 * title, state and reason, or per part its label, state and reason.
 */
function checkRows(step) {
  const text = (wrapper, test) => {
    const found = wrapper.find(`[data-test='${test}']`);
    return found.exists() ? found.text() : null;
  };
  return step.findAll("[data-test='check-row']").wrappers.map((row) => ({
    title: text(row, "check-row-title"),
    status: text(row, "check-row-status"),
    sentence: text(row, "check-row-sentence"),
    parts: row.findAll("[data-test='check-part']").wrappers.map((part) => ({
      label: text(part, "check-part-label"),
      status: text(part, "check-part-status"),
      sentence: text(part, "check-part-sentence"),
    })),
  }));
}

/** Mounts the tab and runs „Realm prüfen“ with the given rows as answer. */
async function checked(rows, propsData = {}) {
  ApiInstanceService.checkKeycloakRealm.mockResolvedValue(checkAnswer(rows));
  const wrapper = mountTab(propsData);
  await runCheck(wrapper);
  return wrapper;
}

const ISSUER = "https://sso.example.de/realms/biletado";

describe("InstanceEditSingleSignOn „Realm prüfen“ result for „Realm anlegen“", () => {
  it("shows erfüllt instead of the number with the Issuer the realm names, and leaves the step folded", async () => {
    const wrapper = await checked([
      {
        id: 1,
        status: "ok",
        reason: "issuer_matches",
        details: { issuer: ISSUER },
      },
    ]);

    const step = stepTitled(wrapper, "Realm anlegen");
    expect(stepState(step)).toBe("erfüllt");
    expect(step.find("[data-test='guide-step-number']").exists()).toBe(false);
    expect(isOpen(step)).toBe(false);

    expect(checkRows(await openStep(wrapper, "Realm anlegen"))).toEqual([
      {
        title: "Realm und Issuer",
        status: "erfüllt",
        sentence: `Der Realm antwortet mit dem Issuer ${ISSUER}.`,
        parts: [],
      },
    ]);
  });

  it("shows nicht erfüllt and opens the step when the realm names another Issuer, with both values", async () => {
    const actual = "https://login.example.de/realms/biletado";
    const wrapper = await checked([
      {
        id: 1,
        status: "fail",
        reason: "issuer_mismatch",
        details: { expected: ISSUER, actual },
      },
    ]);

    const step = stepTitled(wrapper, "Realm anlegen");
    expect(stepState(step)).toBe("nicht erfüllt");
    expect(isOpen(step)).toBe(true);
    const [row] = checkRows(step);
    expect(row.status).toBe("nicht erfüllt");
    expect(row.sentence).toContain(`Der Realm nennt den Issuer ${actual}`);
    expect(row.sentence).toContain(`erwartet ist ${ISSUER}`);
  });

  it("names the realm as unknown to Keycloak with status and URL", async () => {
    const url = `${ISSUER}/.well-known/openid-configuration`;
    const wrapper = await checked([
      {
        id: 1,
        status: "fail",
        reason: "realm_not_found",
        details: { httpStatus: 404, url },
      },
    ]);

    const [row] = checkRows(stepTitled(wrapper, "Realm anlegen"));
    expect(row.sentence).toContain("Keycloak kennt den Realm nicht");
    expect(row.sentence).toContain("HTTP 404");
    expect(row.sentence).toContain(url);
    expect(row.sentence).toContain("Keycloak-URL oder Realm");
  });

  it.each([
    [
      "timeout",
      { url: "https://sso.example.de/realms/biletado" },
      ["5 Sekunden", "https://sso.example.de/realms/biletado"],
    ],
    [
      "unreachable",
      { url: "https://sso.example.de/realms/biletado", code: "ECONNREFUSED" },
      ["nicht erreichbar", "ECONNREFUSED"],
    ],
    [
      "unexpected_response",
      { httpStatus: 502, error: "bad_gateway" },
      ["Unerwartete Antwort", "HTTP 502", "bad_gateway"],
    ],
  ])(
    "shows nicht prüfbar for %s, naming what came back",
    async (reason, details, says) => {
      const wrapper = await checked([{ id: 1, status: "na", reason, details }]);

      const step = stepTitled(wrapper, "Realm anlegen");
      expect(stepState(step)).toBe("nicht prüfbar");
      expect(isOpen(step)).toBe(true);
      const [row] = checkRows(step);
      expect(row.status).toBe("nicht prüfbar");
      says.forEach((part) => expect(row.sentence).toContain(part));
    }
  );
});

function lockReason(wrapper) {
  const lock = statusCard(wrapper).find("[data-test='sso-check-lock']");
  return lock.exists() ? lock.text() : null;
}

function isDisabled(button) {
  return button.attributes("disabled") === "disabled";
}

describe("InstanceEditSingleSignOn „Realm prüfen“ lock", () => {
  it("is open once every value is set and saved", () => {
    const wrapper = mountTab();

    expect(isDisabled(checkButton(wrapper))).toBe(false);
    expect(lockReason(wrapper)).toBeNull();
  });

  it("is locked while values are missing, naming them in the order of the form", async () => {
    const wrapper = mountTab({
      instance: instance({ applications: [emptyKeycloak()] }),
    });

    expect(isDisabled(checkButton(wrapper))).toBe(true);
    expect(lockReason(wrapper)).toContain(
      "Keycloak-URL, Realm, Web-Client, API-Client und Client Secret"
    );

    await checkButton(wrapper).trigger("click");
    await flushPromises();
    expect(ApiInstanceService.checkKeycloakRealm).not.toHaveBeenCalled();
  });

  it("names only the Client Secret when it is the one value missing", () => {
    const wrapper = mountTab({
      instance: instance({
        applications: [keycloak({ privateClientSecret: "" })],
      }),
    });

    expect(isDisabled(checkButton(wrapper))).toBe(true);
    expect(lockReason(wrapper)).toContain("Client Secret");
    expect(lockReason(wrapper)).not.toContain("Realm,");
  });

  it("is locked while the form has unsaved changes, because the check reads the saved values", () => {
    const wrapper = mountTab({ hasUnsavedChanges: true });

    expect(isDisabled(checkButton(wrapper))).toBe(true);
    expect(lockReason(wrapper)).toContain("Speichern Sie zuerst");
    expect(lockReason(wrapper)).toContain("gespeicherten Werte");
  });

  it("is locked in BFF mode until the BFF has named its Adressen, so none is left out of the check", async () => {
    auth.mode = "bff";
    let answer;
    ApiAuthService.getSsoAddresses.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    const wrapper = await mountAnswered();

    expect(isDisabled(checkButton(wrapper))).toBe(true);
    expect(lockReason(wrapper)).toBe(
      "Die Adressen des BFF werden noch geladen."
    );
    await checkButton(wrapper).trigger("click");
    await flushPromises();
    expect(ApiInstanceService.checkKeycloakRealm).not.toHaveBeenCalled();

    answer(bffAnswer([ORIGIN]));
    await flushPromises();
    await settle(wrapper);

    expect(isDisabled(checkButton(wrapper))).toBe(false);
    expect(lockReason(wrapper)).toBeNull();
  });
});

/** The entry of the body for an Adresse the BFF names, see `bffAnswer`. */
function bffApp(origin) {
  return {
    app: "adminUi",
    origin,
    redirectUris: [`${origin}/admin/api/auth/sso/callback`],
    postLogoutRedirectUris: [
      `${origin}/admin/login`,
      `${origin}/admin/api/auth/sso/login*`,
    ],
  };
}

describe("InstanceEditSingleSignOn „Realm prüfen“ request in BFF mode", () => {
  beforeEach(() => {
    auth.mode = "bff";
  });

  it("sends one entry per Adresse the BFF names, then the Storefront", async () => {
    ApiAuthService.getSsoAddresses.mockResolvedValue(
      bffAnswer([ORIGIN, SECOND])
    );
    const wrapper = await mountAnswered();

    await runCheck(wrapper);

    expect(sentBody()).toEqual({
      mode: "bff",
      apps: [bffApp(ORIGIN), bffApp(SECOND), STOREFRONT_APP],
    });
  });

  it("does not send the own Adresse while the BFF has not named its Rücksprungadressen, and shows it as nicht prüfbar", async () => {
    ApiAuthService.getSsoAddresses.mockRejectedValue(serverError(502));
    ApiInstanceService.checkKeycloakRealm.mockResolvedValue(
      checkAnswer([
        {
          id: 1,
          status: "ok",
          reason: "issuer_matches",
          details: { issuer: ISSUER },
        },
        {
          id: 4,
          status: "ok",
          reason: "redirect_uri_accepted",
          parts: [
            {
              label: "https://portal.example.de/api/auth/sso/callback",
              status: "ok",
              reason: "redirect_uri_accepted",
            },
          ],
        },
      ])
    );
    const wrapper = await mountAnswered();

    await runCheck(wrapper);

    expect(sentBody()).toEqual({ mode: "bff", apps: [STOREFRONT_APP] });
    const step = stepTitled(wrapper, ADDRESSES);
    expect(stepState(step)).toBe("nicht prüfbar");
    expect(isOpen(step)).toBe(true);
    const unknown = checkRows(step).find(
      (row) => row.title === "Rücksprungadressen des Admin UI"
    );
    expect(unknown.status).toBe("nicht prüfbar");
    expect(unknown.sentence).toContain(ORIGIN);
    expect(unknown.sentence).toContain("BFF");
  });

  it("shows only the Adressen nobody could check when the answer has no row for them", async () => {
    ApiAuthService.getSsoAddresses.mockRejectedValue(serverError(502));
    ApiInstanceService.checkKeycloakRealm.mockResolvedValue(
      checkAnswer([
        {
          id: 1,
          status: "ok",
          reason: "issuer_matches",
          details: { issuer: ISSUER },
        },
      ])
    );
    const wrapper = await mountAnswered({
      instance: instance({ portalUrl: "" }),
    });

    await runCheck(wrapper);

    expect(sentBody()).toEqual({ mode: "bff", apps: [] });
    const step = stepTitled(wrapper, ADDRESSES);
    expect(stepState(step)).toBe("nicht prüfbar");
    expect(checkRows(step).map((row) => row.title)).toEqual([
      "Rücksprungadressen des Admin UI",
    ]);
  });
});

describe("InstanceEditSingleSignOn „Realm prüfen“ request without Portal-URL", () => {
  it("sends no Storefront", async () => {
    const wrapper = mountTab({ instance: instance({ portalUrl: "" }) });

    await runCheck(wrapper);

    expect(sentBody().apps.map((app) => app.app)).toEqual(["adminUi"]);
  });
});

const REALM_OK = {
  id: 1,
  status: "ok",
  reason: "issuer_matches",
  details: { issuer: ISSUER },
};

describe("InstanceEditSingleSignOn „Realm prüfen“ result for „Web-Client anlegen“", () => {
  const WEB_CLIENT = "Web-Client anlegen";

  it("shows the worst state of both results and names each probe in German", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 2,
        status: "fail",
        reason: "client_unknown_or_disabled",
        parts: [
          {
            label: "token",
            status: "fail",
            reason: "client_unknown_or_disabled",
            details: { httpStatus: 401, error: "invalid_client" },
          },
          { label: "authorize", status: "na", reason: "web_client_invalid" },
        ],
      },
      {
        id: 3,
        status: "na",
        reason: "web_client_invalid",
        parts: [
          {
            label: "without_challenge",
            status: "na",
            reason: "web_client_invalid",
          },
          { label: "plain", status: "na", reason: "web_client_invalid" },
        ],
      },
    ]);

    const step = stepTitled(wrapper, WEB_CLIENT);
    expect(stepState(step)).toBe("nicht erfüllt");
    expect(isOpen(step)).toBe(true);
    expect(stepState(stepTitled(wrapper, "Realm anlegen"))).toBe("erfüllt");
    expect(isOpen(stepTitled(wrapper, "Realm anlegen"))).toBe(false);

    const [client, pkce] = checkRows(step);
    expect(client.title).toBe("Web-Client: vorhanden, public, Standard flow");
    expect(client.status).toBe("nicht erfüllt");
    expect(client.sentence).toBeNull();
    expect(client.parts.map((part) => [part.label, part.status])).toEqual([
      ["Client und Client authentication", "nicht erfüllt"],
      ["Standard flow", "nicht prüfbar"],
    ]);
    expect(client.parts[0].sentence).toContain(
      "Keycloak kennt den Web-Client nicht, oder er ist deaktiviert"
    );
    expect(client.parts[1].sentence).toContain("Nicht prüfbar, solange");

    expect(pkce.title).toBe("PKCE S256 erzwungen");
    expect(pkce.status).toBe("nicht prüfbar");
    expect(pkce.parts.map((part) => part.label)).toEqual([
      "Anmeldung ohne PKCE",
      "Anmeldung mit PKCE plain",
    ]);
  });

  it("says that Client authentication is on and PKCE plain is accepted", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 2,
        status: "fail",
        reason: "client_authentication_on",
        parts: [
          {
            label: "token",
            status: "fail",
            reason: "client_authentication_on",
            details: { httpStatus: 401, error: "unauthorized_client" },
          },
          { label: "authorize", status: "ok", reason: "standard_flow_on" },
        ],
      },
      {
        id: 3,
        status: "fail",
        reason: "pkce_plain_accepted",
        parts: [
          { label: "without_challenge", status: "ok", reason: "pkce_required" },
          { label: "plain", status: "fail", reason: "pkce_plain_accepted" },
        ],
      },
    ]);

    const [client, pkce] = checkRows(stepTitled(wrapper, WEB_CLIENT));
    expect(client.parts[0].sentence).toContain("Client authentication ist an");
    expect(client.parts[1]).toEqual({
      label: "Standard flow",
      status: "erfüllt",
      sentence: "Standard flow ist an.",
    });
    expect(pkce.parts[0].status).toBe("erfüllt");
    expect(pkce.parts[1].status).toBe("nicht erfüllt");
    expect(pkce.parts[1].sentence).toContain("PKCE plain");
    expect(pkce.parts[1].sentence).toContain("S256");
  });

  it("says Standard flow is off, and PKCE cannot be checked because of it", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 2,
        status: "fail",
        reason: "standard_flow_off",
        parts: [
          { label: "token", status: "ok", reason: "client_public" },
          {
            label: "authorize",
            status: "fail",
            reason: "standard_flow_off",
            details: { error: "unauthorized_client" },
          },
        ],
      },
      {
        id: 3,
        status: "na",
        reason: "standard_flow_off",
        parts: [
          {
            label: "without_challenge",
            status: "na",
            reason: "standard_flow_off",
          },
          { label: "plain", status: "na", reason: "standard_flow_off" },
        ],
      },
    ]);

    const [client, pkce] = checkRows(stepTitled(wrapper, WEB_CLIENT));
    expect(client.parts[0].sentence).toBe(
      "Der Web-Client existiert und ist public."
    );
    expect(client.parts[1].sentence).toBe("Standard flow ist aus.");
    expect(pkce.parts[0].sentence).toBe(
      "Nicht prüfbar, solange Standard flow aus ist."
    );
  });

  it("says that PKCE cannot be checked while Keycloak accepts no Rücksprungadresse, and that PKCE is optional", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 2,
        status: "na",
        reason: "no_redirect_uri_accepted",
        parts: [
          { label: "token", status: "ok", reason: "client_public" },
          {
            label: "authorize",
            status: "na",
            reason: "no_redirect_uri_accepted",
          },
        ],
      },
      {
        id: 3,
        status: "fail",
        reason: "pkce_optional",
        parts: [
          {
            label: "without_challenge",
            status: "fail",
            reason: "pkce_optional",
          },
          { label: "plain", status: "ok", reason: "pkce_plain_rejected" },
        ],
      },
    ]);

    const [client, pkce] = checkRows(stepTitled(wrapper, WEB_CLIENT));
    expect(client.status).toBe("nicht prüfbar");
    expect(client.parts[1].sentence).toContain("Valid redirect URIs");
    expect(pkce.parts[0].sentence).toContain("ohne PKCE");
    expect(pkce.parts[1].sentence).toBe("Keycloak lehnt PKCE plain ab.");
  });
});

describe("InstanceEditSingleSignOn „Realm prüfen“ result for the Rücksprungadressen and Web Origins", () => {
  const PORTAL_CALLBACK = "https://portal.example.de/api/auth/sso/callback";
  const PORTAL_SWITCH = "https://portal.example.de/api/auth/sso/login*";

  it("shows per Rücksprungadresse and per Adresse whether Keycloak accepts it, with the reason", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 4,
        status: "fail",
        reason: "http_accepted",
        parts: [
          {
            label: `${ORIGIN}/admin/login/sso`,
            status: "fail",
            reason: "http_accepted",
            details: { uri: "http://localhost:3000/admin/login/sso" },
          },
          {
            label: `${ORIGIN}/admin/silent-check-sso.html`,
            status: "ok",
            reason: "redirect_uri_accepted",
          },
          {
            label: PORTAL_CALLBACK,
            status: "fail",
            reason: "redirect_uri_rejected",
            details: { httpStatus: 400 },
          },
        ],
      },
      {
        id: 5,
        status: "fail",
        reason: "post_logout_redirect_rejected",
        parts: [
          {
            label: `${ORIGIN}/admin/`,
            status: "ok",
            reason: "post_logout_redirect_accepted",
          },
          {
            label: `${ORIGIN}/admin/login/sso*`,
            status: "fail",
            reason: "post_logout_redirect_rejected",
            details: { httpStatus: 400 },
          },
          {
            label: PORTAL_SWITCH,
            status: "na",
            reason: "unexpected_response",
            details: {
              httpStatus: 302,
              location: "https://sso.example.de/elsewhere",
            },
          },
        ],
      },
      {
        id: 6,
        status: "fail",
        reason: "origin_not_allowed",
        parts: [
          {
            label: ORIGIN,
            status: "fail",
            reason: "origin_not_allowed",
            details: { httpStatus: 403 },
          },
        ],
      },
    ]);

    const step = stepTitled(wrapper, ADDRESSES);
    expect(stepState(step)).toBe("nicht erfüllt");
    expect(isOpen(step)).toBe(true);

    const [redirects, postLogout, origins] = checkRows(step);
    expect(redirects.title).toBe("Valid redirect URIs");
    expect(redirects.parts.map((part) => [part.label, part.status])).toEqual([
      [`${ORIGIN}/admin/login/sso`, "nicht erfüllt"],
      [`${ORIGIN}/admin/silent-check-sso.html`, "erfüllt"],
      [PORTAL_CALLBACK, "nicht erfüllt"],
    ]);
    expect(redirects.parts[0].sentence).toContain(
      "http://localhost:3000/admin/login/sso"
    );
    expect(redirects.parts[1].sentence).toContain(
      "nimmt die Rücksprungadresse an"
    );
    expect(redirects.parts[2].sentence).toContain("HTTP 400");
    expect(redirects.parts[2].sentence).toContain(
      "fehlt unter Valid redirect URIs"
    );

    expect(postLogout.title).toBe("Valid post logout redirect URIs");
    expect(postLogout.parts.map((part) => part.status)).toEqual([
      "erfüllt",
      "nicht erfüllt",
      "nicht prüfbar",
    ]);
    expect(postLogout.parts[1].sentence).toContain(
      "fehlt unter Valid post logout redirect URIs"
    );
    expect(postLogout.parts[1].sentence).toContain("„Benutzer wechseln“");
    expect(postLogout.parts[1].sentence).toContain("*");
    expect(postLogout.parts[2].sentence).toContain("HTTP 302");
    expect(postLogout.parts[2].sentence).toContain(
      "https://sso.example.de/elsewhere"
    );

    expect(origins.title).toBe("Web origins");
    expect(origins.parts).toEqual([
      {
        label: ORIGIN,
        status: "nicht erfüllt",
        sentence: expect.stringContaining("fehlt unter Web origins"),
      },
    ]);
    expect(origins.parts[0].sentence).toContain("HTTP 403");
  });

  it("shows erfüllt when Keycloak accepts every entry", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 4,
        status: "ok",
        reason: "redirect_uri_accepted",
        parts: [
          {
            label: PORTAL_CALLBACK,
            status: "ok",
            reason: "redirect_uri_accepted",
          },
        ],
      },
      {
        id: 5,
        status: "ok",
        reason: "post_logout_redirect_accepted",
        parts: [
          {
            label: PORTAL_SWITCH,
            status: "ok",
            reason: "post_logout_redirect_accepted",
          },
        ],
      },
      {
        id: 6,
        status: "ok",
        reason: "origin_allowed",
        parts: [{ label: ORIGIN, status: "ok", reason: "origin_allowed" }],
      },
    ]);

    const step = stepTitled(wrapper, ADDRESSES);
    expect(stepState(step)).toBe("erfüllt");
    expect(isOpen(step)).toBe(false);
    const rows = checkRows(await openStep(wrapper, ADDRESSES));
    expect(rows[1].parts[0].sentence).toContain("Abmeldung");
    expect(rows[2].parts[0].sentence).toContain("erlaubt Anfragen von");
  });

  it("names the Web-Client as the cause when Keycloak echoes every Origin", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 6,
        status: "na",
        reason: "web_client_invalid",
        parts: [
          {
            label: ORIGIN,
            status: "na",
            reason: "web_client_invalid",
            details: { httpStatus: 401, error: "unauthorized_client" },
          },
        ],
      },
    ]);

    const [origins] = checkRows(stepTitled(wrapper, ADDRESSES));
    expect(origins.status).toBe("nicht prüfbar");
    expect(origins.parts[0].sentence).toContain("nicht public");
    expect(origins.parts[0].sentence).toContain("HTTP 401");
    expect(origins.parts[0].sentence).toContain("unauthorized_client");
  });
});

/** The one result of a step that has a single row. */
async function onlyRow(wrapper, title) {
  const step = stepTitled(wrapper, title);
  const opened = isOpen(step) ? step : await openStep(wrapper, title);
  const rows = checkRows(opened);
  expect(rows).toHaveLength(1);
  return rows[0];
}

describe("InstanceEditSingleSignOn „Realm prüfen“ result for „API-Client anlegen“", () => {
  const API_CLIENT = "API-Client anlegen";

  it("says that the API-Client may check tokens", async () => {
    const wrapper = await checked([
      REALM_OK,
      { id: 7, status: "ok", reason: "introspection_allowed" },
    ]);

    expect(stepState(stepTitled(wrapper, API_CLIENT))).toBe("erfüllt");
    const row = await onlyRow(wrapper, API_CLIENT);
    expect(row.title).toBe("API-Client darf Tokens prüfen");
    expect(row.sentence).toContain("Client Secret");
  });

  it.each([
    ["api_client_secret_wrong", undefined, ["Client Secret", "stimmt nicht"]],
    [
      "api_client_unknown_or_disabled",
      undefined,
      ["kennt den API-Client nicht", "deaktiviert"],
    ],
    [
      "introspection_unauthorized",
      { httpStatus: 401 },
      ["HTTP 401", "Client Secret ist falsch", "unbekannt", "deaktiviert"],
    ],
    [
      "api_client_public",
      { httpStatus: 403 },
      ["public", "Client authentication"],
    ],
  ])(
    "shows nicht erfüllt for %s, naming every cause",
    async (reason, details, says) => {
      const wrapper = await checked([
        REALM_OK,
        { id: 7, status: "fail", reason, details },
      ]);

      const step = stepTitled(wrapper, API_CLIENT);
      expect(stepState(step)).toBe("nicht erfüllt");
      expect(isOpen(step)).toBe(true);
      const row = await onlyRow(wrapper, API_CLIENT);
      says.forEach((part) => expect(row.sentence).toContain(part));
    }
  );
});

describe("InstanceEditSingleSignOn „Realm prüfen“ result for Audience and Client-Rollen", () => {
  const AUDIENCE = "Audience-Mapper anlegen";
  const ROLES = "Client-Rollen zuordnen";
  const MAPPED = [
    { tenantId: "t1", keycloakRole: "raumverwaltung", tenantRoleId: "r1" },
  ];

  it("asks to sign in per SSO and names the missing Audience-Mapper as the likely cause when that fails", async () => {
    const wrapper = await checked(
      [
        REALM_OK,
        { id: 8, status: "na", reason: "sso_login_required" },
        { id: 9, status: "na", reason: "sso_login_required" },
      ],
      { instance: withRoleMapping(MAPPED) }
    );

    const audience = stepTitled(wrapper, AUDIENCE);
    expect(stepState(audience)).toBe("nicht prüfbar");
    expect(isOpen(audience)).toBe(true);
    const [row8] = checkRows(audience);
    expect(row8.title).toBe("Audience im Token");
    expect(row8.sentence).toContain("per SSO an");
    expect(row8.sentence).toContain(
      "Scheitert die SSO-Anmeldung, fehlt wahrscheinlich der Audience-Mapper"
    );

    const roles = stepTitled(wrapper, ROLES);
    expect(stepState(roles)).toBe("nicht prüfbar");
    const [row9] = checkRows(roles);
    expect(row9.title).toBe("Client-Rollen im Token");
    expect(row9.sentence).toContain("per SSO an");
    expect(row9.sentence).not.toContain("Audience-Mapper");
  });

  it("says the token names the API-Client as Audience", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 8,
        status: "ok",
        reason: "audience_present",
        details: { aud: ["biletado-api"] },
      },
    ]);

    expect(stepState(stepTitled(wrapper, AUDIENCE))).toBe("erfüllt");
    const row = await onlyRow(wrapper, AUDIENCE);
    expect(row.sentence).toContain("biletado-api");
  });

  it.each([
    [{ aud: ["account", "broker"] }, ["account, broker", "Audience-Mapper"]],
    [{ aud: [] }, ["keine Audience", "Audience-Mapper"]],
  ])(
    "names the Audience the token carries instead (%o)",
    async (details, says) => {
      const wrapper = await checked([
        REALM_OK,
        { id: 8, status: "fail", reason: "audience_missing", details },
      ]);

      expect(stepState(stepTitled(wrapper, AUDIENCE))).toBe("nicht erfüllt");
      const row = await onlyRow(wrapper, AUDIENCE);
      says.forEach((part) => expect(row.sentence).toContain(part));
    }
  );

  it.each([
    ["token_other_client", { azp: "admin-cli" }, ["admin-cli"]],
    [
      "token_other_realm",
      { iss: "https://sso.example.de/realms/alt" },
      [
        "https://sso.example.de/realms/alt",
        "gespeicherten Realm",
        "neu per SSO an",
      ],
    ],
    ["token_inactive", { aud: ["biletado-api"] }, ["biletado-api", "neu an"]],
    ["api_client_invalid", undefined, ["API-Client"]],
  ])("shows nicht prüfbar for %s", async (reason, details, says) => {
    const wrapper = await checked([
      REALM_OK,
      { id: 8, status: "na", reason, details },
    ]);

    expect(stepState(stepTitled(wrapper, AUDIENCE))).toBe("nicht prüfbar");
    const row = await onlyRow(wrapper, AUDIENCE);
    says.forEach((part) => expect(row.sentence).toContain(part));
  });

  it("lists the Client-Rollen of the token as Information, without opening the step", async () => {
    const wrapper = await checked(
      [
        REALM_OK,
        {
          id: 9,
          status: "info",
          reason: "client_roles",
          details: { roles: ["biletado-admin", "raumverwaltung"] },
        },
      ],
      { instance: withRoleMapping(MAPPED) }
    );

    const step = stepTitled(wrapper, ROLES);
    expect(stepState(step)).toBe("Information");
    expect(isOpen(step)).toBe(false);
    const row = await onlyRow(wrapper, ROLES);
    expect(row.status).toBe("Information");
    expect(row.sentence).toContain("biletado-admin, raumverwaltung");
  });

  it("says when no Client-Rolle arrives, naming every cause", async () => {
    const wrapper = await checked(
      [
        REALM_OK,
        {
          id: 9,
          status: "info",
          reason: "client_roles",
          details: { roles: [] },
        },
      ],
      { instance: withRoleMapping(MAPPED) }
    );

    const row = await onlyRow(wrapper, ROLES);
    expect(row.sentence).toContain("keine Client-Rollen");
    expect(row.sentence).toContain("keine zugewiesen");
    expect(row.sentence).toContain("„roles“");
  });

  it("keeps the number of a step the answer has no result for", async () => {
    const wrapper = await checked(
      [
        REALM_OK,
        {
          id: 8,
          status: "ok",
          reason: "audience_present",
          details: { aud: ["biletado-api"] },
        },
      ],
      { instance: withRoleMapping(MAPPED) }
    );

    const roles = stepTitled(wrapper, ROLES);
    expect(stepState(roles)).toBeNull();
    expect(roles.find("[data-test='guide-step-number']").text()).toBe("6");
    expect(stepState(stepTitled(wrapper, "Web-Client anlegen"))).toBeNull();
  });
});

describe("InstanceEditSingleSignOn „Realm prüfen“ result for „Portal-URL prüfen“", () => {
  const PORTAL = "Portal-URL prüfen";
  const EXPECTED = "https://portal.example.de/api/auth/sso/callback";

  it("says the Storefront signs in with the expected Rücksprungadresse", async () => {
    const wrapper = await checked([
      REALM_OK,
      {
        id: 10,
        status: "ok",
        reason: "storefront_redirect_matches",
        details: { expected: EXPECTED, actual: EXPECTED },
      },
    ]);

    expect(stepState(stepTitled(wrapper, PORTAL))).toBe("erfüllt");
    const row = await onlyRow(wrapper, PORTAL);
    expect(row.title).toBe("Portal-URL und Storefront");
    expect(row.sentence).toContain(EXPECTED);
  });

  it.each([
    [
      "storefront_origin_mismatch",
      "fail",
      {
        expected: EXPECTED,
        actual: "https://www.portal.example.de/api/auth/sso/callback",
      },
      [
        "https://www.portal.example.de/api/auth/sso/callback",
        EXPECTED,
        "Portal-URL oder die Storefront",
      ],
    ],
    [
      "storefront_path_mismatch",
      "na",
      { expected: EXPECTED, actual: "https://portal.example.de/sso/callback" },
      ["https://portal.example.de/sso/callback", EXPECTED, "Biletado"],
    ],
    [
      "storefront_not_redirecting",
      "na",
      { httpStatus: 200 },
      ["HTTP 200", "Keycloak noch nicht kennt"],
    ],
    [
      "storefront_not_redirecting",
      "na",
      { httpStatus: 302, location: "https://other.example.de/realms/x" },
      ["HTTP 302", "https://other.example.de/realms/x"],
    ],
    [
      "portal_url_missing",
      "na",
      undefined,
      ["Portal-URL ist leer oder keine vollständige Adresse"],
    ],
  ])(
    "reads %s as its state with the reason",
    async (reason, status, details, says) => {
      const wrapper = await checked([
        REALM_OK,
        { id: 10, status, reason, details },
      ]);

      const step = stepTitled(wrapper, PORTAL);
      expect(stepState(step)).toBe(
        status === "fail" ? "nicht erfüllt" : "nicht prüfbar"
      );
      expect(isOpen(step)).toBe(true);
      const row = await onlyRow(wrapper, PORTAL);
      says.forEach((part) => expect(row.sentence).toContain(part));
    }
  );
});

describe("InstanceEditSingleSignOn „Realm prüfen“ reasons", () => {
  it("names a reason the Admin UI does not know by its code", async () => {
    const wrapper = await checked([
      REALM_OK,
      { id: 7, status: "fail", reason: "brand_new_reason", details: { x: 1 } },
    ]);

    const row = await onlyRow(wrapper, "API-Client anlegen");
    expect(row.status).toBe("nicht erfüllt");
    expect(row.sentence).toContain("„brand_new_reason“");
  });

  it("says every later result waits for the realm while Realm and Issuer fail", async () => {
    const wrapper = await checked([
      {
        id: 1,
        status: "fail",
        reason: "realm_not_found",
        details: { httpStatus: 404, url: ISSUER },
      },
      { id: 2, status: "na", reason: "realm_unavailable" },
      { id: 3, status: "na", reason: "realm_unavailable" },
      { id: 10, status: "na", reason: "realm_unavailable" },
    ]);

    const [client, pkce] = checkRows(stepTitled(wrapper, "Web-Client anlegen"));
    expect(client.sentence).toContain("Realm anlegen");
    expect(pkce.sentence).toBe(client.sentence);
    expect(stepState(stepTitled(wrapper, "Portal-URL prüfen"))).toBe(
      "nicht prüfbar"
    );
  });
});

function summary(wrapper) {
  const found = statusCard(wrapper).find("[data-test='sso-check-summary']");
  return found.exists() ? found : null;
}

function counts(wrapper) {
  return summary(wrapper)
    .findAll("[data-test='sso-check-count']")
    .wrappers.map((count) => count.text());
}

describe("InstanceEditSingleSignOn „Realm prüfen“ in the status card", () => {
  it("names the number of results per state, worst first, and the time of the check", async () => {
    const wrapper = await checked(
      [
        REALM_OK,
        { id: 7, status: "ok", reason: "introspection_allowed" },
        { id: 8, status: "na", reason: "sso_login_required" },
        {
          id: 9,
          status: "info",
          reason: "client_roles",
          details: { roles: ["biletado-admin"] },
        },
        {
          id: 10,
          status: "fail",
          reason: "storefront_origin_mismatch",
          details: { expected: "a", actual: "b" },
        },
      ],
      {
        instance: withRoleMapping([
          {
            tenantId: "t1",
            keycloakRole: "biletado-admin",
            tenantRoleId: "r1",
          },
        ]),
      }
    );

    expect(counts(wrapper)).toEqual([
      "1 nicht erfüllt",
      "1 nicht prüfbar",
      "1 Information",
      "2 erfüllt",
    ]);
    expect(summary(wrapper).text()).toContain("geprüft um 14:03:12");
  });

  it("says nothing about a check before the first one", () => {
    const wrapper = mountTab();

    expect(summary(wrapper)).toBeNull();
  });

  it("shows that the check runs and sends it only once while it runs", async () => {
    let answer;
    ApiInstanceService.checkKeycloakRealm.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    const wrapper = mountTab();

    await checkButton(wrapper).trigger("click");
    await settle(wrapper);
    expect(checkButton(wrapper).classes()).toContain("v-btn--loading");
    await checkButton(wrapper).trigger("click");
    expect(ApiInstanceService.checkKeycloakRealm).toHaveBeenCalledTimes(1);

    answer(checkAnswer([REALM_OK]));
    await flushPromises();
    await settle(wrapper);
    expect(checkButton(wrapper).classes()).not.toContain("v-btn--loading");
    expect(counts(wrapper)).toEqual(["1 erfüllt"]);
  });
});

/** The view keeps its tabs alive, as `Instances.vue` does. */
const KeptAlive = {
  props: { instance: { type: Object, required: true } },
  data: () => ({ shown: true }),
  render(h) {
    return h("keep-alive", [
      this.shown
        ? h(InstanceEditSingleSignOn, { props: { instance: this.instance } })
        : null,
    ]);
  },
};

describe("InstanceEditSingleSignOn „Realm prüfen“ result while the tab is open", () => {
  it("keeps the result until the tab is left", async () => {
    ApiInstanceService.checkKeycloakRealm.mockResolvedValue(
      checkAnswer([REALM_OK])
    );
    const wrapper = mountComponent(KeptAlive, {
      propsData: { instance: instance() },
    });
    await runCheck(wrapper);
    expect(counts(wrapper)).toEqual(["1 erfüllt"]);

    await wrapper.setData({ shown: false });
    await wrapper.setData({ shown: true });
    await settle(wrapper);

    expect(summary(wrapper)).toBeNull();
    expect(stepState(stepTitled(wrapper, "Realm anlegen"))).toBeNull();
  });

  it("drops an answer that arrives after the tab was left", async () => {
    let answer;
    ApiInstanceService.checkKeycloakRealm.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    const wrapper = mountComponent(KeptAlive, {
      propsData: { instance: instance() },
    });
    await checkButton(wrapper).trigger("click");

    await wrapper.setData({ shown: false });
    answer(checkAnswer([REALM_OK]));
    await flushPromises();
    await wrapper.setData({ shown: true });
    await settle(wrapper);

    expect(summary(wrapper)).toBeNull();
    expect(checkButton(wrapper).classes()).not.toContain("v-btn--loading");
  });
});

/** The backend's answer when stored values are missing. */
function settingsMissing(missing) {
  const error = new Error("Request failed with status code 400");
  error.response = {
    status: 400,
    data: {
      error: "BadRequestError",
      code: "keycloak_settings_missing",
      statusCode: 400,
      params: { missing },
    },
  };
  return error;
}

function checkError(wrapper) {
  const found = statusCard(wrapper).find("[data-test='sso-check-error']");
  return found.exists() ? found.text() : null;
}

describe("InstanceEditSingleSignOn „Realm prüfen“ errors", () => {
  it("names the values the saved instance lacks", async () => {
    ApiInstanceService.checkKeycloakRealm.mockRejectedValue(
      settingsMissing(["serverUrl", "privateClientSecret"])
    );
    const wrapper = mountTab();

    await runCheck(wrapper);

    expect(checkError(wrapper)).toContain("Keycloak-URL und Client Secret");
    expect(summary(wrapper)).toBeNull();
    expect(checkButton(wrapper).classes()).not.toContain("v-btn--loading");
  });

  it("says the backend refused the request, naming the fields", async () => {
    ApiInstanceService.checkKeycloakRealm.mockRejectedValue(
      validationError([{ field: "apps[0].origin", code: "invalid_format" }])
    );
    const wrapper = mountTab();

    await runCheck(wrapper);

    expect(checkError(wrapper)).toContain("abgelehnt");
    expect(checkError(wrapper)).toContain("apps[0].origin");
  });

  it.each([
    ["the network fails", () => new Error("Network Error")],
    ["the backend fails", () => serverError(500)],
  ])(
    "says the check failed when %s, and clears that with the next result",
    async (_, failure) => {
      ApiInstanceService.checkKeycloakRealm.mockRejectedValueOnce(failure());
      const wrapper = mountTab();

      await runCheck(wrapper);
      expect(checkError(wrapper)).toContain("fehlgeschlagen");

      ApiInstanceService.checkKeycloakRealm.mockResolvedValue(
        checkAnswer([REALM_OK])
      );
      await runCheck(wrapper);
      expect(checkError(wrapper)).toBeNull();
      expect(counts(wrapper)).toEqual(["1 erfüllt"]);
    }
  );
});

/** The entries of the menu „Als Text“ as they read, with whether they are disabled. */
async function textMenuEntries(wrapper) {
  await statusCard(wrapper)
    .find("[data-test='sso-text-menu']")
    .trigger("click");
  await settle(wrapper);
  const menus = document.querySelectorAll(".sso-text-menu");
  return Array.from(
    menus[menus.length - 1].querySelectorAll(".v-list-item")
  ).map((item) => ({
    text: item.textContent.trim(),
    disabled: item.classList.contains("v-list-item--disabled"),
  }));
}

describe("InstanceEditSingleSignOn Anleitung mit Ergebnis als Text", () => {
  let writeText;

  beforeEach(() => {
    writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  const ROWS = [
    REALM_OK,
    {
      id: 4,
      status: "fail",
      reason: "redirect_uri_rejected",
      parts: [
        {
          label: `${ORIGIN}/admin/login/sso`,
          status: "ok",
          reason: "redirect_uri_accepted",
        },
        {
          label: "https://portal.example.de/api/auth/sso/callback",
          status: "fail",
          reason: "redirect_uri_rejected",
          details: { httpStatus: 400 },
        },
      ],
    },
    { id: 7, status: "ok", reason: "introspection_allowed" },
    { id: 8, status: "na", reason: "sso_login_required" },
  ];

  /** The tab with toasts, checked with the given rows. */
  async function checkedWithToasts(rows, propsData = {}) {
    ApiInstanceService.checkKeycloakRealm.mockResolvedValue(checkAnswer(rows));
    const wrapper = mountTabWithToasts(propsData);
    await runCheck(wrapper);
    return wrapper;
  }

  it("offers the Anleitung with result only after a check", async () => {
    const wrapper = mountTabWithToasts();

    expect(await textMenuEntries(wrapper)).toEqual([
      { text: "Anleitung kopieren", disabled: false },
      { text: "Anleitung mit Ergebnis kopieren", disabled: true },
    ]);
  });

  it("adds the time of the check with the counts to the header, and per step its state and the reasons", async () => {
    const wrapper = await checkedWithToasts(ROWS);

    const toasted = await copyAsText(
      wrapper,
      "Anleitung mit Ergebnis kopieren"
    );

    expect(toasted).toEqual([
      "Die Anleitung mit dem Ergebnis der Prüfung liegt als Text in der Zwischenablage.",
    ]);
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0];
    expect(text).toContain(
      [
        "Issuer: https://sso.example.de/realms/biletado",
        "Realm geprüft am 01.10.2026, 14:03:12: 1 nicht erfüllt, 1 nicht prüfbar, 2 erfüllt",
        "",
        "1. Realm anlegen",
        "   Ergebnis: erfüllt",
        `   - Realm und Issuer: erfüllt. Der Realm antwortet mit dem Issuer ${ISSUER}.`,
        "   Realm name: biletado",
      ].join("\n")
    );
    expect(text).toContain(
      [
        "3. Rücksprungadressen und Web Origins eintragen",
        "   Ergebnis: nicht erfüllt",
        "   - Valid redirect URIs: nicht erfüllt",
        `       ${ORIGIN}/admin/login/sso: erfüllt. Keycloak nimmt die Rücksprungadresse an, mit http:// nicht.`,
        "       https://portal.example.de/api/auth/sso/callback: nicht erfüllt. Keycloak lehnt die Rücksprungadresse ab (HTTP 400): Sie fehlt unter Valid redirect URIs oder weicht ab, etwa durch einen Schrägstrich am Ende.",
        `   Admin UI: ${ORIGIN}`,
      ].join("\n")
    );
    expect(text).toContain(
      [
        "4. Audience-Mapper anlegen",
        "   Ergebnis: nicht prüfbar",
        "   - Audience im Token: nicht prüfbar. Nicht prüfbar, Sie sind nicht per SSO angemeldet. Melden Sie sich per SSO an und prüfen Sie erneut. Scheitert die SSO-Anmeldung, fehlt wahrscheinlich der Audience-Mapper.",
      ].join("\n")
    );
    expect(text).toContain(
      ["2. Web-Client anlegen", "   Client ID: biletado-web"].join("\n")
    );
  });

  it("counts and copies only the results of steps the Anleitung shows", async () => {
    // Row 9 belongs to „Client-Rollen zuordnen“, absent while the role
    // mapping is off.
    const wrapper = await checkedWithToasts([
      REALM_OK,
      {
        id: 9,
        status: "info",
        reason: "client_roles",
        details: { roles: ["biletado-admin"] },
      },
    ]);

    expect(counts(wrapper)).toEqual(["1 erfüllt"]);

    await copyAsText(wrapper, "Anleitung mit Ergebnis kopieren");
    const text = writeText.mock.calls[0][0];
    expect(text).toContain(
      "Realm geprüft am 01.10.2026, 14:03:12: 1 erfüllt\n"
    );
    expect(text).not.toContain("Client-Rollen im Token");
  });

  it("never contains the Client Secret", async () => {
    const wrapper = await checkedWithToasts(ROWS, {
      instance: instance({
        applications: [keycloak({ privateClientSecret: "s3cr3t-9f2c" })],
      }),
    });

    await copyAsText(wrapper, "Anleitung mit Ergebnis kopieren");

    expect(writeText.mock.calls[0][0]).not.toContain("s3cr3t-9f2c");
  });

  it("copies the Anleitung without result through „Anleitung kopieren“ after a check", async () => {
    const wrapper = await checkedWithToasts(ROWS);

    await copyAsText(wrapper, "Anleitung kopieren");

    const text = writeText.mock.calls[0][0];
    expect(text).not.toContain("Ergebnis");
    expect(text).not.toContain("geprüft am");
  });
});

describe("InstanceEditSingleSignOn „Realm prüfen“ result after an edit", () => {
  it("keeps the counts beside the lock reason when the form changes after the check", async () => {
    const wrapper = await checked([REALM_OK]);

    await wrapper.setProps({ hasUnsavedChanges: true });

    expect(lockReason(wrapper)).toContain("Speichern Sie zuerst");
    expect(counts(wrapper)).toEqual(["1 erfüllt"]);
    expect(stepState(stepTitled(wrapper, "Realm anlegen"))).toBe("erfüllt");
  });

  it("drops the result once the changed values are saved, because it is about the old ones", async () => {
    const wrapper = await checked([REALM_OK]);
    await wrapper.setProps({ hasUnsavedChanges: true });

    // What the view does after a successful save.
    wrapper.vm.onSaved();
    await wrapper.setProps({ hasUnsavedChanges: false });
    await settle(wrapper);

    expect(summary(wrapper)).toBeNull();
    expect(stepState(stepTitled(wrapper, "Realm anlegen"))).toBeNull();
    expect(lockReason(wrapper)).toBeNull();
  });
});
