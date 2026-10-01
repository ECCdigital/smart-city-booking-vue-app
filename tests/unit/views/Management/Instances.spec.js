import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import Instances from "@/views/Management/Instances.vue";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiCatalogService from "@/services/api/ApiCatalogService";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiUsersService from "@/services/api/ApiUsersService";
import ApiTenantService from "@/services/api/ApiTenantService";

vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));
vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getInstance: vi.fn(), updateInstance: vi.fn() },
}));
vi.mock("@/services/api/ApiCatalogService", () => ({
  default: { getCatalog: vi.fn(), updateCatalog: vi.fn() },
}));
vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getRoles: vi.fn() },
}));
vi.mock("@/services/api/ApiUsersService", () => ({
  default: { getUsers: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn() },
}));

/**
 * The stale-overwrite guard of the hero layout spec: the Hero Editor owns
 * `branding.background` and `catalog.heroLayout`, and the Portal tab's global
 * save carries neither back. The view is a route-level component with a
 * router, a store and nine tabs; the two payload builders are exercised with
 * a stand-in context rather than by mounting all of that.
 */
describe("Instances save payloads", () => {
  it("sends the instance without the background", () => {
    const context = {
      instance: {
        id: "i1",
        portalUrl: "https://portal.example.org",
        branding: {
          active: true,
          background: { version: 1, type: "variant", variant: "poly" },
          theme: { colors: { primary: "#111111", secondary: "#222222" } },
        },
      },
    };

    const payload = Instances.methods.instancePayload.call(context);

    expect(payload.branding).not.toHaveProperty("background");
    expect(payload.branding.active).toBe(true);
    expect(payload.portalUrl).toBe("https://portal.example.org");
  });

  it("sends the catalog without the hero layout", () => {
    const context = {
      catalog: {
        type: "instance",
        name: "Marktplatz",
        heroLayout: { version: 1, blocks: [] },
      },
    };

    const payload = Instances.methods.catalogPayload.call(context);

    expect(payload).not.toHaveProperty("heroLayout");
    expect(payload.name).toBe("Marktplatz");
  });

  it("no longer falls back to a catalog with the removed hero fields", () => {
    const data = Instances.data.call({});

    expect(data.catalog).not.toHaveProperty("hero");
  });
});

describe("Instances start level", () => {
  it("sends the start level with the instance", () => {
    const context = {
      instance: { id: "i1", tenantInitialSupervisionLevel: "supervised" },
    };

    const payload = Instances.methods.instancePayload.call(context);

    expect(payload.tenantInitialSupervisionLevel).toBe("supervised");
  });

  it("hands a refused start level to the open tab as its field", () => {
    const showApiErrors = vi.fn();
    const context = { $refs: { activeChild: { showApiErrors } } };

    // The backend's `BadRequestError` envelope, not a `ValidationError`.
    Instances.methods.showApiErrors.call(context, {
      response: {
        status: 400,
        data: {
          error: "BadRequestError",
          code: "invalid_supervision_level",
          statusCode: 400,
          params: {
            field: "tenantInitialSupervisionLevel",
            level: "open",
            allowed: ["free", "supervised", "pending"],
          },
        },
      },
    });

    expect(showApiErrors).toHaveBeenCalledWith([
      {
        field: "tenantInitialSupervisionLevel",
        code: "invalid_supervision_level",
      },
    ]);
  });

  it("still hands the fields of a ValidationError to the open tab", () => {
    const showApiErrors = vi.fn();
    const context = { $refs: { activeChild: { showApiErrors } } };
    const details = [{ field: "copyright", code: "too_long" }];

    Instances.methods.showApiErrors.call(context, {
      response: { status: 400, data: { error: "ValidationError", details } },
    });

    expect(showApiErrors).toHaveBeenCalledWith(details);
  });
});

async function mountView(query = {}) {
  ApiInstanceService.getInstance.mockResolvedValue({
    id: "i1",
    applications: [],
  });
  ApiCatalogService.getCatalog.mockResolvedValue({ data: {} });
  ApiUsersService.getUsers.mockResolvedValue([]);
  ApiRolesService.getRoles.mockResolvedValue({ data: [] });
  ApiTenantService.getTenants.mockResolvedValue({ data: [] });

  const replace = vi.fn();
  const store = new Vuex.Store({
    modules: { toasts: { namespaced: true, actions: { add: vi.fn() } } },
  });
  const wrapper = mountComponent(Instances, {
    store,
    mocks: {
      $route: { query },
      $router: { replace, beforeEach: () => () => {} },
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return { wrapper, replace };
}

const tabLabels = (wrapper) =>
  wrapper.findAll(".v-tab").wrappers.map((tab) => tab.text());
const activeTab = (wrapper) => wrapper.find(".v-tab--active").text();
const fieldLabels = (wrapper) =>
  wrapper.findAll(".v-text-field label").wrappers.map((label) => label.text());

describe("Instances tabs", () => {
  it("offers „Single Sign-On“ and „Karten“ instead of „Authentifizierung“", async () => {
    const { wrapper } = await mountView();

    const labels = tabLabels(wrapper);
    expect(labels).toContain("Single Sign-On");
    expect(labels).toContain("Karten");
    expect(labels).not.toContain("Authentifizierung");
  });

  it("opens „Single Sign-On“ for an old link with ?tab=auth", async () => {
    const { wrapper, replace } = await mountView({ tab: "auth" });

    expect(activeTab(wrapper)).toBe("Single Sign-On");
    expect(fieldLabels(wrapper)).toContain("Keycloak-URL");
    expect(replace).toHaveBeenLastCalledWith({ query: { tab: "sso" } });
  });
});
