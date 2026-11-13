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
import { selectByLabel } from "@tests/unit/support/vuetify";
import ApiGeoService from "@/services/api/ApiGeoService";

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
  // The location input behind „Weitere Einstellungen“ asks the geo routes.
  ApiGeoService.start.mockResolvedValue({ lat: 51.2, lon: 9.4, zoom: 5 });
  ApiGeoService.search.mockResolvedValue([]);
  ApiGeoService.reverse.mockResolvedValue(null);
  ApiGeoService.tile.mockReturnValue(new Promise(() => {}));

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
    expect(pareva.find(".row-menu").exists()).toBe(true);
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
  await rowOf(wrapper, label).find(".row-menu").trigger("click");
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
  return document.querySelector(".menuable__content__active");
}

async function clickRowAction(wrapper, label, selector) {
  const menu = await openRowMenu(wrapper, label);
  menu.querySelector(selector).click();
  await settle(wrapper);
}

function dialogCard(wrapper, name) {
  return wrapper.findComponent({ name }).findComponent({ name: "v-card" });
}

/**
 * The rows are provisional until the row of an access point gets its own
 * component (ECCdigital/tickets#1108); what was reachable from the list stays
 * reachable from them.
 */
describe("AccessPoints keeps the actions of each access point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("the assignment", () => {
    it("names the bookables an access point is assigned to", async () => {
      const wrapper = await mountAccessPointsPage({
        bookables: [
          {
            id: "b1",
            title: "Besprechungsraum",
            accessPointDetails: { accessPointIds: [DOOR.id] },
          },
        ],
      });

      expect(rowOf(wrapper, "Haupteingang").text()).toContain(
        "Besprechungsraum"
      );
      expect(rowOf(wrapper, "Schließfächer Rathaus").text()).toContain(
        "Keinem Buchungsobjekt zugeordnet"
      );
    });

    // „Not assigned“ is a claim about the bookables; on a denial the page
    // cannot make it, so it says why instead.
    it("does not claim 'not assigned' when the bookables are forbidden", async () => {
      const wrapper = await mountAccessPointsPage({
        bookables: forbiddenError(),
      });

      const row = rowOf(wrapper, "Haupteingang").text();
      expect(row).toContain("Nicht abrufbar");
      expect(row).not.toContain("Keinem Buchungsobjekt zugeordnet");
      expect(wrapper.text()).toContain(
        "Sie haben keinen Zugriff auf Buchungsobjekte"
      );
    });
  });

  it("opens the dialog of the access point from „Bearbeiten“", async () => {
    const wrapper = await mountAccessPointsPage();

    await clickRowAction(wrapper, "Haupteingang", ".edit-access-point");

    const card = dialogCard(wrapper, "AccessPointEditDialog");
    expect(card.text()).toContain("Tür bearbeiten");
    expect(card.find(".label-field input").element.value).toBe("Haupteingang");
  });

  it("asks before rotating the scan code of a door", async () => {
    const wrapper = await mountAccessPointsPage();

    await clickRowAction(wrapper, "Haupteingang", ".rotate-access-point");

    expect(dialogCard(wrapper, "AccessPointRotateDialog").text()).toContain(
      "Scan-Code rotieren"
    );
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

      await clickRowAction(
        wrapper,
        "Schließfächer Rathaus",
        ".delete-access-point"
      );

      const text = dialogCard(wrapper, "AccessPointDeleteDialog").text();
      expect(text).toContain("„Schließfächer Rathaus“");
      expect(text).toContain("booking-7");
      expect(text).not.toContain("booking-8");
    });

    it("says when the bookings could not be read", async () => {
      const wrapper = await mountAccessPointsPage();
      ApiBookingService.getBookings.mockRejectedValue(forbiddenError());

      await clickRowAction(
        wrapper,
        "Schließfächer Rathaus",
        ".delete-access-point"
      );

      expect(dialogCard(wrapper, "AccessPointDeleteDialog").text()).toContain(
        "konnten nicht gelesen werden"
      );
    });

    it("deletes the access point once confirmed", async () => {
      ApiAccessPointService.deleteAccessPoint.mockResolvedValue({});
      const wrapper = await mountAccessPointsPage();

      await clickRowAction(
        wrapper,
        "Schließfächer Rathaus",
        ".delete-access-point"
      );
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

      await clickRowAction(wrapper, "Haupteingang", ".download-qr-pdf");

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

      await clickRowAction(wrapper, "Haupteingang", ".download-qr-svg");

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

  /**
   * „QR-Codes der Fächer“ (ECCdigital/tickets#1056): a button in the row and
   * an entry in its menu, both only at an Anlage that carries its own Fächer.
   */
  describe("the QR codes of the Fächer", () => {
    async function mountWithFaecher() {
      return mountAccessPointsPage({
        providers: [NUKI, PAREVA, OPEN_LOCKER],
        accessPoints: [
          DOOR,
          PAREVA_LOCKER,
          OPEN_LOCKER_FACH,
          OPEN_LOCKER_ANLAGE,
        ],
      });
    }

    it("offers the button only at an Open Locker Schließfachanlage", async () => {
      const wrapper = await mountWithFaecher();

      expect(
        rowOf(wrapper, "Fahrradgarage Süd").find(".compartment-qr").text()
      ).toContain("QR-Codes der Fächer");
      [
        "Haupteingang",
        "Schließfächer Rathaus",
        "Labor Fachbank 1 · Fach 2",
      ].forEach((label) => {
        expect(rowOf(wrapper, label).find(".compartment-qr").exists()).toBe(
          false
        );
      });
    });

    it.each([
      ["a Pareva Schließfachanlage", "Schließfächer Rathaus"],
      ["a door", "Haupteingang"],
      ["a fixed Fach", "Labor Fachbank 1 · Fach 2"],
    ])("has no menu entry at %s", async (_, label) => {
      const wrapper = await mountWithFaecher();

      const menu = await openRowMenu(wrapper, label);

      expect(menu.querySelector(".open-compartment-qr")).toBe(null);
    });

    it("opens the dialog of the Schließfachanlage from the button", async () => {
      const wrapper = await mountWithFaecher();

      await rowOf(wrapper, "Fahrradgarage Süd")
        .find(".compartment-qr")
        .trigger("click");
      await settle(wrapper);

      const text = dialogCard(wrapper, "AccessPointCompartmentQrDialog").text();
      expect(text).toContain("QR-Codes der Fächer");
      expect(text).toContain("Fahrradgarage Süd");
    });

    it("opens the same dialog from the row menu", async () => {
      const wrapper = await mountWithFaecher();

      await clickRowAction(
        wrapper,
        "Fahrradgarage Süd",
        ".open-compartment-qr"
      );

      expect(
        dialogCard(wrapper, "AccessPointCompartmentQrDialog").text()
      ).toContain("Fahrradgarage Süd");
    });
  });
});

const SALTO = {
  id: "salto-ks",
  title: "Salto KS",
  providerCapabilities: ["listAccessPoints"],
};
const IFBS = {
  id: "ifbs",
  title: "iFBS",
  providerCapabilities: ["listAccessPoints"],
};

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
  await clickRowAction(wrapper, label, ".edit-access-point");
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
