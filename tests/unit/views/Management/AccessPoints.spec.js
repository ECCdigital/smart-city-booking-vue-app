import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import AccessPoints from "@/views/Management/AccessPoints.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";
import { typeSearch } from "@tests/unit/support/search";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn(), submitTenant: vi.fn() },
}));
vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: {
    testConnection: vi.fn(),
    getSaltoIqs: vi.fn(),
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
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowAuditExport: () => false },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

/** Salto KS as the tenant stored it, its identity on site-1. */
function storedSalto(overrides = {}) {
  return {
    type: "access",
    id: "salto-ks",
    title: "Salto KS",
    clientId: "client-1",
    clientSecret: "secret",
    username: "biletado@example.com",
    password: "password",
    siteId: "site-1",
    environment: "accept",
    active: true,
    ...overrides,
  };
}

const IQ = { otpEnabled: true, online: true, restoreRequired: false };

/** Two IQs whose activation belongs to the stored identity, one without. */
function iqsOfStoredIdentity() {
  return [
    { ...IQ, id: "1", customerReference: "Labortür", state: "activated" },
    { ...IQ, id: "2", customerReference: "Werkstatt", state: "degraded" },
    { ...IQ, id: "3", customerReference: "Lager", state: "not_activated" },
  ];
}

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

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
  await flushPromises();
}

/** The providers page with the Salto panel open and its IQs loaded. */
async function mountPage({ salto = storedSalto(), iqs } = {}) {
  ApiTenantService.getTenant.mockResolvedValue({
    data: { id: "t1", name: "Mandant", applications: [salto] },
  });
  ApiAccessAppsService.getSaltoIqs.mockResolvedValue({
    data: iqs || iqsOfStoredIdentity(),
  });
  ApiTenantService.submitTenant.mockResolvedValue({ data: {} });

  const wrapper = mountComponent(AccessPoints, {
    store: store(),
    mocks: {
      $route: { query: { tab: "providers" } },
      $router: { replace: vi.fn() },
    },
  });
  await settle(wrapper);

  const header = saltoPanel(wrapper).find(".v-expansion-panel-header");
  await header.trigger("click");
  await settle(wrapper);

  return wrapper;
}

function saltoPanel(wrapper) {
  return wrapper
    .findAll(".v-expansion-panel")
    .wrappers.find((panel) => panel.text().includes("Salto KS"));
}

function fieldWithValue(wrapper, value) {
  return saltoPanel(wrapper)
    .findAll("input")
    .wrappers.find((input) => input.element.value === value);
}

async function chooseEnvironment(wrapper, text) {
  await saltoPanel(wrapper).find(".v-select .v-input__slot").trigger("click");
  await wrapper.vm.$nextTick();
  const option = [...document.querySelectorAll(".v-list-item")].find((item) =>
    item.textContent.includes(text)
  );
  option.click();
  await settle(wrapper);
}

async function save(wrapper) {
  const button = wrapper
    .findAll("button")
    .wrappers.find((b) => b.text() === "Speichern");
  await button.trigger("click");
  await settle(wrapper);
}

/** The confirmation lands in Vuetify's overlay container, not the page. */
function question() {
  return document.querySelector("[data-test='salto-identity-change']");
}

async function answer(text) {
  const button = [...question().querySelectorAll("button")].find((b) =>
    b.textContent.includes(text)
  );
  button.click();
  await flushPromises();
}

function savedSalto() {
  const tenant = ApiTenantService.submitTenant.mock.calls.at(-1)[0];
  return tenant.applications.find((app) => app.id === "salto-ks");
}

/**
 * An IQ activation belongs to the site, the System-User and the environment
 * it was made under; after a change it rests and holds again once the admin
 * changes back (ECCdigital/tickets#505). So the page asks before it saves
 * such a change while IQs are activated (ECCdigital/tickets#574).
 */
describe("AccessPoints asks before the identity of Salto KS changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks before saving another site, naming the IQs that rest", async () => {
    const wrapper = await mountPage();

    await fieldWithValue(wrapper, "site-1").setValue("site-2");
    await save(wrapper);

    expect(ApiTenantService.submitTenant).not.toHaveBeenCalled();
    const text = question().textContent;
    expect(text).toContain("2 IQs");
    expect(text).toContain("ruhen");
    expect(text).toContain("zurück");
    expect(text).toContain("eigene Aktivierung");
  });

  it("saves the change once the admin confirms", async () => {
    const wrapper = await mountPage();

    await fieldWithValue(wrapper, "site-1").setValue("site-2");
    await save(wrapper);
    await answer("Trotzdem speichern");
    await settle(wrapper);

    expect(ApiTenantService.submitTenant).toHaveBeenCalledTimes(1);
    expect(savedSalto().siteId).toBe("site-2");
  });

  it("saves nothing when the admin cancels, and keeps the form", async () => {
    const wrapper = await mountPage();

    await fieldWithValue(wrapper, "site-1").setValue("site-2");
    await save(wrapper);
    await answer("Abbrechen");
    await settle(wrapper);

    expect(ApiTenantService.submitTenant).not.toHaveBeenCalled();
    expect(fieldWithValue(wrapper, "site-2")).toBeTruthy();
  });

  it("asks before saving another System-User", async () => {
    const wrapper = await mountPage();

    await fieldWithValue(wrapper, "biletado@example.com").setValue(
      "biletado-neu@example.com"
    );
    await save(wrapper);

    expect(ApiTenantService.submitTenant).not.toHaveBeenCalled();
    expect(question().textContent).toContain("2 IQs");
  });

  it("asks before saving another environment", async () => {
    const wrapper = await mountPage();

    await chooseEnvironment(wrapper, "Production");
    await save(wrapper);

    expect(ApiTenantService.submitTenant).not.toHaveBeenCalled();
    expect(question().textContent).toContain("2 IQs");
  });

  it("names a single IQ in the singular", async () => {
    const wrapper = await mountPage({
      iqs: [{ ...IQ, id: "1", state: "activated" }],
    });

    await fieldWithValue(wrapper, "site-1").setValue("site-2");
    await save(wrapper);

    expect(question().textContent).toContain("1 IQ ");
  });

  it("saves without asking when no IQ is activated", async () => {
    const wrapper = await mountPage({
      iqs: [{ ...IQ, id: "1", state: "not_activated" }],
    });

    await fieldWithValue(wrapper, "site-1").setValue("site-2");
    await save(wrapper);

    expect(question()).toBeNull();
    expect(savedSalto().siteId).toBe("site-2");
  });

  // A rotation of the client keeps the activations valid.
  it("saves without asking when only the client id changes", async () => {
    const wrapper = await mountPage();

    await fieldWithValue(wrapper, "client-1").setValue("client-2");
    await save(wrapper);

    expect(question()).toBeNull();
    expect(savedSalto().clientId).toBe("client-2");
  });

  // Read as accept, as the backend does - not a change of environment.
  it("saves without asking when a stored configuration has no environment", async () => {
    const wrapper = await mountPage({
      salto: storedSalto({ environment: undefined }),
    });

    await fieldWithValue(wrapper, "client-1").setValue("client-2");
    await save(wrapper);

    expect(question()).toBeNull();
    expect(ApiTenantService.submitTenant).toHaveBeenCalledTimes(1);
  });

  it("asks against the saved identity after a save, with the IQs loaded anew", async () => {
    const wrapper = await mountPage();

    await fieldWithValue(wrapper, "site-1").setValue("site-2");
    await save(wrapper);
    // Under site-2 no IQ has an activation of its own yet.
    ApiAccessAppsService.getSaltoIqs.mockResolvedValue({
      data: [{ ...IQ, id: "1", state: "not_activated" }],
    });
    await answer("Trotzdem speichern");
    await settle(wrapper);

    await fieldWithValue(wrapper, "site-2").setValue("site-1");
    await save(wrapper);

    expect(question()).toBeNull();
    expect(ApiTenantService.submitTenant).toHaveBeenCalledTimes(2);
    expect(savedSalto().siteId).toBe("site-1");
  });
});

/**
 * The Open Locker password travels like Pareva's (ECCdigital/tickets#970):
 * the backend hands it back decrypted, the form holds it, and a save sends it
 * along to be encrypted again - so a change elsewhere in the form keeps it.
 */
describe("AccessPoints saves Open Locker", () => {
  const STORED = {
    type: "access",
    id: "open-locker",
    title: "Open Locker",
    serverUrl: "https://locker-labor.e-c-crew.dev",
    email: "technik@example.org",
    password: "geheim",
    active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ApiTenantService.getTenant.mockResolvedValue({
      data: { id: "t1", name: "Mandant", applications: [STORED] },
    });
    ApiAccessAppsService.getSaltoIqs.mockResolvedValue({ data: [] });
    ApiTenantService.submitTenant.mockResolvedValue({ data: {} });
  });

  it("keeps the stored password when the e-mail changes", async () => {
    const wrapper = mountComponent(AccessPoints, {
      store: store(),
      mocks: {
        $route: { query: { tab: "providers" } },
        $router: { replace: vi.fn() },
      },
    });
    await settle(wrapper);
    const panel = wrapper
      .findAll(".v-expansion-panel")
      .wrappers.find((p) => p.text().includes("Open Locker"));
    await panel.find(".v-expansion-panel-header").trigger("click");
    await settle(wrapper);

    const email = panel
      .findAll("input")
      .wrappers.find((input) => input.element.value === STORED.email);
    await email.setValue("konto@example.org");
    await save(wrapper);

    const tenant = ApiTenantService.submitTenant.mock.calls.at(-1)[0];
    expect(tenant.applications.find((app) => app.id === "open-locker")).toEqual(
      { ...STORED, email: "konto@example.org" }
    );
  });
});

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
  providers = [NUKI, PAREVA],
  accessPoints = [DOOR, PAREVA_LOCKER],
  bookables = [],
  bookings = [],
} = {}) {
  ApiTenantService.getTenant.mockResolvedValue({
    data: { id: "t1", name: "Mandant", applications: [] },
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

  const wrapper = mountComponent(AccessPoints, {
    store: store(),
    mocks: {
      $route: { query: {} },
      $router: { replace: vi.fn() },
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
      "Zugangspunkt anlegen"
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
    await dialog.find(".create-mode-manual").trigger("click");
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

const IFBS = { id: "ifbs", title: "iFBS", providerCapabilities: [] };

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
    expect(card.text()).toContain("Zugangspunkt bearbeiten");
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

  // Until the page assigns itself, the button points to the area at the
  // bookable, where the assignment is made today.
  it("points to the area at the bookable from the assignment", async () => {
    const wrapper = await mountAccessPointsPage();

    await rowOf(wrapper, "Schließfächer Rathaus")
      .find("[data-test='assign-bookable']")
      .trigger("click");
    await settle(wrapper);

    expect(addToast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "info",
        message: expect.stringContaining("Schließsysteme"),
      })
    );
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
