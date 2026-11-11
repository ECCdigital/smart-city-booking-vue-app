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
  default: {
    getInstance: vi.fn(),
    updateInstance: vi.fn(),
    getPublicInstance: vi.fn(),
  },
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

async function mountView(query = {}, instance = {}) {
  ApiInstanceService.getInstance.mockResolvedValue({
    id: "i1",
    applications: [],
    ...instance,
  });
  ApiCatalogService.getCatalog.mockResolvedValue({ data: {} });
  ApiUsersService.getUsers.mockResolvedValue([]);
  ApiRolesService.getRoles.mockResolvedValue({ data: [] });
  ApiTenantService.getTenants.mockResolvedValue({ data: [] });

  ApiInstanceService.getPublicInstance.mockResolvedValue({
    customerUploadCeilings: {
      maxFileSizeMb: 10,
      maxFilesPerBooking: 20,
      maxTotalSizeMbPerBooking: 100,
    },
  });

  const replace = vi.fn();
  const addToast = vi.fn();
  const updatePublicInstance = vi.fn();
  const store = new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: addToast } },
      instance: {
        namespaced: true,
        actions: { update: updatePublicInstance },
        getters: {
          instance: () => ({
            customerUploadCeilings: {
              maxFileSizeMb: 10,
              maxFilesPerBooking: 20,
              maxTotalSizeMbPerBooking: 100,
            },
          }),
        },
      },
    },
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
  return { wrapper, replace, addToast, updatePublicInstance };
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

describe("Instances save in „Single Sign-On“", () => {
  const savedHint = (wrapper) => wrapper.find("[data-test='sso-saved']");

  async function changeRealmAndSave(wrapper) {
    const realm = wrapper
      .findAll(".v-text-field")
      .wrappers.find((f) => f.find("label").text() === "Realm");
    await realm.find("input").setValue("biletado");
    await wrapper.vm.$nextTick();
    await wrapper.find(".save-bar-btn--primary").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();
  }

  it("says after saving that sign-in runs on the old values for up to a minute", async () => {
    ApiInstanceService.updateInstance.mockResolvedValue({});
    ApiCatalogService.updateCatalog.mockResolvedValue({});
    const { wrapper } = await mountView({ tab: "sso" });

    expect(savedHint(wrapper).exists()).toBe(false);

    await changeRealmAndSave(wrapper);

    expect(ApiInstanceService.updateInstance).toHaveBeenCalled();
    expect(savedHint(wrapper).text()).toContain(
      "bis zu einer Minute noch mit den alten Werten"
    );
  });

  it("drops the hint when the tab is left", async () => {
    ApiInstanceService.updateInstance.mockResolvedValue({});
    ApiCatalogService.updateCatalog.mockResolvedValue({});
    const { wrapper } = await mountView({ tab: "sso" });
    await changeRealmAndSave(wrapper);

    const tab = (label) =>
      wrapper.findAll(".v-tab").wrappers.find((t) => t.text() === label);
    await tab("Karten").trigger("click");
    await wrapper.vm.$nextTick();
    await tab("Single Sign-On").trigger("click");
    await wrapper.vm.$nextTick();

    expect(activeTab(wrapper)).toBe("Single Sign-On");
    expect(savedHint(wrapper).exists()).toBe(false);
  });

  it("names the missing admin instead of the general error when the backend refuses the owners", async () => {
    ApiInstanceService.updateInstance.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: "BadRequestError",
          code: "instance_owners_required",
          statusCode: 400,
          params: { field: "ownerUserIds" },
        },
      },
    });
    const { wrapper, addToast } = await mountView({ tab: "sso" });

    await changeRealmAndSave(wrapper);

    expect(addToast).toHaveBeenLastCalledWith(expect.anything(), {
      message:
        "Die Instanz braucht mindestens einen Admin. Fügen Sie im Tab „Admin“ einen hinzu.",
      type: "error",
    });
  });

  it("says nothing of the kind when saving fails", async () => {
    ApiInstanceService.updateInstance.mockRejectedValue(new Error("down"));
    const { wrapper, addToast } = await mountView({ tab: "sso" });

    await changeRealmAndSave(wrapper);

    expect(ApiInstanceService.updateInstance).toHaveBeenCalled();
    expect(savedHint(wrapper).exists()).toBe(false);
    expect(addToast).toHaveBeenLastCalledWith(expect.anything(), {
      message: "Fehler beim Aktualisieren der Instanz",
      type: "error",
    });
  });
});

describe("Instances save in „Admin“", () => {
  it("keeps the save back without an admin and toasts the missing admin beside the banner", async () => {
    ApiInstanceService.updateInstance.mockClear();
    const { wrapper, addToast } = await mountView(
      { tab: "owners" },
      { ownerUserIds: ["admin"] }
    );

    await wrapper.find("[data-test='remove-owner']").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.find(".save-bar-btn--primary").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(ApiInstanceService.updateInstance).not.toHaveBeenCalled();
    expect(wrapper.find("[data-test='owners-missing']").exists()).toBe(true);
    expect(addToast).toHaveBeenLastCalledWith(expect.anything(), {
      message: "Instanz muss mindestens einen Admin haben",
      type: "error",
    });
  });
});

describe("Instances: Nachweise von Buchenden in „Buchungsobjekte“", () => {
  const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

  async function save(wrapper) {
    await wrapper.find(".save-bar-btn--primary").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();
  }

  it("clears customer uploads for the tenants and saves the switch", async () => {
    ApiInstanceService.updateInstance.mockResolvedValue({});
    ApiCatalogService.updateCatalog.mockResolvedValue({});
    const { wrapper, updatePublicInstance } = await mountView({
      tab: "bookables",
    });

    expect(
      find(wrapper, "instance-customer-uploads-maxFileSizeMb").exists()
    ).toBe(false);
    await find(wrapper, "instance-customer-uploads-enabled")
      .find("input")
      .trigger("click");
    await wrapper.vm.$nextTick();
    expect(
      find(wrapper, "instance-customer-uploads-maxFileSizeMb").exists()
    ).toBe(true);

    await save(wrapper);

    expect(ApiInstanceService.updateInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        customerUploads: {
          enabled: true,
          maxFileSizeMb: null,
          maxFilesPerBooking: null,
          maxTotalSizeMbPerBooking: null,
        },
      })
    );
    // The rest of the Admin UI sees the clearance at once.
    expect(ApiInstanceService.getPublicInstance).toHaveBeenCalled();
    expect(updatePublicInstance).toHaveBeenCalled();
  });

  it("saves a limit below the ceiling as a number", async () => {
    ApiInstanceService.updateInstance.mockResolvedValue({});
    ApiCatalogService.updateCatalog.mockResolvedValue({});
    const { wrapper } = await mountView(
      { tab: "bookables" },
      { customerUploads: { enabled: true } }
    );

    await find(wrapper, "instance-customer-uploads-maxFilesPerBooking")
      .find("input")
      .setValue("5");
    await save(wrapper);

    expect(
      ApiInstanceService.updateInstance.mock.calls.at(-1)[0].customerUploads
    ).toMatchObject({ enabled: true, maxFilesPerBooking: 5 });
  });

  it("refuses a limit above the ceiling of the server before saving", async () => {
    ApiInstanceService.updateInstance.mockReset();
    ApiInstanceService.updateInstance.mockResolvedValue({});
    const { wrapper } = await mountView(
      { tab: "bookables" },
      { customerUploads: { enabled: true } }
    );

    await find(wrapper, "instance-customer-uploads-maxFileSizeMb")
      .find("input")
      .setValue("11");
    await save(wrapper);

    expect(ApiInstanceService.updateInstance).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(
      "Geben Sie eine ganze Zahl von 1 bis 10 an oder lassen Sie das Feld leer."
    );
  });
});
