import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import AccessPoints from "@/views/Management/AccessPoints.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn(), submitTenant: vi.fn() },
}));
vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { testConnection: vi.fn(), getSaltoIqs: vi.fn() },
}));
vi.mock("@/services/permissions/AccessPointPermissionService", () => ({
  default: { allowWrite: () => false },
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

function store() {
  return new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t1" },
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
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
