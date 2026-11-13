import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import AccessPoints from "@/views/Management/AccessPoints.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  forbiddenError,
  lifecycleError,
  validationError,
} from "@tests/unit/support/api";
import { typeSearch } from "@tests/unit/support/search";
import { selectByLabel } from "@tests/unit/support/vuetify";
import ApiGeoService from "@/services/api/ApiGeoService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import BookablePermissionService from "@/services/permissions/BookablePermissionService";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn(), submitTenant: vi.fn() },
}));
vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: {
    testConnection: vi.fn(),
    saveApp: vi.fn(),
    removeApp: vi.fn(),
    getSaltoIqs: vi.fn(),
    startSaltoIqActivation: vi.fn(),
    getProviders: vi.fn(),
    getAccessPoints: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: {
    getAccessPoints: vi.fn(),
    storeAccessPoint: vi.fn(),
    deleteAccessPoint: vi.fn(),
    getQrCode: vi.fn(),
    getCompartmentBookings: vi.fn(),
    getLocationPrefill: vi.fn(),
    assignBookables: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: { getBookings: vi.fn() },
}));
vi.mock("@/services/api/ApiGeoService", () => ({
  default: { search: vi.fn(), reverse: vi.fn(), start: vi.fn(), tile: vi.fn() },
}));
vi.mock("@/services/permissions/AccessPointPermissionService", () => ({
  default: { allowWrite: () => true },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { allowUpdate: () => true },
}));
vi.mock("@/services/permissions/BookablePermissionService", () => ({
  default: { allowUpdate: vi.fn(() => true) },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowAuditExport: vi.fn(() => false) },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

const addToast = vi.fn();

function store() {
  return new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t1" },
      },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
}

/**
 * The page registers its leave guard on the router; the spec keeps the last
 * one to navigate away through it.
 */
let leaveGuard = null;
function routerGuard(guard) {
  leaveGuard = guard;
  return () => {};
}

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
  await flushPromises();
}

const NUKI = {
  id: "nuki",
  title: "Nuki",
  providerCapabilities: ["listAccessPoints"],
};
const PAREVA = { id: "pareva", title: "Pareva", providerCapabilities: [] };
const OPEN_LOCKER = {
  id: "open-locker",
  title: "Open Locker",
  providerCapabilities: ["listAccessPoints"],
};

const IFBS = {
  id: "ifbs",
  title: "iFBS",
  providerCapabilities: ["listAccessPoints"],
};

const SALTO = {
  id: "salto-ks",
  title: "Salto KS",
  providerCapabilities: ["listAccessPoints"],
};

const DOOR = {
  id: "ap-door",
  type: "door",
  provider: "nuki",
  label: "Haupteingang",
  externalId: "lock-1",
  validationRules: [{ type: "qrScan" }],
};

const PAREVA_LOCKER = {
  id: "ap-pareva",
  type: "locker",
  provider: "pareva",
  label: "Schließfächer Rathaus",
  externalId: "66570d1a1f9b6357ed971746",
  validationRules: [],
};

/**
 * The Zugangspunkte page on its first tab, with the tenant's connected
 * providers and access points as the backend answers them. `bookables` may
 * be an error the backend answers instead.
 */
async function mountAccessPointsPage({
  apps = [],
  providers = [NUKI, PAREVA],
  accessPoints = [DOOR, PAREVA_LOCKER],
  bookables = [],
  bookings = [],
} = {}) {
  ApiTenantService.getTenant.mockResolvedValue({
    data: { id: "t1", name: "Mandant", applications: apps },
  });
  ApiAccessAppsService.getProviders.mockResolvedValue({ data: providers });
  ApiAccessAppsService.getAccessPoints.mockResolvedValue({ data: [] });
  ApiAccessPointService.getAccessPoints.mockResolvedValue({
    data: accessPoints,
  });
  if (bookables instanceof Error) {
    ApiBookablesService.getBookables.mockRejectedValue(bookables);
  } else {
    ApiBookablesService.getBookables.mockResolvedValue({ data: bookables });
  }
  ApiBookingService.getBookings.mockResolvedValue({ data: bookings });
  // The location input behind „Weitere Einstellungen“ asks the geo routes.
  ApiGeoService.start.mockResolvedValue({ lat: 51.2, lon: 9.4, zoom: 5 });
  ApiGeoService.search.mockResolvedValue([]);
  ApiGeoService.reverse.mockResolvedValue(null);
  ApiGeoService.tile.mockReturnValue(new Promise(() => {}));

  const wrapper = mountComponent(AccessPoints, {
    store: store(),
    mocks: {
      $route: { query: {} },
      $router: { replace: vi.fn(), beforeEach: routerGuard },
    },
  });
  await settle(wrapper);
  await settle(wrapper);
  return wrapper;
}

function sections(wrapper) {
  return wrapper.findAll("[data-test='provider-section']").wrappers;
}

function sectionOf(wrapper, title) {
  return sections(wrapper).find(
    (section) =>
      section.find("[data-test='provider-section-title']").text() === title
  );
}

/**
 * The page is laid out by provider (ECCdigital/tickets#1103): one section per
 * connected provider, its name over its access points, and the creation in
 * its head, the provider already settled.
 */
describe("AccessPoints shows a section per connected provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("names each provider over its own access points", async () => {
    const wrapper = await mountAccessPointsPage();

    expect(
      sections(wrapper).map((section) =>
        section.find("[data-test='provider-section-title']").text()
      )
    ).toEqual(["Nuki", "Pareva"]);
    const nuki = sectionOf(wrapper, "Nuki").text();
    expect(nuki).toContain("Haupteingang");
    expect(nuki).not.toContain("Schließfächer Rathaus");
    const pareva = sectionOf(wrapper, "Pareva").text();
    expect(pareva).toContain("Schließfächer Rathaus");
    expect(pareva).not.toContain("Haupteingang");
  });

  // A provider switched off is not among the active ones the backend
  // lists, but its access points stay reachable until the section shows
  // the state of its provider (ECCdigital/tickets#1104).
  it("keeps the access points of a provider that is not active", async () => {
    const wrapper = await mountAccessPointsPage({ providers: [NUKI] });

    const pareva = sectionOf(wrapper, "Pareva");
    expect(pareva.text()).toContain("Schließfächer Rathaus");
    expect(pareva.find("[data-test='row-menu']").exists()).toBe(true);
  });

  it("says so when there is nothing to show", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [],
      accessPoints: [],
    });

    expect(sections(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain("Es ist noch kein Zugangspunkt angelegt.");
  });

  it("names in the head what the creation makes", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [NUKI, PAREVA, OPEN_LOCKER],
      accessPoints: [],
    });

    const createLabel = (title) =>
      sectionOf(wrapper, title)
        .find("[data-test='provider-section-create']")
        .text();
    expect(createLabel("Nuki")).toBe("Tür anlegen");
    expect(createLabel("Pareva")).toBe("Schließfachanlage anlegen");
    expect(createLabel("Open Locker")).toBe("Schließfachanlage anlegen");
  });
});

/**
 * An access application of the tenant as the backend answers it since
 * ECCdigital/tickets#1101 and #1102: whether a secret is stored, the state
 * of the connection and the last test.
 */
function storedApp(id, overrides = {}) {
  return {
    type: "access",
    id,
    title: "",
    active: true,
    storedSecrets: {},
    connectionState: "connected",
    lastTest: { success: true, testedAt: 1794571200000, error: null },
    ...overrides,
  };
}

function stateOf(wrapper, title) {
  const state = sectionOf(wrapper, title).find(
    "[data-test='provider-section-state']"
  );
  return state.exists() ? state.text() : "";
}

/**
 * The head of each section reads the state of its provider
 * (ECCdigital/tickets#1104): what the backend derives from the last test.
 */
describe("AccessPoints shows the state of each provider in its head", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads Verbunden, Nicht geprüft, Gestört and Ausgeschaltet", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [NUKI, PAREVA, OPEN_LOCKER, SALTO],
      accessPoints: [],
      apps: [
        storedApp("nuki"),
        storedApp("pareva", { connectionState: "unchecked" }),
        storedApp("open-locker", { connectionState: "failing" }),
        storedApp("salto-ks", { active: false, connectionState: "disabled" }),
      ],
    });

    expect(stateOf(wrapper, "Nuki")).toBe("Verbunden");
    expect(stateOf(wrapper, "Pareva")).toBe("Nicht geprüft");
    expect(stateOf(wrapper, "Open Locker")).toBe("Gestört");
    expect(stateOf(wrapper, "Salto KS")).toBe("Ausgeschaltet");
  });

  it("shows a switched-off provider without access points", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [NUKI],
      accessPoints: [],
      apps: [
        storedApp("nuki"),
        storedApp("pareva", { active: false, connectionState: "disabled" }),
      ],
    });

    expect(stateOf(wrapper, "Pareva")).toBe("Ausgeschaltet");
  });
});

/** Opens the settings of a provider from the head of its section. */
async function openSettings(wrapper, title) {
  await sectionOf(wrapper, title)
    .find("[data-test='provider-section-settings']")
    .trigger("click");
  await settle(wrapper);
  return settingsOf(wrapper, title);
}

function settingsOf(wrapper, title) {
  return sectionOf(wrapper, title).find("[data-test='access-app-settings']");
}

function buttonIn(area, text) {
  return area.findAll("button").wrappers.find((b) => b.text() === text);
}

async function click(wrapper, area, text) {
  await buttonIn(area, text).trigger("click");
  await settle(wrapper);
}

/**
 * The settings of a provider unfold in the head of its section, the access
 * points still beneath (ECCdigital/tickets#1104): the form on the left,
 * „Verbindung“ on the right, the actions in the foot.
 */
describe("AccessPoints unfolds the settings of a provider in its section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens beneath the head, the access points still in view", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [storedApp("nuki")] });

    const settings = await openSettings(wrapper, "Nuki");

    expect(settings.exists()).toBe(true);
    expect(sectionOf(wrapper, "Nuki").text()).toContain("Haupteingang");
    const connection = settings.find("[data-test='access-app-connection']");
    expect(connection.text()).toContain("Verbindung");
    expect(connection.text()).toContain("Zuletzt geprüft am 13.11.2026, 13:00");
    expect(buttonIn(connection, "Verbindung testen")).toBeTruthy();
    const foot = settings.find("[data-test='access-app-foot']");
    expect(foot.findAll("button").wrappers.map((b) => b.text())).toEqual([
      "Verbindung entfernen",
      "Abbrechen",
      "Speichern",
    ]);
  });

  it("says when the connection was never tested", async () => {
    const wrapper = await mountAccessPointsPage({
      apps: [storedApp("nuki", { lastTest: null })],
    });

    const settings = await openSettings(wrapper, "Nuki");

    expect(settings.text()).toContain("Noch nie geprüft");
  });

  it("folds the settings again with „Abbrechen“", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [storedApp("nuki")] });
    const settings = await openSettings(wrapper, "Nuki");

    await click(wrapper, settings, "Abbrechen");

    expect(settingsOf(wrapper, "Nuki").exists()).toBe(false);
  });
});

/** The labels of the fields the form shows, a stored secret included. */
function formLabels(settings) {
  return settings
    .find("[data-test='access-app-form']")
    .findAll("label, [data-test='stored-secret-label']")
    .wrappers.map((label) => label.text());
}

function inputLabelled(settings, label) {
  const field = settings
    .findAll(".v-input")
    .wrappers.find((input) => input.find("label").text() === label);
  return field && field.find("input");
}

function storedSecret(settings, label) {
  return settings
    .findAll("[data-test='stored-secret']")
    .wrappers.find(
      (row) => row.find("[data-test='stored-secret-label']").text() === label
    );
}

/**
 * The form shows first what the connection needs, the rarer settings folded
 * with their standard, and the help folded above (stories 35 to 37 of the
 * spec to ECCdigital/tickets#1082).
 */
describe("AccessPoints shows the form of each provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["Nuki", NUKI, "nuki", ["API-Token"]],
    [
      "Salto KS",
      SALTO,
      "salto-ks",
      [
        "Client-ID",
        "Client-Secret",
        "Site-ID",
        "System-User (E-Mail)",
        "Passwort des System-Users",
      ],
    ],
    [
      "Open Locker",
      OPEN_LOCKER,
      "open-locker",
      ["Server-Adresse", "E-Mail des technischen Kontos", "Passwort"],
    ],
    ["iFBS", IFBS, "ifbs", ["Server-Adresse", "API Key ID", "API Key"]],
    [
      "Pareva",
      PAREVA,
      "pareva",
      ["Server-Adresse", "Locker-ID", "Benutzername", "Passwort"],
    ],
  ])(
    "asks %s first for what the connection needs",
    async (title, provider, id, labels) => {
      const wrapper = await mountAccessPointsPage({
        providers: [provider],
        accessPoints: [],
        apps: [storedApp(id)],
      });

      const settings = await openSettings(wrapper, title);

      expect(formLabels(settings)).toEqual(labels);
    }
  );

  it("shows a stored secret as „Gespeichert“ with „Ändern“, never its value", async () => {
    const wrapper = await mountAccessPointsPage({
      apps: [
        storedApp("nuki", {
          apiToken: "token-im-klartext",
          storedSecrets: { apiToken: true },
        }),
      ],
    });

    const settings = await openSettings(wrapper, "Nuki");

    const secret = storedSecret(settings, "API-Token");
    expect(secret.text()).toContain("Gespeichert");
    expect(buttonIn(secret, "Ändern")).toBeTruthy();
    expect(inputLabelled(settings, "API-Token")).toBeFalsy();
    expect(settings.html()).not.toContain("token-im-klartext");
  });

  // Until the backend stops answering secrets (ECCdigital/tickets#1105), a
  // secret in the answer counts as stored.
  it("counts a secret the tenant still carries as stored", async () => {
    const wrapper = await mountAccessPointsPage({
      apps: [storedApp("nuki", { apiToken: "token-im-klartext" })],
    });

    const settings = await openSettings(wrapper, "Nuki");

    expect(storedSecret(settings, "API-Token")).toBeTruthy();
    expect(settings.html()).not.toContain("token-im-klartext");
  });

  it("opens an empty field with „Ändern“ and closes it with „Gespeichertes behalten“", async () => {
    const wrapper = await mountAccessPointsPage({
      apps: [storedApp("nuki", { storedSecrets: { apiToken: true } })],
    });
    const settings = await openSettings(wrapper, "Nuki");

    await click(wrapper, storedSecret(settings, "API-Token"), "Ändern");

    const input = inputLabelled(settings, "API-Token");
    expect(input.element.value).toBe("");
    expect(input.attributes("type")).toBe("password");
    expect(settings.find(".mdi-eye, .mdi-eye-off").exists()).toBe(false);
    await input.setValue("neu");
    await click(wrapper, settings, "Gespeichertes behalten");

    expect(inputLabelled(settings, "API-Token")).toBeFalsy();
    expect(storedSecret(settings, "API-Token")).toBeTruthy();
  });

  it("folds the rarer settings with a line that names what differs", async () => {
    const wrapper = await mountAccessPointsPage({
      apps: [storedApp("nuki", { apiBaseUrl: "https://api.nuki.io" })],
    });
    const settings = await openSettings(wrapper, "Nuki");

    const more = settings.find("[data-test='access-app-more']");
    expect(more.text()).toContain("Weitere Einstellungen");
    expect(more.text()).toContain("alles auf Standard");
    expect(inputLabelled(settings, "API-Adresse")).toBeFalsy();

    await more.find("button").trigger("click");
    await settle(wrapper);
    await inputLabelled(settings, "API-Adresse").setValue(
      "https://nuki.example"
    );
    await settings
      .find("[data-test='access-app-more']")
      .find("button")
      .trigger("click");
    await settle(wrapper);

    expect(settings.find("[data-test='access-app-more']").text()).toContain(
      "API-Adresse: https://nuki.example"
    );
  });

  it.each([
    [
      "Nuki",
      NUKI,
      storedApp("nuki", {
        customerService: { name: "Hausmeisterei", email: "", phone: "" },
      }),
      "Kundenservice: angegeben",
    ],
    [
      "Salto KS",
      SALTO,
      storedApp("salto-ks", { environment: "accept" }),
      "Umgebung: Accept (Sandbox)",
    ],
    [
      "iFBS",
      IFBS,
      storedApp("ifbs", {
        storedSecrets: { apiKey: true, secretPhrase: true },
      }),
      "Secret Phrase: gespeichert",
    ],
  ])("names what differs at %s", async (title, provider, app, line) => {
    const wrapper = await mountAccessPointsPage({
      providers: [provider],
      accessPoints: [],
      apps: [app],
    });

    const settings = await openSettings(wrapper, title);

    expect(settings.find("[data-test='access-app-more']").text()).toContain(
      line
    );
  });

  it("keeps a stored Salto KS configuration without environment on Accept", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [SALTO],
      accessPoints: [],
      apps: [storedApp("salto-ks")],
    });

    const settings = await openSettings(wrapper, "Salto KS");

    expect(settings.find("[data-test='access-app-more']").text()).toContain(
      "Umgebung: Accept (Sandbox)"
    );
  });

  it.each([
    [
      "Nuki",
      NUKI,
      "nuki",
      "Welche Rechte braucht der Token?",
      "smartlock.action",
    ],
    [
      "Salto KS",
      SALTO,
      "salto-ks",
      "Voraussetzungen in Salto KS",
      "site_admin",
    ],
    [
      "Open Locker",
      OPEN_LOCKER,
      "open-locker",
      "Was das technische Konto braucht",
      "Nutzungsbedingungen",
    ],
  ])(
    "folds the help of %s above the form",
    async (title, provider, id, heading, body) => {
      const wrapper = await mountAccessPointsPage({
        providers: [provider],
        accessPoints: [],
        apps: [storedApp(id)],
      });
      const settings = await openSettings(wrapper, title);

      const help = settings.find("[data-test='access-app-help']");
      expect(help.text()).toBe(heading);

      await help.find("button").trigger("click");
      await settle(wrapper);

      expect(settings.find("[data-test='access-app-help']").text()).toContain(
        body
      );
    }
  );
});

function saveCaption(settings) {
  return settings.find("[data-test='access-app-save-caption']").text();
}

function testResult(settings) {
  const result = settings.find("[data-test='access-app-test-result']");
  return result.exists() ? result.text() : "";
}

async function testConnection(wrapper, settings, data) {
  ApiAccessAppsService.testConnection.mockResolvedValueOnce({ data });
  await click(wrapper, settings, "Verbindung testen");
}

const NUKI_STORED = storedApp("nuki", {
  apiBaseUrl: "https://api.nuki.io",
  storedSecrets: { apiToken: true },
});

/**
 * Testing and saving are apart and per provider (ECCdigital/tickets#1104):
 * a test saves nothing, a save goes to the provider's own route - also
 * untested or after a failed test - and the sentence beside „Speichern“ says
 * what the save makes of it.
 */
describe("AccessPoints tests and saves each provider on its own", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessAppsService.saveApp.mockImplementation((tenant, provider, body) =>
      Promise.resolve({
        data: storedApp(provider, {
          ...body,
          storedSecrets: { apiToken: true },
          connectionState: "unchecked",
        }),
      })
    );
  });

  it("tests with the stored secret, without saving", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");

    await testConnection(wrapper, settings, {
      success: true,
      message: "Connection successful",
    });

    expect(ApiAccessAppsService.testConnection).toHaveBeenCalledWith(
      "t1",
      { apiToken: "", apiBaseUrl: "https://api.nuki.io" },
      "nuki"
    );
    expect(ApiAccessAppsService.saveApp).not.toHaveBeenCalled();
    expect(testResult(settings)).toContain("Verbindung erfolgreich!");
  });

  it("says beside „Speichern“ what the save makes of it", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");

    expect(saveCaption(settings)).toBe("Ungeprüft. Speichern geht trotzdem.");

    await testConnection(wrapper, settings, { success: true });
    expect(saveCaption(settings)).toBe("Geprüft.");

    await testConnection(wrapper, settings, {
      success: false,
      message: "Nuki API answered 401",
    });
    expect(saveCaption(settings)).toBe(
      "Test gescheitert. Speichern markiert es als gestört."
    );
  });

  it("lets the result lapse once a field changes after the test", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");
    await testConnection(wrapper, settings, { success: true });

    await click(wrapper, storedSecret(settings, "API-Token"), "Ändern");
    await inputLabelled(settings, "API-Token").setValue("neuer-token");
    await settle(wrapper);

    expect(saveCaption(settings)).toBe("Ungeprüft. Speichern geht trotzdem.");
    expect(testResult(settings)).toBe("");
  });

  it("saves after a failed test through the provider's route alone", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");
    await testConnection(wrapper, settings, {
      success: false,
      message: "Nuki API answered 401",
    });
    ApiAccessAppsService.saveApp.mockResolvedValueOnce({
      data: { ...NUKI_STORED, connectionState: "failing" },
    });

    await click(wrapper, settings, "Speichern");

    expect(ApiAccessAppsService.saveApp).toHaveBeenCalledTimes(1);
    expect(ApiAccessAppsService.saveApp.mock.calls[0][1]).toBe("nuki");
    expect(ApiTenantService.submitTenant).not.toHaveBeenCalled();
    expect(stateOf(wrapper, "Nuki")).toBe("Gestört");
    expect(settingsOf(wrapper, "Nuki").exists()).toBe(false);
  });

  it("sends no secret left empty, and one typed in", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    let settings = await openSettings(wrapper, "Nuki");

    await click(wrapper, settings, "Speichern");

    expect(ApiAccessAppsService.saveApp).toHaveBeenLastCalledWith(
      "t1",
      "nuki",
      {
        apiBaseUrl: "https://api.nuki.io",
        customerService: { name: "", email: "", phone: "" },
      }
    );

    settings = await openSettings(wrapper, "Nuki");
    await click(wrapper, storedSecret(settings, "API-Token"), "Ändern");
    await inputLabelled(settings, "API-Token").setValue("neuer-token");
    await click(wrapper, settings, "Speichern");

    expect(ApiAccessAppsService.saveApp.mock.calls.at(-1)[2].apiToken).toBe(
      "neuer-token"
    );
  });

  it("says so when the save fails, and keeps the form", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");
    ApiAccessAppsService.saveApp.mockRejectedValueOnce(forbiddenError());

    await click(wrapper, settings, "Speichern");

    expect(settingsOf(wrapper, "Nuki").exists()).toBe(true);
    expect(
      settingsOf(wrapper, "Nuki")
        .find("[data-test='access-app-save-error']")
        .exists()
    ).toBe(true);
  });
});

/**
 * A fault the test names a field for stands in the result and at the field
 * (ECCdigital/tickets#1104); the backend names missing entries since #1102.
 */
describe("AccessPoints puts the faults of a test at the field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function fieldError(settings, label) {
    const field = settings
      .findAll(".v-input")
      .wrappers.find((input) => input.find("label").text() === label);
    return field.find(".v-messages").text();
  }

  it("names a required entry that is missing", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [PAREVA],
      accessPoints: [],
      apps: [storedApp("pareva", { serverUrl: "https://pareva.example" })],
    });
    const settings = await openSettings(wrapper, "Pareva");

    await testConnection(wrapper, settings, {
      success: false,
      code: "missing_fields",
      message: "Missing required fields: lockerId",
      missing: [{ field: "lockerId" }],
    });

    expect(testResult(settings)).toContain("Es fehlen Angaben: Locker-ID.");
    expect(testResult(settings)).not.toContain("Missing");
    expect(fieldError(settings, "Locker-ID")).toBe("Bitte ausfüllen.");
  });

  it("names a secret the stored one cannot stand in for", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [OPEN_LOCKER],
      accessPoints: [],
      apps: [
        storedApp("open-locker", {
          serverUrl: "https://locker.example",
          email: "technik@example.org",
          storedSecrets: { password: true },
        }),
      ],
    });
    const settings = await openSettings(wrapper, "Open Locker");
    await inputLabelled(settings, "E-Mail des technischen Kontos").setValue(
      "konto@example.org"
    );

    await testConnection(wrapper, settings, {
      success: false,
      code: "missing_secret",
      missing: [{ field: "password", reason: "email_changed" }],
    });

    expect(testResult(settings)).toContain("Es fehlt: Passwort.");
    expect(storedSecret(settings, "Passwort").text()).toContain(
      "Gehört zu den bisherigen Angaben. Bitte neu eingeben."
    );
  });

  it("puts a refusal of Open Locker at e-mail and password", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [OPEN_LOCKER],
      accessPoints: [],
      apps: [
        storedApp("open-locker", {
          serverUrl: "https://locker.example",
          email: "technik@example.org",
          storedSecrets: { password: true },
        }),
      ],
    });
    const settings = await openSettings(wrapper, "Open Locker");

    await testConnection(wrapper, settings, {
      success: false,
      code: "invalid_credentials",
      message: "Invalid credentials",
    });

    expect(testResult(settings)).toContain(
      "Anmeldung fehlgeschlagen: E-Mail oder Passwort des technischen Kontos stimmen nicht."
    );
    expect(fieldError(settings, "E-Mail des technischen Kontos")).toBe(
      "Vom Anbieter abgelehnt."
    );
    expect(storedSecret(settings, "Passwort").text()).toContain(
      "Vom Anbieter abgelehnt."
    );
  });

  it.each([
    [
      "terms_not_accepted",
      "Nutzungsbedingungen von Open Locker nicht akzeptiert",
    ],
    ["email_not_verified", "Seine E-Mail-Adresse ist nicht bestätigt."],
  ])("says why Open Locker blocks the account (%s)", async (code, text) => {
    const wrapper = await mountAccessPointsPage({
      providers: [OPEN_LOCKER],
      accessPoints: [],
      apps: [storedApp("open-locker", { storedSecrets: { password: true } })],
    });
    const settings = await openSettings(wrapper, "Open Locker");

    await testConnection(wrapper, settings, {
      success: false,
      code,
      message: "Account blocked",
    });

    expect(testResult(settings)).toContain(text);
    expect(testResult(settings)).not.toContain("Account blocked");
  });

  it("shows the provider's message where it names no field", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [IFBS],
      accessPoints: [],
      apps: [storedApp("ifbs", { storedSecrets: { apiKey: true } })],
    });
    const settings = await openSettings(wrapper, "iFBS");

    await testConnection(wrapper, settings, {
      success: false,
      message: "iFBS antwortet nicht.",
    });

    expect(testResult(settings)).toContain("iFBS antwortet nicht.");
  });

  it("says in German that the test failed when the request fails", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");
    ApiAccessAppsService.testConnection.mockRejectedValueOnce({
      message: "Request failed with status code 500",
      response: { status: 500, data: "Could not test access connection" },
    });

    await click(wrapper, settings, "Verbindung testen");

    expect(testResult(settings)).toContain(
      "Die Verbindung konnte nicht hergestellt werden."
    );
  });
});

/** Salto KS as the tenant stored it, its identity on site-1. */
function storedSalto(overrides = {}) {
  return storedApp("salto-ks", {
    title: "Salto KS",
    clientId: "client-1",
    username: "biletado@example.com",
    siteId: "site-1",
    environment: "accept",
    storedSecrets: { clientSecret: true, password: true },
    ...overrides,
  });
}

const IQ = {
  customerReference: "Labortür",
  otpEnabled: true,
  online: true,
  restoreRequired: false,
  state: "activated",
};

/** The page with the settings of Salto KS unfolded. */
async function mountSalto({ app = storedSalto(), iqs = [] } = {}) {
  ApiAccessAppsService.getSaltoIqs.mockResolvedValue({ data: iqs });
  const wrapper = await mountAccessPointsPage({
    providers: [SALTO],
    accessPoints: [],
    apps: [app],
  });
  await openSettings(wrapper, "Salto KS");
  return wrapper;
}

function saltoSettings(wrapper) {
  return settingsOf(wrapper, "Salto KS");
}

async function typeInto(wrapper, label, value) {
  await inputLabelled(saltoSettings(wrapper), label).setValue(value);
  await settle(wrapper);
}

async function changeSecret(wrapper, label, value) {
  await click(wrapper, storedSecret(saltoSettings(wrapper), label), "Ändern");
  await typeInto(wrapper, label, value);
}

async function chooseEnvironment(wrapper, text) {
  const more = saltoSettings(wrapper).find("[data-test='access-app-more']");
  await more.find("button").trigger("click");
  await settle(wrapper);
  await saltoSettings(wrapper)
    .find(".v-select .v-input__slot")
    .trigger("click");
  await wrapper.vm.$nextTick();
  const option = [...document.querySelectorAll(".v-list-item")].find((item) =>
    item.textContent.includes(text)
  );
  option.click();
  await settle(wrapper);
}

async function testSalto(wrapper, data) {
  await testConnection(wrapper, saltoSettings(wrapper), data);
}

/**
 * The connection test of Salto KS runs on the stored secrets when the form
 * leaves them empty: the backend completes them as long as they belong to
 * the identity in the form, and says per secret what is missing otherwise
 * (ECCdigital/tickets#575). It moved from the tab „Schließsysteme“ into the
 * settings of the section (ECCdigital/tickets#1104).
 */
describe("AccessPoints tests Salto KS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("says it tests with the stored secrets when both fields are empty", async () => {
    const wrapper = await mountSalto();

    expect(saltoSettings(wrapper).text()).toContain(
      "Testet mit den gespeicherten Secrets."
    );
  });

  it("says it tests with the secrets of the form when both are typed in", async () => {
    const wrapper = await mountSalto();

    await changeSecret(wrapper, "Client-Secret", "secret");
    await changeSecret(wrapper, "Passwort des System-Users", "password");

    expect(saltoSettings(wrapper).text()).toContain(
      "Testet mit den Secrets aus dem Formular."
    );
  });

  it("names the client secret as missing for another client id", async () => {
    const wrapper = await mountSalto();

    await typeInto(wrapper, "Client-ID", "client-2");

    const text = saltoSettings(wrapper).text();
    expect(text).toContain(
      "Die Client-ID ist neu. Geben Sie das passende Client Secret ein."
    );
    expect(text).not.toContain("Testet mit");
  });

  it("names the password as missing for another System-User", async () => {
    const wrapper = await mountSalto();

    await typeInto(wrapper, "System-User (E-Mail)", "neu@example.com");

    expect(saltoSettings(wrapper).text()).toContain(
      "Der System-User ist neu. Geben Sie sein Passwort ein."
    );
  });

  it("names both secrets as missing for another environment", async () => {
    const wrapper = await mountSalto();

    await chooseEnvironment(wrapper, "Production");

    const text = saltoSettings(wrapper).text();
    expect(text).toContain(
      "Die Umgebung ist neu. Geben Sie das Client Secret für diese Umgebung ein."
    );
    expect(text).toContain(
      "Die Umgebung ist neu. Geben Sie das Passwort des System-Users für diese Umgebung ein."
    );
  });

  it("takes a secret typed in for the new client id and the stored password", async () => {
    const wrapper = await mountSalto();

    await typeInto(wrapper, "Client-ID", "client-2");
    await changeSecret(wrapper, "Client-Secret", "secret-2");

    expect(saltoSettings(wrapper).text()).toContain(
      "Testet mit gespeicherten Secrets und Secrets aus dem Formular."
    );
  });

  it("names a secret that was never stored", async () => {
    const wrapper = await mountSalto({
      app: storedSalto({ storedSecrets: { password: true } }),
    });

    expect(saltoSettings(wrapper).text()).toContain(
      "Es ist kein Client Secret gespeichert. Geben Sie es ein."
    );
  });

  it("sends empty secret fields empty, next to the identity", async () => {
    const wrapper = await mountSalto();

    await testSalto(wrapper, { success: true });

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
    const wrapper = await mountSalto();

    await typeInto(wrapper, "Site-ID", "site-2");

    expect(saltoSettings(wrapper).text()).toContain(
      "Testet mit den gespeicherten Secrets."
    );
  });

  it("names per secret what is missing and why", async () => {
    const wrapper = await mountSalto();

    await testSalto(wrapper, {
      success: false,
      code: "missing_secret",
      message: "Missing secrets: clientSecret, password",
      missing: [
        { field: "clientSecret", reason: "client_id_changed" },
        { field: "password", reason: "environment_changed" },
      ],
    });

    const text = saltoSettings(wrapper).text();
    expect(text).toContain(
      "Die Client-ID ist neu. Geben Sie das passende Client Secret ein."
    );
    expect(text).toContain(
      "Die Umgebung ist neu. Geben Sie das Passwort des System-Users für diese Umgebung ein."
    );
    expect(text).not.toContain("Missing secrets");
  });

  it("names per field which required entry is missing", async () => {
    const wrapper = await mountSalto();

    await testSalto(wrapper, {
      success: false,
      code: "missing_fields",
      message: "Missing required fields: clientId, username",
      missing: [{ field: "clientId" }, { field: "username" }],
    });

    const text = saltoSettings(wrapper).text();
    expect(text).toContain("Die Client-ID fehlt. Tragen Sie sie ein.");
    expect(text).toContain("Der System-User fehlt. Tragen Sie ihn ein.");
    expect(text).not.toContain("Missing required fields");
  });

  it("shows a failure without checks as the plain message", async () => {
    const wrapper = await mountSalto();

    await testSalto(wrapper, {
      success: false,
      message: "Salto ist nicht erreichbar.",
    });

    expect(saltoSettings(wrapper).text()).toContain(
      "Salto ist nicht erreichbar."
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

/** The backend's answer to a test that ran (ECCdigital/tickets#576). */
function saltoAnswer({ checks = {}, iqs, ...overrides } = {}) {
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

async function testedSalto(data, options) {
  const wrapper = await mountSalto(options);
  await testSalto(wrapper, data);
  return wrapper;
}

function headline(wrapper) {
  return saltoSettings(wrapper)
    .find("[data-test='salto-check-headline']")
    .text();
}

function checkRow(wrapper, key) {
  return saltoSettings(wrapper).find(`[data-test~='salto-check-${key}']`);
}

/**
 * The result of the test of Salto KS stays the checklist of today, one row
 * per check (ECCdigital/tickets#576), now on the right of the settings.
 */
describe("AccessPoints shows the checks of the Salto KS test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the six checks in their fixed order", async () => {
    const wrapper = await testedSalto(saltoAnswer());

    const rows = saltoSettings(wrapper)
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
    expect(checkRow(wrapper, "site").text()).toContain("4 Schlösser");
  });

  it("heads a working connection with its environment and the number of hints", async () => {
    const wrapper = await testedSalto(saltoAnswer());

    expect(headline(wrapper)).toBe(
      "Verbunden mit Salto KS (accept), 1 Hinweis"
    );
  });

  it("heads a failed connection as no connection and leaves the rest unchecked", async () => {
    const wrapper = await testedSalto(
      saltoAnswer({
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
    expect(checkRow(wrapper, "credentials").text()).toContain(
      "Salto lehnt Client-ID oder Client Secret ab."
    );
    for (const key of ["login", "site", "remoteAccess", "iqs"]) {
      expect(checkRow(wrapper, key).text()).toContain("nicht geprüft");
    }
    expect(
      inputLabelled(saltoSettings(wrapper), "Client-ID").element.closest(
        ".v-input"
      ).textContent
    ).toContain("Vom Anbieter abgelehnt.");
  });

  it.each([
    ["login", "invalid_grant", "Salto lehnt System-User oder Passwort ab."],
    ["site", "site_forbidden", "nicht die Rolle „site_admin“"],
    ["site", "site_missing", "Tragen Sie die Site-ID ein"],
  ])("explains %s failed with %s in German", async (key, code, text) => {
    const wrapper = await testedSalto(
      saltoAnswer({ checks: { [key]: { status: "failed", code } } })
    );

    expect(checkRow(wrapper, key).text()).toContain(text);
  });

  it("says the remote locking right cannot be checked over the API", async () => {
    const wrapper = await testedSalto(saltoAnswer());

    expect(checkRow(wrapper, "remoteLockingRight").text()).toContain(
      "über die API nicht prüfbar"
    );
  });

  it("names open IQs and devices offline, with a jump to the activation", async () => {
    const wrapper = await testedSalto(
      saltoAnswer({
        iqs: [
          { ...IQ, id: "1" },
          { ...IQ, id: "2", state: "pending_pin" },
          { ...IQ, id: "3", state: "reactivation_required", online: false },
        ],
      })
    );
    const scrolled = [];
    Element.prototype.scrollIntoView = vi.fn(function () {
      scrolled.push(this);
    });

    const text = checkRow(wrapper, "iqs").text();
    expect(text).toContain("3 IQs, 1 von 3 aktiviert");
    expect(text).toContain("2 IQs brauchen eine Aktivierung");
    expect(text).toContain("1 IQ offline");

    await checkRow(wrapper, "iqs")
      .find("[data-test='salto-to-activation']")
      .trigger("click");

    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].textContent).toContain("IQ-Aktivierung für Remote-Open");
  });

  it("names per secret what the test ran with", async () => {
    const wrapper = await testedSalto(
      saltoAnswer({ testedWith: { clientSecret: "stored", password: "form" } })
    );

    expect(
      saltoSettings(wrapper).find("[data-test='salto-tested-with']").text()
    ).toBe(
      "Getestet mit: Client Secret gespeichert, Passwort aus dem Formular"
    );
  });
});

/**
 * Salto hands out the first secret once per System-User and IQ; the IQ
 * activation stays in the settings of Salto KS until the section shows the
 * IQs as a row of their own (ECCdigital/tickets#1107).
 */
describe("AccessPoints activates the IQs of Salto KS in its settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("names a new System-User as the way out of an IQ activated before", async () => {
    ApiAccessAppsService.startSaltoIqActivation.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { code: "salto_iq_already_activated_at_salto" },
      },
    });
    const wrapper = await mountSalto({
      iqs: [{ ...IQ, id: "1", state: "not_activated" }],
    });

    await click(wrapper, saltoSettings(wrapper), "Aktivierung starten");
    const wizard = () =>
      [...document.querySelectorAll(".v-dialog")].find((d) =>
        d.textContent.includes("IQ aktivieren")
      );
    wizard().querySelector("input[type='checkbox']").click();
    await wrapper.vm.$nextTick();
    [...wizard().querySelectorAll("button")]
      .find((b) => b.textContent.includes("Weiter"))
      .click();
    await settle(wrapper);

    const text = wizard().querySelector(".v-alert.error--text").textContent;
    expect(text).toContain("bereits aktiviert");
    expect(text).toContain("neuen System-User");
    // The stepper measures its next step in an animation frame; let it run
    // while the dialog still stands.
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });

  it("offers no activation while Salto KS is switched off", async () => {
    const wrapper = await mountSalto({
      app: storedSalto({ active: false, connectionState: "disabled" }),
      iqs: [{ ...IQ, id: "1", state: "not_activated" }],
    });

    expect(saltoSettings(wrapper).text()).not.toContain(
      "IQ-Aktivierung für Remote-Open"
    );
  });
});

/** The confirmation lands in Vuetify's overlay container, not the page. */
function identityQuestion() {
  return document.querySelector("[data-test='salto-identity-change']");
}

async function answerIdentity(wrapper, text) {
  const button = [...identityQuestion().querySelectorAll("button")].find((b) =>
    b.textContent.includes(text)
  );
  button.click();
  await settle(wrapper);
}

/** Two IQs whose activation belongs to the stored identity, one without. */
function iqsOfStoredIdentity() {
  return [
    { ...IQ, id: "1", customerReference: "Labortür", state: "activated" },
    { ...IQ, id: "2", customerReference: "Werkstatt", state: "degraded" },
    { ...IQ, id: "3", customerReference: "Lager", state: "not_activated" },
  ];
}

async function saveSalto(wrapper) {
  await click(wrapper, saltoSettings(wrapper), "Speichern");
}

function savedSalto() {
  return ApiAccessAppsService.saveApp.mock.calls.at(-1)[2];
}

/**
 * An IQ activation belongs to the site, the System-User and the environment
 * it was made under; after a change it rests and holds again once the admin
 * changes back (ECCdigital/tickets#505). So the settings ask before they
 * save such a change while IQs are activated (ECCdigital/tickets#574).
 */
describe("AccessPoints asks before the identity of Salto KS changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessAppsService.saveApp.mockImplementation((tenant, provider, body) =>
      Promise.resolve({ data: storedSalto(body) })
    );
  });

  it("asks before saving another site, naming the IQs that rest", async () => {
    const wrapper = await mountSalto({ iqs: iqsOfStoredIdentity() });

    await typeInto(wrapper, "Site-ID", "site-2");
    await saveSalto(wrapper);

    expect(ApiAccessAppsService.saveApp).not.toHaveBeenCalled();
    const text = identityQuestion().textContent;
    expect(text).toContain("2 IQs");
    expect(text).toContain("ruhen");
  });

  it("saves the change once the admin confirms", async () => {
    const wrapper = await mountSalto({ iqs: iqsOfStoredIdentity() });

    await typeInto(wrapper, "Site-ID", "site-2");
    await saveSalto(wrapper);
    await answerIdentity(wrapper, "Trotzdem speichern");

    expect(ApiAccessAppsService.saveApp).toHaveBeenCalledTimes(1);
    expect(savedSalto().siteId).toBe("site-2");
  });

  it("saves nothing when the admin cancels, and keeps the form", async () => {
    const wrapper = await mountSalto({ iqs: iqsOfStoredIdentity() });

    await typeInto(wrapper, "Site-ID", "site-2");
    await saveSalto(wrapper);
    await answerIdentity(wrapper, "Abbrechen");

    expect(ApiAccessAppsService.saveApp).not.toHaveBeenCalled();
    expect(inputLabelled(saltoSettings(wrapper), "Site-ID").element.value).toBe(
      "site-2"
    );
  });

  it("asks before saving another System-User", async () => {
    const wrapper = await mountSalto({ iqs: iqsOfStoredIdentity() });

    await typeInto(wrapper, "System-User (E-Mail)", "neu@example.com");
    await saveSalto(wrapper);

    expect(identityQuestion().textContent).toContain("2 IQs");
  });

  it("asks before saving another environment", async () => {
    const wrapper = await mountSalto({ iqs: iqsOfStoredIdentity() });

    await chooseEnvironment(wrapper, "Production");
    await saveSalto(wrapper);

    expect(identityQuestion().textContent).toContain("2 IQs");
  });

  it("names a single IQ in the singular", async () => {
    const wrapper = await mountSalto({ iqs: [{ ...IQ, id: "1" }] });

    await typeInto(wrapper, "Site-ID", "site-2");
    await saveSalto(wrapper);

    expect(identityQuestion().textContent).toContain("1 IQ ");
  });

  it("saves without asking when no IQ is activated", async () => {
    const wrapper = await mountSalto({
      iqs: [{ ...IQ, id: "1", state: "not_activated" }],
    });

    await typeInto(wrapper, "Site-ID", "site-2");
    await saveSalto(wrapper);

    expect(identityQuestion()).toBeNull();
    expect(savedSalto().siteId).toBe("site-2");
  });

  // A rotation of the client keeps the activations valid.
  it("saves without asking when only the client id changes", async () => {
    const wrapper = await mountSalto({ iqs: iqsOfStoredIdentity() });

    await typeInto(wrapper, "Client-ID", "client-2");
    await saveSalto(wrapper);

    expect(identityQuestion()).toBeNull();
    expect(savedSalto().clientId).toBe("client-2");
  });

  // Read as accept, as the backend does - not a change of environment.
  it("saves without asking when a stored configuration has no environment", async () => {
    const wrapper = await mountSalto({
      app: storedSalto({ environment: undefined }),
      iqs: iqsOfStoredIdentity(),
    });

    await typeInto(wrapper, "Client-ID", "client-2");
    await saveSalto(wrapper);

    expect(identityQuestion()).toBeNull();
    expect(ApiAccessAppsService.saveApp).toHaveBeenCalledTimes(1);
  });

  it("asks against the saved identity after a save, with the IQs loaded anew", async () => {
    const wrapper = await mountSalto({ iqs: iqsOfStoredIdentity() });

    await typeInto(wrapper, "Site-ID", "site-2");
    await saveSalto(wrapper);
    // Under site-2 no IQ has an activation of its own yet.
    ApiAccessAppsService.getSaltoIqs.mockResolvedValue({
      data: [{ ...IQ, id: "1", state: "not_activated" }],
    });
    await answerIdentity(wrapper, "Trotzdem speichern");

    await openSettings(wrapper, "Salto KS");
    await typeInto(wrapper, "Site-ID", "site-1");
    await saveSalto(wrapper);

    expect(identityQuestion()).toBeNull();
    expect(ApiAccessAppsService.saveApp).toHaveBeenCalledTimes(2);
    expect(savedSalto().siteId).toBe("site-1");
  });
});

/**
 * The access log moves from the tab „Schließsysteme“ to the end of the page,
 * unchanged and under the same permission (ECCdigital/tickets#1104).
 */
describe("AccessPoints exports the access log at the end of the page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers the export beneath the sections", async () => {
    BookingPermissionService.allowAuditExport.mockReturnValue(true);
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });

    const exporter = wrapper.findComponent({ name: "AccessAuditExport" });
    expect(exporter.exists()).toBe(true);
    const lastSection = sections(wrapper).at(-1);
    expect(
      lastSection.element.compareDocumentPosition(exporter.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    BookingPermissionService.allowAuditExport.mockReturnValue(false);
  });

  it("offers no export without the permission", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });

    expect(wrapper.findComponent({ name: "AccessAuditExport" }).exists()).toBe(
      false
    );
  });

  it("shows neither tabs nor a save bar", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });

    expect(wrapper.find(".v-tabs").exists()).toBe(false);
    expect(wrapper.findComponent({ name: "SaveBar" }).exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Schließsysteme");
  });
});

/**
 * „Verbindung entfernen“ stands in the foot of the settings
 * (ECCdigital/tickets#1104); when it is barred and what it says then is
 * ECCdigital/tickets#1107's.
 */
describe("AccessPoints removes the connection of a provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes it through the provider's route, and the section with it", async () => {
    ApiAccessAppsService.removeApp.mockResolvedValue({});
    const wrapper = await mountAccessPointsPage({
      accessPoints: [PAREVA_LOCKER],
      apps: [NUKI_STORED],
    });
    const settings = await openSettings(wrapper, "Nuki");
    ApiAccessAppsService.getProviders.mockResolvedValue({ data: [PAREVA] });

    await click(wrapper, settings, "Verbindung entfernen");

    expect(ApiAccessAppsService.removeApp).toHaveBeenCalledWith("t1", "nuki");
    expect(sectionOf(wrapper, "Nuki")).toBeUndefined();
    expect(sectionOf(wrapper, "Pareva")).toBeTruthy();
  });

  it("says so when the backend refuses, and keeps the settings", async () => {
    ApiAccessAppsService.removeApp.mockRejectedValue(
      lifecycleError(409, "access_app_has_access_points", {
        provider: "nuki",
        accessPoints: 1,
      })
    );
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");

    await click(wrapper, settings, "Verbindung entfernen");

    expect(
      settingsOf(wrapper, "Nuki")
        .find("[data-test='access-app-remove-error']")
        .exists()
    ).toBe(true);
  });

  it("offers no removal before anything is stored", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [] });
    const settings = await openSettings(wrapper, "Nuki");

    expect(buttonIn(settings, "Verbindung entfernen")).toBeFalsy();
  });
});

/** The question before leaving lands in Vuetify's overlay container. */
function leaveQuestion() {
  return [...document.querySelectorAll(".v-dialog--active")].find((dialog) =>
    dialog.textContent.includes("Ungespeicherte Änderungen")
  );
}

async function leave(wrapper) {
  const next = vi.fn();
  leaveGuard({ path: "/bookables" }, { path: "/tenant/access-points" }, next);
  await settle(wrapper);
  return next;
}

/**
 * Settings that are not saved do not get lost without a word when the page
 * is left (ECCdigital/tickets#1104).
 */
describe("AccessPoints asks before unsaved settings are left", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessAppsService.saveApp.mockResolvedValue({ data: NUKI_STORED });
  });

  async function changedNuki() {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    const settings = await openSettings(wrapper, "Nuki");
    await click(wrapper, storedSecret(settings, "API-Token"), "Ändern");
    await inputLabelled(settings, "API-Token").setValue("neuer-token");
    await settle(wrapper);
    return wrapper;
  }

  it("asks, and leaves once the changes are discarded", async () => {
    const wrapper = await changedNuki();

    const next = await leave(wrapper);

    expect(next).not.toHaveBeenCalled();
    const discard = [...leaveQuestion().querySelectorAll("button")].find((b) =>
      b.textContent.includes("Änderungen verwerfen")
    );
    discard.click();
    await settle(wrapper);
    expect(next).toHaveBeenCalledWith();
  });

  it("leaves without asking while the settings hold nothing new", async () => {
    const wrapper = await mountAccessPointsPage({ apps: [NUKI_STORED] });
    await openSettings(wrapper, "Nuki");

    const next = await leave(wrapper);

    expect(next).toHaveBeenCalledWith();
    expect(leaveQuestion()).toBeFalsy();
  });

  it("leaves without asking once the changes are saved", async () => {
    const wrapper = await changedNuki();
    await click(wrapper, settingsOf(wrapper, "Nuki"), "Speichern");

    const next = await leave(wrapper);

    expect(next).toHaveBeenCalledWith();
  });

  it("leaves without asking once the changes are cancelled", async () => {
    const wrapper = await changedNuki();
    await click(wrapper, settingsOf(wrapper, "Nuki"), "Abbrechen");

    const next = await leave(wrapper);

    expect(next).toHaveBeenCalledWith();
  });
});

/** The dialog to create or edit an access point, as the page opened it. */
function editDialog(wrapper) {
  return wrapper.findComponent({ name: "AccessPointEditDialog" });
}

function labelsIn(component) {
  return component.findAll("label").wrappers.map((label) => label.text());
}

async function create(wrapper, title) {
  await sectionOf(wrapper, title)
    .find("[data-test='provider-section-create']")
    .trigger("click");
  await settle(wrapper);
}

/**
 * The creation starts in the section of a provider, so the dialog opens with
 * that provider settled and asks for none (ECCdigital/tickets#1103).
 */
describe("AccessPoints creates in the section of the provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });
  });

  it("creates a Schließfachanlage of Pareva without asking for the provider", async () => {
    const wrapper = await mountAccessPointsPage();

    await create(wrapper, "Pareva");

    const dialog = editDialog(wrapper);
    expect(dialog.findComponent({ name: "v-card" }).text()).toContain(
      "Schließfachanlage anlegen"
    );
    expect(labelsIn(dialog)).not.toContain("Anbieter");
    await dialog.find(".label-field input").setValue("Schließfächer Bahnhof");
    await dialog
      .find(".external-id-field input")
      .setValue("66570d1a1f9b6357ed971747");
    await dialog.find(".save-access-point").trigger("click");
    await settle(wrapper);

    expect(ApiAccessPointService.storeAccessPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "pareva",
        type: "locker",
        label: "Schließfächer Bahnhof",
        externalId: "66570d1a1f9b6357ed971747",
      }),
      "t1"
    );
  });

  it("offers the listing of the section's provider alone", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [NUKI, OPEN_LOCKER],
      accessPoints: [],
    });

    await create(wrapper, "Nuki");

    expect(ApiAccessAppsService.getAccessPoints).toHaveBeenCalledWith(
      "t1",
      "nuki"
    );
    expect(ApiAccessAppsService.getAccessPoints).not.toHaveBeenCalledWith(
      "t1",
      "open-locker"
    );
    expect(labelsIn(editDialog(wrapper))).not.toContain("Anbieter");
  });

  it("saves a door typed in by hand for the section's provider", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [OPEN_LOCKER, NUKI],
      accessPoints: [],
    });

    await create(wrapper, "Nuki");
    const dialog = editDialog(wrapper);
    await dialog.find("[data-test='pick-manual']").trigger("click");
    await dialog.find(".label-field input").setValue("Hintereingang");
    await dialog.find(".external-id-field input").setValue("lock-2");
    await dialog.find(".save-access-point").trigger("click");
    await settle(wrapper);

    expect(ApiAccessPointService.storeAccessPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "nuki",
        type: "door",
        label: "Hintereingang",
        externalId: "lock-2",
      }),
      "t1"
    );
  });
});

// An Open Locker Schließfachanlage (#1037): it carries its own Fächer.
const OPEN_LOCKER_ANLAGE = {
  id: "ap-open-locker-anlage",
  type: "locker",
  mode: "remote",
  provider: "open-locker",
  label: "Fahrradgarage Süd",
  validationRules: [],
  config: {
    compartments: [
      {
        id: "9b2f6c1e-3d4a-4f5b-8c7d-1e2f3a4b5c6d",
        number: 1,
        lockerBank: { id: "bank-labor", name: "Labor Fachbank 1" },
        outOfService: false,
      },
    ],
  },
};

// A fixed Fach of Open Locker (#1036): a door by type.
const OPEN_LOCKER_FACH = {
  id: "ap-open-locker",
  type: "door",
  mode: "remote",
  provider: "open-locker",
  label: "Labor Fachbank 1 · Fach 2",
  externalId: "4f9c2a1e-0b7d-4c3a-9e51-2d6f8a0b1c3d",
  validationRules: [],
};

function rowOf(wrapper, label) {
  return wrapper
    .findAll("[data-test='access-point-row']")
    .wrappers.find((row) => row.text().includes(label));
}

/** The row menu detaches into the `data-app` container, so it is read there. */
async function openRowMenu(wrapper, label) {
  await rowOf(wrapper, label).find("[data-test='row-menu']").trigger("click");
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
  return document.querySelector(".menuable__content__active");
}

/** The entries of the row menu „…“, top to bottom. */
async function menuEntries(wrapper, label) {
  const menu = await openRowMenu(wrapper, label);
  return [...menu.querySelectorAll(".v-list-item")].map((item) =>
    item.textContent.trim()
  );
}

/** Clicks the entry of the row menu with the key of its action. */
async function clickRowAction(wrapper, label, key) {
  const menu = await openRowMenu(wrapper, label);
  menu.querySelector(`[data-test='row-action-${key}']`).click();
  await settle(wrapper);
}

/** Clicks one of the icons the row shows: `qr` or `edit`. */
async function clickRowIcon(wrapper, label, name) {
  await rowOf(wrapper, label)
    .find(`[data-test='row-${name}']`)
    .trigger("click");
  await settle(wrapper);
}

function dialogCard(wrapper, name) {
  return wrapper.findComponent({ name }).findComponent({ name: "v-card" });
}

const IFBS_LOCKER = {
  id: "ap-ifbs",
  type: "locker",
  provider: "ifbs",
  label: "Fahrradboxen Bahnhof",
  externalId: "LOC-4711",
  validationRules: [],
};

/** One access point of each kind and provider the menu tells apart. */
async function mountEveryKind() {
  return mountAccessPointsPage({
    providers: [NUKI, PAREVA, OPEN_LOCKER, IFBS],
    accessPoints: [
      DOOR,
      PAREVA_LOCKER,
      OPEN_LOCKER_FACH,
      OPEN_LOCKER_ANLAGE,
      IFBS_LOCKER,
    ],
  });
}

/**
 * QR-Code and Bearbeiten stand in each row as icons, always in the same
 * place; what is rare lies in the menu „…“, by kind and provider
 * (ECCdigital/tickets#1108). Each action leads where it led before.
 */
describe("AccessPoints offers the actions of each access point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the QR code at doors, fixed Fächer and Open Locker Schließfachanlagen", async () => {
    const wrapper = await mountEveryKind();

    const hasQr = (label) =>
      rowOf(wrapper, label).find("[data-test='row-qr']").exists();
    expect(hasQr("Haupteingang")).toBe(true);
    expect(hasQr("Labor Fachbank 1 · Fach 2")).toBe(true);
    expect(hasQr("Fahrradgarage Süd")).toBe(true);
    expect(hasQr("Schließfächer Rathaus")).toBe(false);
    expect(hasQr("Fahrradboxen Bahnhof")).toBe(false);
  });

  it("shows Bearbeiten in every row", async () => {
    const wrapper = await mountEveryKind();

    [
      "Haupteingang",
      "Schließfächer Rathaus",
      "Labor Fachbank 1 · Fach 2",
      "Fahrradgarage Süd",
      "Fahrradboxen Bahnhof",
    ].forEach((label) => {
      expect(
        rowOf(wrapper, label).find("[data-test='row-edit']").exists()
      ).toBe(true);
    });
  });

  it.each([
    [
      "a door",
      "Haupteingang",
      [
        "QR-Code als SVG",
        "QR-Code als PNG",
        "Scan-Code rotieren …",
        "Löschen …",
      ],
    ],
    [
      "a fixed Fach",
      "Labor Fachbank 1 · Fach 2",
      [
        "QR-Code als SVG",
        "QR-Code als PNG",
        "Scan-Code rotieren …",
        "Löschen …",
      ],
    ],
    [
      "an Open Locker Schließfachanlage",
      "Fahrradgarage Süd",
      ["Alle Scan-Codes rotieren …", "Löschen …"],
    ],
    ["a Pareva Schließfachanlage", "Schließfächer Rathaus", ["Löschen …"]],
    ["an iFBS Schließfachanlage", "Fahrradboxen Bahnhof", ["Löschen …"]],
  ])("lists in the menu of %s what is rare", async (_, label, entries) => {
    const wrapper = await mountEveryKind();

    expect(await menuEntries(wrapper, label)).toEqual(entries);
  });

  it("opens the dialog of the access point from „Bearbeiten“", async () => {
    const wrapper = await mountAccessPointsPage();

    await clickRowIcon(wrapper, "Haupteingang", "edit");

    const card = dialogCard(wrapper, "AccessPointEditDialog");
    expect(card.text()).toContain("Tür bearbeiten");
    expect(card.find(".label-field input").element.value).toBe("Haupteingang");
  });

  it("loads the PDF of a door from the QR code, without a dialog", async () => {
    ApiAccessPointService.getQrCode.mockResolvedValue({
      data: new Blob(["%PDF"]),
      headers: {},
    });
    const wrapper = await mountAccessPointsPage();

    await clickRowIcon(wrapper, "Haupteingang", "qr");

    expect(ApiAccessPointService.getQrCode).toHaveBeenCalledWith(
      "ap-door",
      "pdf",
      "t1"
    );
  });

  it("loads the SVG and the PNG of a fixed Fach from the menu", async () => {
    ApiAccessPointService.getQrCode.mockResolvedValue({
      data: new Blob(["<svg/>"]),
      headers: {},
    });
    const wrapper = await mountEveryKind();

    await clickRowAction(wrapper, "Labor Fachbank 1 · Fach 2", "svg");
    await clickRowAction(wrapper, "Labor Fachbank 1 · Fach 2", "png");

    expect(ApiAccessPointService.getQrCode.mock.calls).toEqual([
      ["ap-open-locker", "svg", "t1"],
      ["ap-open-locker", "png", "t1"],
    ]);
  });

  it("asks before rotating the scan code of a door", async () => {
    const wrapper = await mountAccessPointsPage();

    await clickRowAction(wrapper, "Haupteingang", "rotate");

    expect(dialogCard(wrapper, "AccessPointRotateDialog").text()).toContain(
      "Scan-Code rotieren"
    );
  });

  it("opens „QR-Codes der Fächer“ of a Schließfachanlage from the QR code", async () => {
    const wrapper = await mountEveryKind();

    await clickRowIcon(wrapper, "Fahrradgarage Süd", "qr");

    const text = dialogCard(wrapper, "AccessPointCompartmentQrDialog").text();
    expect(text).toContain("QR-Codes der Fächer");
    expect(text).toContain("Fahrradgarage Süd");
  });

  // Until the dialog opens on „Alle Fächer“ with the question
  // (ECCdigital/tickets#1111), all are rotated from the same dialog.
  it("opens „QR-Codes der Fächer“ from „Alle Scan-Codes rotieren …“", async () => {
    const wrapper = await mountEveryKind();

    await clickRowAction(wrapper, "Fahrradgarage Süd", "rotate-all");

    expect(
      dialogCard(wrapper, "AccessPointCompartmentQrDialog").text()
    ).toContain("Fahrradgarage Süd");
  });

  /**
   * Deleting names the bookings that hold a granted, unrevoked access at the
   * access point; the tenant's bookings carry that in `accessInfo`.
   */
  describe("deleting", () => {
    const NOW = Date.now();

    function bookingAt(id, accessPointId, revokedAt) {
      return {
        id,
        name: "Erika Mustermann",
        timeEnd: NOW + 3_600_000,
        accessInfo: [
          {
            accessPointId,
            accessPointType: "locker",
            isProvisioned: true,
            revokedAt,
            grant: { authorizationId: `auth-${id}` },
          },
        ],
      };
    }

    it("names the bookings with a live grant at the access point", async () => {
      const wrapper = await mountAccessPointsPage({
        bookings: [
          bookingAt("booking-7", PAREVA_LOCKER.id, null),
          bookingAt("booking-8", PAREVA_LOCKER.id, NOW - 1000),
        ],
      });

      await clickRowAction(wrapper, "Schließfächer Rathaus", "delete");

      const text = dialogCard(wrapper, "AccessPointDeleteDialog").text();
      expect(text).toContain("„Schließfächer Rathaus“");
      expect(text).toContain("booking-7");
      expect(text).not.toContain("booking-8");
    });

    it("says when the bookings could not be read", async () => {
      const wrapper = await mountAccessPointsPage();
      ApiBookingService.getBookings.mockRejectedValue(forbiddenError());

      await clickRowAction(wrapper, "Schließfächer Rathaus", "delete");

      expect(dialogCard(wrapper, "AccessPointDeleteDialog").text()).toContain(
        "konnten nicht gelesen werden"
      );
    });

    it("deletes the access point once confirmed", async () => {
      ApiAccessPointService.deleteAccessPoint.mockResolvedValue({});
      const wrapper = await mountAccessPointsPage();

      await clickRowAction(wrapper, "Schließfächer Rathaus", "delete");
      await dialogCard(wrapper, "AccessPointDeleteDialog")
        .find(".confirm-delete")
        .trigger("click");
      await settle(wrapper);

      expect(ApiAccessPointService.deleteAccessPoint).toHaveBeenCalledWith(
        PAREVA_LOCKER.id,
        "t1"
      );
    });
  });

  /**
   * The QR code encodes the store-front address of the instance. Without
   * `STORE_FRONT_URL` the backend answers `503 store_front_url_missing`
   * (tickets#272), in the blob body the download asked for.
   */
  describe("the QR code of a door", () => {
    function blobError(status, body) {
      const error = new Error(`Request failed with status code ${status}`);
      error.response = {
        status,
        data: new Blob([JSON.stringify(body)], { type: "application/json" }),
      };
      return error;
    }

    it("names the missing store-front address of the instance", async () => {
      ApiAccessPointService.getQrCode.mockRejectedValue(
        blobError(503, {
          error: "BaseError",
          code: "store_front_url_missing",
          statusCode: 503,
          params: {},
        })
      );
      const wrapper = await mountAccessPointsPage();

      await clickRowIcon(wrapper, "Haupteingang", "qr");

      expect(ApiAccessPointService.getQrCode).toHaveBeenCalledWith(
        "ap-door",
        "pdf",
        "t1"
      );
      expect(addToast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "error",
          message:
            "Für diese Instanz ist keine Adresse der Storefront eingerichtet (STORE_FRONT_URL), der QR-Code lässt sich deshalb nicht erzeugen. Bitte wenden Sie sich an den Betrieb.",
        })
      );
    });

    it("keeps the general failure for any other error", async () => {
      ApiAccessPointService.getQrCode.mockRejectedValue(
        blobError(500, {
          error: "InternalError",
          code: "internal_error",
          statusCode: 500,
        })
      );
      const wrapper = await mountAccessPointsPage();

      await clickRowAction(wrapper, "Haupteingang", "svg");

      expect(addToast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "error",
          title: "QR-Code fehlgeschlagen",
          message: "Der QR-Code konnte nicht erzeugt werden.",
        })
      );
    });
  });
});

/** The small line under the label of a row. */
function metaOf(wrapper, label) {
  return rowOf(wrapper, label).find("[data-test='access-point-meta']").text();
}

/**
 * Each access point is a slim row (ECCdigital/tickets#1108): its label large,
 * beneath it small the id at the provider and the Standort, and for a
 * Schließfachanlage or a fixed Fach its kind in front.
 */
describe("AccessPoints shows each access point as a slim row", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows every row of a section, without paging", async () => {
    const doors = Array.from({ length: 30 }, (_, i) => ({
      ...DOOR,
      id: `ap-door-${i}`,
      label: `Tür ${i + 1}`,
    }));
    const wrapper = await mountAccessPointsPage({ accessPoints: doors });

    expect(
      sectionOf(wrapper, "Nuki").findAll("[data-test='access-point-row']")
    ).toHaveLength(30);
  });

  it("names id and Standort under the label, the kind only where it is no door", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [NUKI, PAREVA, OPEN_LOCKER],
      accessPoints: [
        {
          ...DOOR,
          location: { display_address: "Rathausplatz 1, 24103 Kiel" },
        },
        PAREVA_LOCKER,
        OPEN_LOCKER_FACH,
        OPEN_LOCKER_ANLAGE,
      ],
    });

    expect(metaOf(wrapper, "Haupteingang")).toBe(
      "lock-1 · Rathausplatz 1, 24103 Kiel"
    );
    expect(metaOf(wrapper, "Schließfächer Rathaus")).toBe(
      "Schließfachanlage · 66570d1a1f9b6357ed971746"
    );
    expect(metaOf(wrapper, "Labor Fachbank 1 · Fach 2")).toBe(
      "festes Fach · 4f9c2a1e-0b7d-4c3a-9e51-2d6f8a0b1c3d"
    );
    expect(metaOf(wrapper, "Fahrradgarage Süd")).toBe(
      "Schließfachanlage · 1 Fach"
    );
  });
});

/** The bookables of a row, as its chips name them. */
function chipsOf(wrapper, label) {
  return rowOf(wrapper, label)
    .findAll("[data-test='access-point-bookable']")
    .wrappers.map((chip) => chip.text());
}

/**
 * The bookables an access point is assigned to stand as chips in its row;
 * without one the same place offers the assignment (ECCdigital/tickets#1108).
 */
describe("AccessPoints shows the assignment in the row", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("names the assigned bookables as chips, else offers the assignment", async () => {
    const wrapper = await mountAccessPointsPage({
      bookables: [
        {
          id: "b1",
          title: "Besprechungsraum",
          accessPointDetails: { accessPointIds: [DOOR.id] },
        },
        {
          id: "b2",
          title: "Werkstatt",
          accessPointDetails: { accessPointIds: [DOOR.id] },
        },
      ],
    });

    expect(chipsOf(wrapper, "Haupteingang")).toEqual([
      "Besprechungsraum",
      "Werkstatt",
    ]);
    expect(
      rowOf(wrapper, "Haupteingang")
        .find("[data-test='assign-bookable']")
        .exists()
    ).toBe(false);
    expect(chipsOf(wrapper, "Schließfächer Rathaus")).toEqual([]);
    expect(
      rowOf(wrapper, "Schließfächer Rathaus")
        .find("[data-test='assign-bookable']")
        .text()
    ).toBe("Buchungsobjekt zuordnen");
  });

  // „Not assigned“ is a claim about the bookables; on a denial the page
  // cannot make it, so it says why instead.
  it("does not offer the assignment when the bookables are forbidden", async () => {
    const wrapper = await mountAccessPointsPage({
      bookables: forbiddenError(),
    });

    const row = rowOf(wrapper, "Haupteingang");
    expect(row.text()).toContain("Nicht abrufbar");
    expect(row.find("[data-test='assign-bookable']").exists()).toBe(false);
    expect(wrapper.text()).toContain(
      "Sie haben keinen Zugriff auf Buchungsobjekte"
    );
  });
});

/** The card of the dialog Zuordnen, wherever Vuetify detached it. */
function assignDialog(wrapper) {
  return dialogCard(wrapper, "AccessPointAssignDialog");
}

/** The bookables the dialog Zuordnen lists, each with whether it is ticked. */
function assignChoices(wrapper) {
  return assignDialog(wrapper)
    .findAll("[data-test='assign-choice']")
    .wrappers.map((choice) => [
      choice.text(),
      choice.find("input").element.checked,
    ]);
}

async function tick(wrapper, title) {
  await assignDialog(wrapper)
    .findAll("[data-test='assign-choice']")
    .wrappers.find((choice) => choice.text() === title)
    .find("input")
    .trigger("click");
  await settle(wrapper);
}

async function saveAssignment(wrapper) {
  await assignDialog(wrapper)
    .find("[data-test='assign-save']")
    .trigger("click");
  await settle(wrapper);
}

/**
 * The page assigns an access point itself (ECCdigital/tickets#1110): „Buchungsobjekt
 * zuordnen“ and a chip open the same small dialog, which lists the bookables
 * the person may edit to tick. Saving sets the bookables of the access point
 * in one call; then the page loads the assignments anew.
 */
describe("AccessPoints assigns an access point to bookables", () => {
  const BOOKABLES = [
    {
      id: "b1",
      title: "Besprechungsraum",
      accessPointDetails: { accessPointIds: [DOOR.id] },
    },
    {
      id: "b2",
      title: "Werkstatt",
      accessPointDetails: { accessPointIds: [] },
    },
    { id: "b3", title: "Saal" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    BookablePermissionService.allowUpdate.mockImplementation(() => true);
    ApiAccessPointService.assignBookables.mockResolvedValue({ data: {} });
  });

  it("opens the dialog from „Buchungsobjekt zuordnen“, nothing ticked", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });

    await rowOf(wrapper, "Schließfächer Rathaus")
      .find("[data-test='assign-bookable']")
      .trigger("click");
    await settle(wrapper);

    expect(assignDialog(wrapper).text()).toContain("Schließfächer Rathaus");
    expect(assignChoices(wrapper)).toEqual([
      ["Besprechungsraum", false],
      ["Werkstatt", false],
      ["Saal", false],
    ]);
  });

  it("opens the same dialog from a chip, the assigned ones ticked", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });

    await rowOf(wrapper, "Haupteingang")
      .find("[data-test='access-point-bookable']")
      .trigger("click");
    await settle(wrapper);

    expect(assignDialog(wrapper).text()).toContain("Haupteingang");
    expect(assignChoices(wrapper)).toEqual([
      ["Besprechungsraum", true],
      ["Werkstatt", false],
      ["Saal", false],
    ]);
  });

  it("saves the ticked bookables and shows them as chips after loading anew", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });
    expect(openToggle(wrapper).text()).toBe("Offen (1)");
    await rowOf(wrapper, "Schließfächer Rathaus")
      .find("[data-test='assign-bookable']")
      .trigger("click");
    await settle(wrapper);

    await tick(wrapper, "Werkstatt");
    await tick(wrapper, "Saal");
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        BOOKABLES[0],
        {
          ...BOOKABLES[1],
          accessPointDetails: { accessPointIds: ["ap-pareva"] },
        },
        {
          ...BOOKABLES[2],
          accessPointDetails: { accessPointIds: ["ap-pareva"] },
        },
      ],
    });
    await saveAssignment(wrapper);

    expect(ApiAccessPointService.assignBookables).toHaveBeenCalledWith(
      "ap-pareva",
      ["b2", "b3"],
      "t1"
    );
    expect(chipsOf(wrapper, "Schließfächer Rathaus")).toEqual([
      "Werkstatt",
      "Saal",
    ]);
    expect(openToggle(wrapper).text()).toBe("Offen (0)");
    expect(assignDialog(wrapper).isVisible()).toBe(false);
  });

  it("takes a bookable off by its tick", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });
    await rowOf(wrapper, "Haupteingang")
      .find("[data-test='access-point-bookable']")
      .trigger("click");
    await settle(wrapper);

    await tick(wrapper, "Besprechungsraum");
    await saveAssignment(wrapper);

    expect(ApiAccessPointService.assignBookables).toHaveBeenCalledWith(
      "ap-door",
      [],
      "t1"
    );
  });

  it("lists only the bookables the person may edit, and keeps the others", async () => {
    BookablePermissionService.allowUpdate.mockImplementation(
      (bookable) => bookable.id !== "b1"
    );
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });
    await rowOf(wrapper, "Haupteingang")
      .find("[data-test='access-point-bookable']")
      .trigger("click");
    await settle(wrapper);

    expect(assignChoices(wrapper)).toEqual([
      ["Werkstatt", false],
      ["Saal", false],
    ]);

    await tick(wrapper, "Saal");
    await saveAssignment(wrapper);

    expect(ApiAccessPointService.assignBookables).toHaveBeenCalledWith(
      "ap-door",
      ["b1", "b3"],
      "t1"
    );
  });

  it("ticks one bookable at most for a Schließfachanlage with its own Fächer", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [OPEN_LOCKER],
      accessPoints: [OPEN_LOCKER_ANLAGE],
      bookables: BOOKABLES,
    });
    await rowOf(wrapper, "Fahrradgarage Süd")
      .find("[data-test='assign-bookable']")
      .trigger("click");
    await settle(wrapper);

    await tick(wrapper, "Werkstatt");
    await tick(wrapper, "Saal");

    expect(assignChoices(wrapper)).toEqual([
      ["Besprechungsraum", false],
      ["Werkstatt", false],
      ["Saal", true],
    ]);
    expect(assignDialog(wrapper).text()).toContain(
      "Eine Schließfachanlage mit eigenen Fächern gehört zu einem Buchungsobjekt."
    );

    await saveAssignment(wrapper);
    expect(ApiAccessPointService.assignBookables).toHaveBeenCalledWith(
      "ap-open-locker-anlage",
      ["b3"],
      "t1"
    );
  });

  /** Creates a door by hand in the section of Nuki; the backend names it `ap-new`. */
  async function createDoor(wrapper, created) {
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: created });
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [DOOR, PAREVA_LOCKER, created],
    });
    await create(wrapper, "Nuki");
    const dialog = editDialog(wrapper);
    await dialog.find("[data-test='pick-manual']").trigger("click");
    await dialog.find(".label-field input").setValue(created.label);
    await dialog.find(".external-id-field input").setValue(created.externalId);
    await dialog.find(".save-access-point").trigger("click");
    await settle(wrapper);
  }

  function nextStep(wrapper, label) {
    const line = rowOf(wrapper, label).find("[data-test='access-point-next']");
    return line.exists() ? line.text() : null;
  }

  it("marks the new row with the next step until it is assigned", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });
    await createDoor(wrapper, {
      ...DOOR,
      id: "ap-new",
      label: "Hintereingang",
      externalId: "lock-2",
    });

    expect(nextStep(wrapper, "Hintereingang")).toBe(
      "Angelegt. Als Nächstes: QR-Code drucken und einem Buchungsobjekt zuordnen."
    );
    expect(nextStep(wrapper, "Haupteingang")).toBeNull();

    await rowOf(wrapper, "Hintereingang")
      .find("[data-test='assign-bookable']")
      .trigger("click");
    await settle(wrapper);
    await tick(wrapper, "Saal");
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        BOOKABLES[0],
        BOOKABLES[1],
        { ...BOOKABLES[2], accessPointDetails: { accessPointIds: ["ap-new"] } },
      ],
    });
    await saveAssignment(wrapper);

    expect(chipsOf(wrapper, "Hintereingang")).toEqual(["Saal"]);
    expect(nextStep(wrapper, "Hintereingang")).toBeNull();
  });

  it("names no QR code in the next step where the access point opens without the scan", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });
    await createDoor(wrapper, {
      ...DOOR,
      id: "ap-new",
      label: "Hintereingang",
      externalId: "lock-2",
      validationRules: [],
    });

    expect(nextStep(wrapper, "Hintereingang")).toBe(
      "Angelegt. Als Nächstes: einem Buchungsobjekt zuordnen."
    );
  });

  it("shows the refusal in the dialog and keeps it open", async () => {
    ApiAccessPointService.assignBookables.mockRejectedValue(forbiddenError());
    const wrapper = await mountAccessPointsPage({ bookables: BOOKABLES });
    await rowOf(wrapper, "Schließfächer Rathaus")
      .find("[data-test='assign-bookable']")
      .trigger("click");
    await settle(wrapper);

    await tick(wrapper, "Saal");
    await saveAssignment(wrapper);

    expect(assignDialog(wrapper).isVisible()).toBe(true);
    expect(assignDialog(wrapper).text()).toContain(
      "Sie dürfen nicht jedes dieser Buchungsobjekte bearbeiten."
    );
  });
});

/** The markers at the label of a row. */
function markersOf(wrapper, label) {
  return rowOf(wrapper, label)
    .findAll("[data-test='access-point-marker']")
    .wrappers.map((marker) => marker.text());
}

/** The sentence a marker's tooltip shows; it detaches into `data-app`. */
async function tooltipOf(wrapper, label, text) {
  const marker = rowOf(wrapper, label)
    .findAll("[data-test='access-point-marker']")
    .wrappers.find((candidate) => candidate.text() === text);
  await marker.trigger("mouseenter");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  const sentence = document
    .querySelector(".v-tooltip__content.menuable__content__active")
    .textContent.trim();
  await marker.trigger("mouseleave");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  return sentence;
}

/**
 * A row marks only what differs from the standard (ECCdigital/tickets#1108):
 * the QR scan against what its provider starts with - Nuki and Salto KS with,
 * Open Locker without; iFBS and Pareva know none.
 */
describe("AccessPoints marks what differs from the standard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function mountWithScans() {
    return mountAccessPointsPage({
      providers: [NUKI, PAREVA, OPEN_LOCKER],
      accessPoints: [
        DOOR,
        { ...DOOR, id: "ap-side", label: "Seiteneingang", validationRules: [] },
        PAREVA_LOCKER,
        OPEN_LOCKER_FACH,
        {
          ...OPEN_LOCKER_ANLAGE,
          validationRules: [{ type: "qrScan" }],
        },
      ],
    });
  }

  it("marks nothing where the access point keeps the standard", async () => {
    const wrapper = await mountWithScans();

    expect(markersOf(wrapper, "Haupteingang")).toEqual([]);
    expect(markersOf(wrapper, "Labor Fachbank 1 · Fach 2")).toEqual([]);
    expect(markersOf(wrapper, "Schließfächer Rathaus")).toEqual([]);
  });

  it("marks a QR scan that differs from the provider's standard", async () => {
    const wrapper = await mountWithScans();

    expect(markersOf(wrapper, "Seiteneingang")).toEqual(["ohne QR-Scan"]);
    expect(markersOf(wrapper, "Fahrradgarage Süd")).toEqual(["mit QR-Scan"]);
  });

  it("explains each marker in one sentence", async () => {
    const wrapper = await mountWithScans();

    expect(await tooltipOf(wrapper, "Seiteneingang", "ohne QR-Scan")).toBe(
      "Abweichend vom Standard des Anbieters öffnet dieser Zugangspunkt ohne QR-Scan."
    );
    expect(await tooltipOf(wrapper, "Fahrradgarage Süd", "mit QR-Scan")).toBe(
      "Abweichend vom Standard des Anbieters verlangt dieser Zugangspunkt den QR-Scan."
    );
  });
});

/** The labels of the rows the page shows, top to bottom. */
function rowLabels(wrapper) {
  return wrapper
    .findAll("[data-test='access-point-row'] .access-point-row__label")
    .wrappers.map((label) => label.text().split("\n")[0].trim());
}

async function search(wrapper, text) {
  await typeSearch(wrapper.find("[data-test='access-point-search']"), text);
  await settle(wrapper);
}

function hitCount(wrapper) {
  const count = wrapper.find("[data-test='access-point-hits']");
  return count.exists() ? count.text() : null;
}

/**
 * One search over all sections (ECCdigital/tickets#1108), in the UI over the
 * loaded access points: it reads label, id, Standort, kind and bookables,
 * counts the hits against all, and shrinks a section without one to its head.
 */
describe("AccessPoints searches over all sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function mountForSearch() {
    return mountAccessPointsPage({
      providers: [NUKI, PAREVA, OPEN_LOCKER],
      accessPoints: [
        {
          ...DOOR,
          location: { display_address: "Holstenstraße 1, 24103 Kiel" },
        },
        PAREVA_LOCKER,
        OPEN_LOCKER_FACH,
        OPEN_LOCKER_ANLAGE,
      ],
      bookables: [
        {
          id: "b1",
          title: "Besprechungsraum",
          accessPointDetails: { accessPointIds: [OPEN_LOCKER_ANLAGE.id] },
        },
      ],
    });
  }

  it("counts nothing while nothing is searched", async () => {
    const wrapper = await mountForSearch();

    expect(rowLabels(wrapper)).toHaveLength(4);
    expect(hitCount(wrapper)).toBeNull();
  });

  it.each([
    ["the label", "rathaus", "Schließfächer Rathaus"],
    ["the id at the provider", "lock-1", "Haupteingang"],
    ["the Standort", "holstenstraße", "Haupteingang"],
    ["the kind", "festes fach", "Labor Fachbank 1 · Fach 2"],
    ["the bookables", "besprechung", "Fahrradgarage Süd"],
  ])("finds an access point by %s", async (_, text, label) => {
    const wrapper = await mountForSearch();

    await search(wrapper, text);

    expect(rowLabels(wrapper)).toEqual([label]);
    expect(hitCount(wrapper)).toBe("1 von 4");
  });

  it("shrinks a section without hits to its head", async () => {
    const wrapper = await mountForSearch();

    await search(wrapper, "fach");

    const nuki = sectionOf(wrapper, "Nuki");
    expect(nuki.findAll("[data-test='access-point-row']")).toHaveLength(0);
    expect(nuki.text()).toContain("Keine Treffer bei Nuki.");
    expect(sectionOf(wrapper, "Open Locker").text()).not.toContain(
      "Keine Treffer"
    );
    expect(hitCount(wrapper)).toBe("3 von 4");
  });
});

function openToggle(wrapper) {
  return wrapper.find("[data-test='access-point-open']");
}

/**
 * „Offen (n)“ beside the search shows what is still to do
 * (ECCdigital/tickets#1108): access points without a bookable.
 */
describe("AccessPoints shows what is open", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ASSIGNED_DOOR = [
    {
      id: "b1",
      title: "Besprechungsraum",
      accessPointDetails: { accessPointIds: [DOOR.id] },
    },
  ];

  it("counts the access points without a bookable", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [NUKI, PAREVA, OPEN_LOCKER],
      accessPoints: [DOOR, PAREVA_LOCKER, OPEN_LOCKER_ANLAGE],
      bookables: ASSIGNED_DOOR,
    });

    expect(openToggle(wrapper).text()).toBe("Offen (2)");
  });

  it("shows only the open ones once chosen, over all sections", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: ASSIGNED_DOOR });

    await openToggle(wrapper).trigger("click");
    await settle(wrapper);

    expect(rowLabels(wrapper)).toEqual(["Schließfächer Rathaus"]);
    expect(sectionOf(wrapper, "Nuki").text()).toContain(
      "Keine Treffer bei Nuki."
    );
    expect(hitCount(wrapper)).toBe("1 von 2");

    await openToggle(wrapper).trigger("click");
    await settle(wrapper);

    expect(rowLabels(wrapper)).toHaveLength(2);
    expect(hitCount(wrapper)).toBeNull();
  });

  it("narrows the search to the open ones", async () => {
    const wrapper = await mountAccessPointsPage({ bookables: ASSIGNED_DOOR });

    await openToggle(wrapper).trigger("click");
    await search(wrapper, "haupteingang");

    expect(rowLabels(wrapper)).toEqual([]);
    expect(hitCount(wrapper)).toBe("0 von 2");
  });

  // Without the bookables the page cannot tell what is unassigned.
  it("offers no „Offen“ when the bookables are forbidden", async () => {
    const wrapper = await mountAccessPointsPage({
      bookables: forbiddenError(),
    });

    expect(openToggle(wrapper).exists()).toBe(false);
  });
});

/** A lock as the provider lists it (`listAccessPoints`). */
function listed(provider, externalId, label, extra = {}) {
  return {
    id: externalId,
    externalId,
    provider,
    label,
    type: "door",
    supportedModes: ["remote"],
    ...extra,
  };
}

const NUKI_LISTING = [
  listed("nuki", "lock-1", "Haupteingang", { locationId: "Konto 48213" }),
  listed("nuki", "lock-2", "Werkstatttür", { locationId: "Konto 48213" }),
];

/** Answers each provider's listing with its own entries. */
function answerListings(listings) {
  ApiAccessAppsService.getAccessPoints.mockImplementation(
    async (_, provider) => ({ data: listings[provider] || [] })
  );
}

/** The card of the dialog Zugangspunkt, wherever Vuetify detached it. */
function pointDialog(wrapper) {
  return dialogCard(wrapper, "AccessPointEditDialog");
}

function shown(wrapper, test) {
  return pointDialog(wrapper).find(`[data-test='${test}']`);
}

function pickEntries(wrapper) {
  return pointDialog(wrapper).findAll("[data-test='pick-entry']").wrappers;
}

function pickEntry(wrapper, label) {
  return pickEntries(wrapper).find((entry) => entry.text().includes(label));
}

async function choose(wrapper, label) {
  await pickEntry(wrapper, label).trigger("click");
  await settle(wrapper);
}

function labelValue(wrapper) {
  return pointDialog(wrapper).find(".label-field input").element.value;
}

async function savePoint(wrapper) {
  await pointDialog(wrapper).find(".save-access-point").trigger("click");
  await settle(wrapper);
  return ApiAccessPointService.storeAccessPoint.mock.calls.at(-1)?.[0];
}

/**
 * One dialog creates and edits an access point, its provider and kind
 * settled by the section (ECCdigital/tickets#1109). Creating shows two
 * things: what the provider lists, and the Bezeichnung; the rest waits with
 * its default under „Weitere Einstellungen“.
 */
describe("AccessPoints creates an access point in a slim dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });
  });

  it("shows a Nuki door the listing and the Bezeichnung, nothing else", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    answerListings({ nuki: NUKI_LISTING });

    await create(wrapper, "Nuki");

    const card = pointDialog(wrapper);
    expect(card.text()).toContain("Tür anlegen");
    expect(card.text()).toContain("Tür aus der Liste von Nuki wählen");
    expect(pickEntries(wrapper).map((entry) => entry.text())).toEqual([
      expect.stringContaining("Haupteingang"),
      expect.stringContaining("Werkstatttür"),
    ]);
    expect(shown(wrapper, "pick-manual").text()).toBe(
      "Nicht in der Liste: Tür von Hand eintragen"
    );
    expect(labelsIn(card)).toEqual(["Bezeichnung"]);
  });

  it("fills the Bezeichnung from the pick and saves the door by its id", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    answerListings({ nuki: NUKI_LISTING });
    await create(wrapper, "Nuki");

    await choose(wrapper, "Werkstatttür");

    expect(labelValue(wrapper)).toBe("Werkstatttür");
    expect(await savePoint(wrapper)).toEqual({
      label: "Werkstatttür",
      type: "door",
      provider: "nuki",
      externalId: "lock-2",
      providerLocationId: "Konto 48213",
      mode: "remote",
      config: {},
      location: null,
    });
  });

  it("keeps a Bezeichnung typed by hand when another lock is picked", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    answerListings({ nuki: NUKI_LISTING });
    await create(wrapper, "Nuki");

    await choose(wrapper, "Haupteingang");
    await choose(wrapper, "Werkstatttür");
    expect(labelValue(wrapper)).toBe("Werkstatttür");

    await pointDialog(wrapper).find(".label-field input").setValue("Werkstatt");
    await choose(wrapper, "Haupteingang");
    expect(labelValue(wrapper)).toBe("Werkstatt");
  });

  it("greys out what is created already and does not take it", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [DOOR] });
    answerListings({ nuki: NUKI_LISTING });
    await create(wrapper, "Nuki");

    const taken = pickEntry(wrapper, "Haupteingang");
    expect(taken.text()).toContain("schon angelegt");
    expect(pickEntry(wrapper, "Werkstatttür").text()).not.toContain(
      "schon angelegt"
    );

    await choose(wrapper, "Haupteingang");

    expect(labelValue(wrapper)).toBe("");
    expect(
      pointDialog(wrapper).find(".save-access-point").attributes("disabled")
    ).toBe("disabled");
  });

  it("shows the id field only once the door is entered by hand", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    answerListings({ nuki: NUKI_LISTING });
    await create(wrapper, "Nuki");
    expect(pointDialog(wrapper).find(".external-id-field").exists()).toBe(
      false
    );

    await shown(wrapper, "pick-manual").trigger("click");
    await settle(wrapper);

    expect(labelsIn(pointDialog(wrapper))).toEqual([
      "ID beim Anbieter",
      "Bezeichnung",
    ]);
    await pointDialog(wrapper)
      .find(".external-id-field input")
      .setValue("lock-9");
    await pointDialog(wrapper).find(".label-field input").setValue("Seitentür");
    expect(await savePoint(wrapper)).toMatchObject({
      provider: "nuki",
      externalId: "lock-9",
      label: "Seitentür",
      providerLocationId: null,
    });
  });

  it("folds the rest with a line that names its state", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    answerListings({ nuki: NUKI_LISTING });
    await create(wrapper, "Nuki");

    expect(shown(wrapper, "more-settings").text()).toContain(
      "Weitere Einstellungen"
    );
    expect(shown(wrapper, "settings-summary").text()).toBe(
      "Öffnen per App · Öffnungsart Automatisch · QR-Scan erforderlich · kein Standort"
    );
    expect(shown(wrapper, "mode-line").exists()).toBe(false);
  });

  it("names the next step in the footer", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    await create(wrapper, "Nuki");

    expect(shown(wrapper, "next-step").text()).toBe(
      "Danach: zuordnen und QR-Code drucken"
    );
    expect(pointDialog(wrapper).find(".save-access-point").text()).toBe(
      "Tür anlegen"
    );
  });

  /** A Salto lock whose IQ is not activated lists no modes. */
  describe("a Salto KS door", () => {
    const SALTO_LISTING = [
      listed("salto-ks", "c0ffee12-77a1", "Gemeinschaftsraum", {
        supportedModes: [],
      }),
      listed("salto-ks", "c0ffee12-81b3", "Stadtteilbüro"),
    ];

    it("marks a lock whose IQ is not activated, and warns once it is picked", async () => {
      const wrapper = await mountAccessPointsPage({
        providers: [SALTO],
        accessPoints: [],
      });
      answerListings({ "salto-ks": SALTO_LISTING });
      await create(wrapper, "Salto KS");

      expect(pickEntry(wrapper, "Gemeinschaftsraum").text()).toContain(
        "IQ nicht aktiviert"
      );
      expect(pickEntry(wrapper, "Stadtteilbüro").text()).not.toContain(
        "IQ nicht aktiviert"
      );
      expect(shown(wrapper, "iq-warning").exists()).toBe(false);

      await choose(wrapper, "Gemeinschaftsraum");

      expect(shown(wrapper, "iq-warning").text()).toContain(
        "Der IQ dieser Tür ist nicht aktiviert."
      );
      expect(await savePoint(wrapper)).toMatchObject({
        provider: "salto-ks",
        externalId: "c0ffee12-77a1",
        mode: "remote",
      });
    });

    it("folds the rest without an Öffnungsart", async () => {
      const wrapper = await mountAccessPointsPage({
        providers: [SALTO],
        accessPoints: [],
      });
      await create(wrapper, "Salto KS");

      expect(shown(wrapper, "settings-summary").text()).toBe(
        "Öffnen per App · QR-Scan erforderlich · kein Standort"
      );
    });
  });

  it("asks a Pareva Schließfachanlage for its Produkt-ID and Bezeichnung alone", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    await create(wrapper, "Pareva");

    const card = pointDialog(wrapper);
    expect(card.text()).toContain("Schließfachanlage anlegen");
    expect(shown(wrapper, "pick-list").exists()).toBe(false);
    expect(labelsIn(card)).toEqual(["Produkt-ID", "Bezeichnung"]);
    expect(
      card.find(".external-id-field input").attributes("placeholder")
    ).toBe("z. B. 66570d1a1f9b6357ed971746");
    expect(ApiAccessAppsService.getAccessPoints).not.toHaveBeenCalled();
    expect(shown(wrapper, "settings-summary").text()).toBe("kein Standort");
    expect(shown(wrapper, "next-step").text()).toBe("Danach: zuordnen");
  });

  it("offers an iFBS Schließfachanlage from the list or by hand", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [IFBS],
      accessPoints: [],
    });
    answerListings({
      ifbs: [
        listed("ifbs", "LOC-4711", "Bahnhof Nord", { type: "locker" }),
        listed("ifbs", "LOC-4712", "Rathausplatz", { type: "locker" }),
      ],
    });
    await create(wrapper, "iFBS");

    expect(pointDialog(wrapper).text()).toContain(
      "Schließfachanlage aus der Liste von iFBS wählen"
    );
    expect(shown(wrapper, "pick-manual").text()).toBe(
      "Nicht in der Liste: Schließfachanlage von Hand eintragen"
    );
    expect(shown(wrapper, "settings-summary").text()).toBe(
      "Öffnen per App · kein Standort"
    );

    await choose(wrapper, "Rathausplatz");

    expect(await savePoint(wrapper)).toMatchObject({
      provider: "ifbs",
      type: "locker",
      externalId: "LOC-4712",
      label: "Rathausplatz",
      providerLocationId: null,
      validationRules: [],
    });
  });

  it("enters an iFBS Schließfachanlage by its Standort-ID", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [IFBS],
      accessPoints: [],
    });
    await create(wrapper, "iFBS");

    await shown(wrapper, "pick-manual").trigger("click");
    await settle(wrapper);

    expect(labelsIn(pointDialog(wrapper))).toEqual([
      "Standort-ID",
      "Bezeichnung",
    ]);
  });

  /**
   * Open Locker asks first for its Schließfachanlage or a fixed Fach, then
   * offers its Fächer by Schließfachschrank.
   */
  describe("at Open Locker", () => {
    const LABOR = { id: "bank-labor", name: "Labor Fachbank 1" };
    const HAFEN = { id: "bank-hafen", name: "Quartiersschrank Hafen" };

    function listedFach(id, lockerBank, number) {
      return listed("open-locker", id, `${lockerBank.name} · Fach ${number}`, {
        locationId: lockerBank.id,
        metadata: { id, number, lockerBank },
      });
    }

    const FAECHER = [
      listedFach("uuid-1", LABOR, 1),
      listedFach("uuid-2", LABOR, 2),
      listedFach("uuid-3", HAFEN, 3),
    ];

    async function createAtOpenLocker(accessPoints = []) {
      const wrapper = await mountAccessPointsPage({
        providers: [OPEN_LOCKER],
        accessPoints,
      });
      answerListings({ "open-locker": FAECHER });
      await create(wrapper, "Open Locker");
      return wrapper;
    }

    async function chooseType(wrapper, type) {
      await shown(wrapper, `type-choice-${type}`).trigger("click");
      await settle(wrapper);
    }

    function compartmentRow(wrapper, id) {
      return pointDialog(wrapper).find(
        `.compartment-row[data-compartment-id='${id}']`
      );
    }

    it("starts as a Schließfachanlage, with a sentence on the choice", async () => {
      const wrapper = await createAtOpenLocker();

      expect(pointDialog(wrapper).text()).toContain(
        "Schließfachanlage anlegen"
      );
      expect(shown(wrapper, "type-choice").text()).toContain("Festes Fach");
      expect(shown(wrapper, "type-hint").text()).toBe(
        "Biletado teilt jeder Buchung ein freies Fach der Schließfachanlage zu."
      );
      expect(
        pointDialog(wrapper)
          .findAll(".compartment-group-title")
          .wrappers.map((title) => title.text())
      ).toEqual(["Schrank Labor Fachbank 1", "Schrank Quartiersschrank Hafen"]);
      expect(shown(wrapper, "settings-summary").text()).toBe(
        "Öffnen per App · ohne QR-Scan · kein Standort"
      );
    });

    it("saves the Fächer ticked for the Schließfachanlage", async () => {
      const wrapper = await createAtOpenLocker();

      await compartmentRow(wrapper, "uuid-1").find("input").trigger("click");
      await compartmentRow(wrapper, "uuid-3").find("input").trigger("click");
      await pointDialog(wrapper).find(".label-field input").setValue("Garage");

      expect(await savePoint(wrapper)).toMatchObject({
        provider: "open-locker",
        type: "locker",
        externalId: "",
        label: "Garage",
        config: {
          compartments: [
            { id: "uuid-1", number: 1, lockerBank: LABOR, outOfService: false },
            { id: "uuid-3", number: 3, lockerBank: HAFEN, outOfService: false },
          ],
        },
      });
      expect(
        ApiAccessPointService.storeAccessPoint.mock.calls[0][0]
      ).not.toHaveProperty("validationRules");
    });

    it("demands the scan at all Fächer where it is switched on", async () => {
      const wrapper = await createAtOpenLocker();
      await compartmentRow(wrapper, "uuid-1").find("input").trigger("click");
      await pointDialog(wrapper).find(".label-field input").setValue("Garage");

      await shown(wrapper, "more-settings")
        .find(".v-expansion-panel-header")
        .trigger("click");
      await settle(wrapper);
      expect(shown(wrapper, "qr-scan-hint").text()).toBe(
        "Gilt für alle Fächer, jedes mit seinem eigenen QR-Code. Standard bei Open Locker: ohne QR-Scan."
      );
      await shown(wrapper, "qr-scan").find("input").trigger("click");
      await settle(wrapper);

      expect(shown(wrapper, "settings-summary").text()).toBe(
        "Öffnen per App · QR-Scan erforderlich · kein Standort"
      );
      expect(await savePoint(wrapper)).toMatchObject({
        validationRules: [{ type: "qrScan" }],
      });
    });

    it("offers a fixed Fach from the Fächer by Schrank, without a QR switch", async () => {
      const wrapper = await createAtOpenLocker([
        { ...OPEN_LOCKER_FACH, externalId: "uuid-2" },
      ]);

      await chooseType(wrapper, "door");

      expect(pointDialog(wrapper).text()).toContain("Festes Fach anlegen");
      expect(shown(wrapper, "type-hint").text()).toBe(
        "Alle Buchungen des Buchungsobjekts teilen sich dieses eine Fach."
      );
      expect(pointDialog(wrapper).text()).toContain(
        "Fach aus der Liste von Open Locker wählen"
      );
      expect(
        pointDialog(wrapper)
          .findAll("[data-test='pick-group']")
          .wrappers.map((group) => group.text())
      ).toEqual(["Schrank Labor Fachbank 1", "Schrank Quartiersschrank Hafen"]);
      expect(pickEntry(wrapper, "Fach 2").text()).toContain("schon angelegt");
      expect(shown(wrapper, "pick-manual").exists()).toBe(false);
      expect(shown(wrapper, "settings-summary").text()).toBe(
        "Öffnen per App · kein Standort"
      );

      await choose(wrapper, "Fach 3");

      expect(await savePoint(wrapper)).toMatchObject({
        provider: "open-locker",
        type: "door",
        externalId: "uuid-3",
        label: "Quartiersschrank Hafen · Fach 3",
        providerLocationId: null,
      });
    });
  });
});

async function editPoint(wrapper, label) {
  await clickRowIcon(wrapper, label, "edit");
}

/**
 * Editing is the same dialog: the lock as one line with „Tauschen“, the
 * settings unfolded (ECCdigital/tickets#1109).
 */
describe("AccessPoints edits an access point in the same dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });
  });

  it("shows the door as one line with name, id and „Tauschen“", async () => {
    const wrapper = await mountAccessPointsPage();
    answerListings({ nuki: NUKI_LISTING });

    await editPoint(wrapper, "Haupteingang");

    const line = shown(wrapper, "lock-line");
    expect(line.text()).toContain("Haupteingang");
    expect(line.text()).toContain("ID beim Anbieter lock-1");
    expect(line.text()).toContain("Tauschen");
    expect(shown(wrapper, "pick-list").exists()).toBe(false);
    expect(pointDialog(wrapper).find(".external-id-field").exists()).toBe(
      false
    );
    expect(shown(wrapper, "next-step").exists()).toBe(false);
  });

  it("shows the settings unfolded", async () => {
    const wrapper = await mountAccessPointsPage();
    answerListings({ nuki: NUKI_LISTING });

    await editPoint(wrapper, "Haupteingang");

    expect(shown(wrapper, "mode-line").text()).toContain("Öffnen per App");
    expect(shown(wrapper, "mode-line").text()).toContain("Bald verfügbar");
    expect(labelsIn(pointDialog(wrapper))).toEqual(
      expect.arrayContaining([
        "Öffnungsart",
        "QR-Scan erforderlich",
        "Standort-ID beim Anbieter",
        "Anbieter-Konfiguration (JSON)",
      ])
    );
    expect(pointDialog(wrapper).text()).toContain("Technik");
  });

  it("swaps the lock from the list and keeps the Bezeichnung", async () => {
    const wrapper = await mountAccessPointsPage();
    answerListings({ nuki: NUKI_LISTING });
    await editPoint(wrapper, "Haupteingang");

    await shown(wrapper, "swap").trigger("click");
    await settle(wrapper);

    expect(shown(wrapper, "swap-hint").text()).toBe(
      "Ändern Sie diese ID, um das Schloss auszutauschen, ohne den QR-Code neu zu drucken."
    );
    expect(pickEntry(wrapper, "Werkstatttür").exists()).toBe(true);
    expect(pickEntry(wrapper, "Haupteingang").text()).not.toContain(
      "schon angelegt"
    );

    await choose(wrapper, "Werkstatttür");

    expect(shown(wrapper, "lock-line").text()).toContain("Werkstatttür");
    expect(labelValue(wrapper)).toBe("Haupteingang");
    expect(await savePoint(wrapper)).toMatchObject({
      id: "ap-door",
      externalId: "lock-2",
      label: "Haupteingang",
      validationRules: [{ type: "qrScan" }],
    });
  });

  it("swaps a Pareva Produkt-ID in the field, with its hint", async () => {
    const wrapper = await mountAccessPointsPage();
    await editPoint(wrapper, "Schließfächer Rathaus");

    expect(shown(wrapper, "lock-line").text()).toContain(
      "Produkt-ID 66570d1a1f9b6357ed971746"
    );
    await shown(wrapper, "swap").trigger("click");
    await settle(wrapper);

    const field = pointDialog(wrapper).find(".external-id-field");
    expect(field.text()).toContain(
      "Ändern Sie die Produkt-ID, um die Anlage bei Pareva auszutauschen."
    );
    await field.find("input").setValue("66570d1a1f9b6357ed971799");
    expect(await savePoint(wrapper)).toMatchObject({
      id: "ap-pareva",
      externalId: "66570d1a1f9b6357ed971799",
      validationRules: [],
    });
  });

  it("names a door not in the list as entered by hand", async () => {
    const wrapper = await mountAccessPointsPage();
    answerListings({ nuki: [] });

    await editPoint(wrapper, "Haupteingang");

    expect(shown(wrapper, "lock-line").text()).toContain(
      "Von Hand eingetragen"
    );
  });

  it("shows the Fächer of an Open Locker Schließfachanlage, the stored one ticked", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [OPEN_LOCKER],
      accessPoints: [OPEN_LOCKER_ANLAGE],
    });
    answerListings({
      "open-locker": [
        listed(
          "open-locker",
          "9b2f6c1e-3d4a-4f5b-8c7d-1e2f3a4b5c6d",
          "Labor Fachbank 1 · Fach 1",
          {
            metadata: {
              number: 1,
              lockerBank: { id: "bank-labor", name: "Labor Fachbank 1" },
            },
          }
        ),
      ],
    });

    await editPoint(wrapper, "Fahrradgarage Süd");

    expect(pointDialog(wrapper).text()).toContain(
      "Schließfachanlage bearbeiten"
    );
    expect(shown(wrapper, "type-choice").exists()).toBe(false);
    expect(shown(wrapper, "lock-line").exists()).toBe(false);
    expect(
      pointDialog(wrapper)
        .find(".compartment-row input[type='checkbox']")
        .element.getAttribute("aria-checked")
    ).toBe("true");
  });
});

/**
 * What the dialog did before it went slim, it still does
 * (ECCdigital/tickets#1109): the Öffnungsart owns its key of the
 * configuration, the backend's faults stand where they belong, the location
 * comes from the provider.
 */
describe("AccessPoints keeps the settings of an access point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });
  });

  async function editDoor(door, listing = NUKI_LISTING) {
    const wrapper = await mountAccessPointsPage({ accessPoints: [door] });
    answerListings({ nuki: listing });
    await editPoint(wrapper, door.label);
    return wrapper;
  }

  /** The options carry their explanation, so the title is what is read. */
  async function chooseOpenAction(wrapper, title) {
    await selectByLabel(pointDialog(wrapper), "Öffnungsart")
      .find(".v-input__slot")
      .trigger("click");
    await settle(wrapper);
    [...document.querySelectorAll(".menuable__content__active .v-list-item")]
      .find(
        (item) =>
          item.querySelector(".v-list-item__title").textContent.trim() === title
      )
      .click();
    await settle(wrapper);
  }

  function openActionOptions(wrapper) {
    return selectByLabel(pointDialog(wrapper), "Öffnungsart").props("items");
  }

  describe("the Öffnungsart of a Nuki door", () => {
    it("takes the stored one out of the JSON text and saves it back", async () => {
      const wrapper = await editDoor({
        ...DOOR,
        config: { openAction: "unlatch", tolerance: 5 },
      });

      expect(
        selectByLabel(pointDialog(wrapper), "Öffnungsart").props("value")
      ).toBe("unlatch");
      const text = pointDialog(wrapper).find(".config-field textarea").element
        .value;
      expect(text).toContain("tolerance");
      expect(text).not.toContain("openAction");
      expect((await savePoint(wrapper)).config).toEqual({
        tolerance: 5,
        openAction: "unlatch",
      });
    });

    it("writes no key for Automatisch", async () => {
      const wrapper = await editDoor({
        ...DOOR,
        config: { openAction: "unlatch" },
      });

      await chooseOpenAction(wrapper, "Automatisch");

      expect((await savePoint(wrapper)).config).toEqual({});
    });

    it("greys out what the lock cannot do, as the listing says", async () => {
      const wrapper = await editDoor(DOOR, [
        listed("nuki", "lock-1", "Haupteingang", {
          supportedOpenActions: ["auto", "unlock"],
        }),
      ]);

      expect(
        openActionOptions(wrapper)
          .filter((option) => option.disabled)
          .map((option) => option.value)
      ).toEqual(["unlatch", "lock_n_go", "lock_n_go_unlatch"]);
    });

    it("puts the backend's fault at the field", async () => {
      ApiAccessPointService.storeAccessPoint.mockRejectedValue(
        validationError([
          { field: "config.openAction", code: "unknown_open_action" },
        ])
      );
      const wrapper = await editDoor(DOOR);

      await savePoint(wrapper);

      expect(
        selectByLabel(pointDialog(wrapper), "Öffnungsart").props(
          "errorMessages"
        )
      ).toBe("Öffnungsart: Unzulässiger Wert");
    });

    it("is not asked of a Salto KS door", async () => {
      const wrapper = await mountAccessPointsPage({
        providers: [SALTO],
        accessPoints: [{ ...DOOR, provider: "salto-ks" }],
      });
      await editPoint(wrapper, "Haupteingang");

      expect(labelsIn(pointDialog(wrapper))).not.toContain("Öffnungsart");
    });
  });

  it("proposes Öffnen per App for a Salto door stored on a PIN mode", async () => {
    const wrapper = await mountAccessPointsPage({
      providers: [SALTO],
      accessPoints: [{ ...DOOR, provider: "salto-ks", mode: "both" }],
    });
    await editPoint(wrapper, "Haupteingang");

    expect(shown(wrapper, "mode-line").text()).toContain("Öffnen per App");
    expect(shown(wrapper, "stored-mode-hint").text()).toBe(
      "Gespeichert ist „PIN-Code & App“, das Salto KS nicht unterstützt. Mit Speichern wird „Öffnen per App“ übernommen."
    );
    expect((await savePoint(wrapper)).mode).toBe("remote");
  });

  it("keeps the mode of a stored Pareva Schließfachanlage", async () => {
    const wrapper = await mountAccessPointsPage({
      accessPoints: [{ ...PAREVA_LOCKER, mode: "authorization" }],
    });
    await editPoint(wrapper, "Schließfächer Rathaus");

    expect(shown(wrapper, "mode-line").exists()).toBe(false);
    expect((await savePoint(wrapper)).mode).toBe("authorization");
  });

  it("refuses a configuration that is no JSON object, and says so at the field", async () => {
    const wrapper = await mountAccessPointsPage({ accessPoints: [] });
    answerListings({ nuki: NUKI_LISTING });
    await create(wrapper, "Nuki");
    await choose(wrapper, "Werkstatttür");
    await shown(wrapper, "more-settings")
      .find(".v-expansion-panel-header")
      .trigger("click");
    await settle(wrapper);
    await pointDialog(wrapper).find(".config-field textarea").setValue("[1]");

    await savePoint(wrapper);

    expect(ApiAccessPointService.storeAccessPoint).not.toHaveBeenCalled();
    expect(pointDialog(wrapper).find(".config-field").text()).toContain(
      "Die Konfiguration muss ein JSON-Objekt sein."
    );
  });

  it("shows the failure of the save under the form", async () => {
    ApiAccessPointService.storeAccessPoint.mockRejectedValue(
      lifecycleError(502, "provider_unreachable", { provider: "nuki" })
    );
    const wrapper = await editDoor(DOOR);

    await savePoint(wrapper);

    expect(pointDialog(wrapper).find(".v-alert").exists()).toBe(true);
    expect(addToast).not.toHaveBeenCalled();
  });

  it("requires the Bezeichnung", async () => {
    const wrapper = await editDoor(DOOR);

    await pointDialog(wrapper).find(".label-field input").setValue(" ");

    expect(
      pointDialog(wrapper).find(".save-access-point").attributes("disabled")
    ).toBe("disabled");
  });

  /** NUKI knows where a door is: „Standort vom Anbieter übernehmen“. */
  it("takes the location of a Nuki door from the provider", async () => {
    ApiAccessPointService.getLocationPrefill.mockResolvedValue({
      data: { coordinates: { type: "Point", points: [14.7161, 51.9512] } },
    });
    ApiGeoService.reverse.mockResolvedValue(null);
    const wrapper = await mountAccessPointsPage({
      providers: [
        { ...NUKI, providerCapabilities: ["listAccessPoints", "getLocation"] },
      ],
      accessPoints: [DOOR],
    });
    await editPoint(wrapper, "Haupteingang");

    await shown(wrapper, "prefill-location").trigger("click");
    await settle(wrapper);

    expect(ApiAccessPointService.getLocationPrefill).toHaveBeenCalledWith(
      "ap-door",
      "t1"
    );
    expect(pointDialog(wrapper).text()).toContain(
      "Der Punkt des Anbieters wurde übernommen."
    );
    const { location } = await savePoint(wrapper);
    expect(location.coordinates.points).toEqual([14.7161, 51.9512]);
    expect(location.meta.source).toBe("nuki");
  });

  it("offers the location of the provider only when editing a door that has one", async () => {
    const wrapper = await mountAccessPointsPage();
    await editPoint(wrapper, "Haupteingang");

    expect(shown(wrapper, "prefill-location").exists()).toBe(false);
  });
});

/**
 * Saving an Open Locker Schließfachanlage that takes a Fach out first asks
 * about the bookings there (ECCdigital/tickets#1043). Unchanged until the
 * Fächer show their bookings themselves (ECCdigital/tickets#1113).
 */
describe("AccessPoints asks about the bookings at a Fach that leaves", () => {
  const LABOR = { id: "bank-labor", name: "Labor Fachbank 1" };
  const UUID_1 = "9b2f6c1e-3d4a-4f5b-8c7d-1e2f3a4b5c6d";
  const UUID_2 = "0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
  const FACH_1 = { id: UUID_1, number: 1, lockerBank: LABOR };
  const ANLAGE = {
    ...OPEN_LOCKER_ANLAGE,
    config: {
      compartments: [
        { ...FACH_1, outOfService: false },
        { id: UUID_2, number: 2, lockerBank: LABOR, outOfService: false },
      ],
    },
  };

  function booking(id, state) {
    return {
      id,
      name: `Person ${id}`,
      timeBegin: Date.UTC(2026, 10, 20, 9, 0),
      timeEnd: Date.UTC(2026, 10, 20, 11, 0),
      state,
      compartment: FACH_1,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({ data: {} });
    ApiAccessPointService.getCompartmentBookings.mockResolvedValue({
      data: { total: 0, bookings: [] },
    });
  });

  async function takeOutFach1() {
    const wrapper = await mountAccessPointsPage({
      providers: [OPEN_LOCKER],
      accessPoints: [ANLAGE],
    });
    answerListings({ "open-locker": [] });
    await editPoint(wrapper, "Fahrradgarage Süd");
    await pointDialog(wrapper)
      .find(`.compartment-row[data-compartment-id='${UUID_1}'] input`)
      .trigger("click");
    await settle(wrapper);
    return wrapper;
  }

  function question(wrapper) {
    return dialogCard(wrapper, "AccessPointCompartmentBookingsDialog");
  }

  async function click(wrapper, selector) {
    await question(wrapper).find(selector).trigger("click");
    await settle(wrapper);
  }

  it("names the bookings and saves only once confirmed", async () => {
    ApiAccessPointService.getCompartmentBookings.mockResolvedValue({
      data: {
        total: 2,
        bookings: [
          booking("b-running", "running"),
          booking("b-future", "future"),
        ],
      },
    });
    const wrapper = await takeOutFach1();

    await savePoint(wrapper);

    expect(ApiAccessPointService.getCompartmentBookings).toHaveBeenCalledWith(
      ANLAGE.id,
      [UUID_1],
      "t1"
    );
    expect(ApiAccessPointService.storeAccessPoint).not.toHaveBeenCalled();
    const text = question(wrapper).text();
    expect(text).toContain("läuft – behält das Fach");
    expect(text).toContain("künftig – bekommt ein freies Fach");

    await click(wrapper, ".confirm-compartments-leave");

    expect(ApiAccessPointService.storeAccessPoint).toHaveBeenCalledTimes(1);
    expect(
      ApiAccessPointService.storeAccessPoint.mock.calls[0][0].config
        .compartments
    ).toEqual([
      { id: UUID_2, number: 2, lockerBank: LABOR, outOfService: false },
    ]);
  });

  it("saves nothing when the question is cancelled", async () => {
    ApiAccessPointService.getCompartmentBookings.mockResolvedValue({
      data: { total: 1, bookings: [booking("b-future", "future")] },
    });
    const wrapper = await takeOutFach1();
    await savePoint(wrapper);

    await click(wrapper, ".cancel-compartments-leave");

    expect(ApiAccessPointService.storeAccessPoint).not.toHaveBeenCalled();
  });

  it("saves without asking when no booking hangs at the Fach", async () => {
    const wrapper = await takeOutFach1();

    await savePoint(wrapper);

    expect(ApiAccessPointService.storeAccessPoint).toHaveBeenCalledTimes(1);
  });

  it("still asks when the bookings cannot be read, and says so", async () => {
    ApiAccessPointService.getCompartmentBookings.mockRejectedValue(
      lifecycleError(403, "forbidden")
    );
    const wrapper = await takeOutFach1();

    await savePoint(wrapper);

    expect(ApiAccessPointService.storeAccessPoint).not.toHaveBeenCalled();
    expect(question(wrapper).text()).toContain(
      "Welche Buchungen an diesen Fächern hängen, ließ sich nicht lesen."
    );
  });

  it("names after the save the bookings that could not move", async () => {
    ApiAccessPointService.storeAccessPoint.mockResolvedValue({
      data: { id: ANLAGE.id, unmovedBookings: [booking("b-stuck")] },
    });
    const wrapper = await takeOutFach1();

    await savePoint(wrapper);

    expect(question(wrapper).text()).toContain(
      "Kein freies Fach für diese künftigen Buchungen"
    );
    expect(addToast).not.toHaveBeenCalled();

    await click(wrapper, ".close-unmoved");

    expect(addToast).toHaveBeenCalled();
  });
});
