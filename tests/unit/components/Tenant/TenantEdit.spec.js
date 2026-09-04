import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import TenantEdit from "@/components/Tenant/TenantEdit.vue";
import ApiCatalogService from "@/services/api/ApiCatalogService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiCatalogService", () => ({
  default: { getCatalog: vi.fn(), updateCatalog: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn(), submitTenant: vi.fn() },
}));
vi.mock("@/services/api/ApiWorkflowService", () => ({
  default: {
    getWorkflow: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
  },
}));

function store() {
  return new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t1" },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
}

async function mountTenantEdit() {
  // Two children are stubbed: the catalog editor reads a shape the parent
  // only has once a catalog arrived, and the workflow status dialog fetches
  // users on mount. What is under test is what the parent shows around them.
  const wrapper = mountComponent(TenantEdit, {
    store: store(),
    stubs: { CatalogSettings: true, TenantEditWorkflowStatusDialog: true },
  });
  // `mounted` awaits three requests in a row, so one tick is not enough.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * The dangerous reading of a 404. `fetchCatalog` answers one by putting the
 * empty default catalog on screen - right when a tenant has no catalog yet,
 * and wrong since 4.3.x, where a catalog outside the caller's reach answers
 * the same 404. The admin then edits what looks like an empty catalog and
 * saves it over one they never saw.
 *
 * The default is still offered, so a first catalog can be created, but the
 * screen has to say that it may not be the whole truth.
 */
describe("TenantEdit catalog loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiTenantService.getTenant.mockResolvedValue({ data: { id: "t1" } });
    ApiWorkflowService.getWorkflow.mockResolvedValue({});
  });

  it("shows the catalog it loaded without a warning", async () => {
    ApiCatalogService.getCatalog.mockResolvedValue({
      data: { tenantId: "t1", active: true, visibility: "public" },
    });

    const wrapper = await mountTenantEdit();

    expect(wrapper.vm.catalog.active).toBe(true);
    expect(wrapper.vm.catalogUnavailable).toBe(false);
    expect(wrapper.text()).not.toMatch(/nicht zugänglich/i);
  });

  it("warns before an empty default catalog can be saved over an unseen one", async () => {
    ApiCatalogService.getCatalog.mockRejectedValue({
      response: { status: 404 },
    });

    const wrapper = await mountTenantEdit();

    expect(wrapper.vm.catalog.tenantId).toBe("t1");
    expect(wrapper.vm.catalogUnavailable).toBe(true);
    expect(wrapper.text()).toMatch(/nicht zugänglich/i);
    expect(wrapper.text()).toMatch(/überschrieben/i);
  });

  it("does not offer a default catalog when the request failed otherwise", async () => {
    ApiCatalogService.getCatalog.mockRejectedValue(new Error("Network Error"));

    const wrapper = await mountTenantEdit();

    expect(wrapper.vm.catalog).toEqual({});
    expect(wrapper.vm.catalogUnavailable).toBe(false);
  });
});

/**
 * The page carries the tenant's applications through a save, and writes its
 * own default for one that is not there yet. Since the backend migration the
 * only application type Pareva may have is `access` - `locker` is out of the
 * schema, so a default carrying it takes the app out of the backend's sight
 * on the next save.
 */
describe("TenantEdit applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiCatalogService.getCatalog.mockResolvedValue({ data: {} });
    ApiWorkflowService.getWorkflow.mockResolvedValue({});
  });

  it("writes the Pareva default as an access application", async () => {
    ApiTenantService.getTenant.mockResolvedValue({ data: { id: "t1" } });

    const wrapper = await mountTenantEdit();
    wrapper.vm.replaceApps();

    const pareva = wrapper.vm.tenant.applications.find(
      (app) => app.id === "pareva"
    );
    expect(pareva.type).toBe("access");
  });

  it("carries a stored application through unchanged", async () => {
    ApiTenantService.getTenant.mockResolvedValue({
      data: {
        id: "t1",
        applications: [
          {
            id: "pareva",
            type: "access",
            active: true,
            serverUrl: "https://p",
          },
        ],
      },
    });

    const wrapper = await mountTenantEdit();
    wrapper.vm.replaceApps();

    const pareva = wrapper.vm.tenant.applications.find(
      (app) => app.id === "pareva"
    );
    expect(pareva).toMatchObject({
      type: "access",
      active: true,
      serverUrl: "https://p",
    });
  });

  it("reads an unmigrated locker application as not configured", async () => {
    ApiTenantService.getTenant.mockResolvedValue({
      data: {
        id: "t1",
        applications: [
          {
            id: "pareva",
            type: "locker",
            active: true,
            serverUrl: "https://old",
          },
        ],
      },
    });

    const wrapper = await mountTenantEdit();
    wrapper.vm.replaceApps();

    const pareva = wrapper.vm.tenant.applications.find(
      (app) => app.id === "pareva"
    );
    expect(pareva).toMatchObject({
      type: "access",
      active: false,
      serverUrl: "",
    });
  });
});
