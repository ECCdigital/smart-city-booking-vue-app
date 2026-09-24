import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn() },
}));

// The selection is written through to the local storage, which is not the
// subject here.
vi.mock("@/services/PersistenceService", () => ({
  default: {
    getFromLocalStorage: vi.fn(() => null),
    writeToLocalStorage: vi.fn(),
    removeFromLocalStorage: vi.fn(),
  },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import tenants from "@/store/modules/tenants";

const OWNER = {
  instanceOwner: false,
  tenants: [{ tenantId: "t-1", isOwner: true }],
};

function createStore(permissions = OWNER) {
  return new Vuex.Store({
    modules: {
      user: { namespaced: true, state: { data: { permissions } } },
      tenants: {
        ...tenants,
        state: { ...tenants.state, tenants: [], currentTenantId: "t-1" },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The tenant list of the store is the public projection, which carries no
 * `supervisionLevel`; the level comes with the admin DTO of the one tenant.
 */
describe("tenants/currentSupervisionLevel", () => {
  it("is unknown until the current tenant's admin DTO was read", () => {
    expect(createStore().getters["tenants/currentSupervisionLevel"]).toBe(null);
  });

  it("reads the level of the current tenant from its admin DTO", async () => {
    ApiTenantService.getTenant.mockResolvedValue({
      data: { id: "t-1", supervisionLevel: "supervised" },
    });
    const store = createStore();

    await store.dispatch("tenants/loadSupervisionLevel");

    expect(ApiTenantService.getTenant).toHaveBeenCalledWith("t-1");
    expect(store.getters["tenants/currentSupervisionLevel"]).toBe("supervised");
  });

  it("answers for the selected tenant only", async () => {
    ApiTenantService.getTenant.mockResolvedValue({
      data: { id: "t-1", supervisionLevel: "pending" },
    });
    const store = createStore();
    await store.dispatch("tenants/loadSupervisionLevel");

    await store.dispatch("tenants/select", "t-2");

    expect(store.getters["tenants/currentSupervisionLevel"]).toBe(null);
  });

  it("stays unknown for a viewer who may not read the tenant", async () => {
    ApiTenantService.getTenant.mockRejectedValue(forbiddenError());
    const store = createStore();

    await store.dispatch("tenants/loadSupervisionLevel");

    expect(store.getters["tenants/currentSupervisionLevel"]).toBe(null);
  });

  it("asks nothing for a member who does not own the tenant - the backend would refuse", async () => {
    const store = createStore({
      instanceOwner: false,
      tenants: [{ tenantId: "t-1", isOwner: false }],
    });

    await store.dispatch("tenants/loadSupervisionLevel");

    expect(ApiTenantService.getTenant).not.toHaveBeenCalled();
  });

  it("follows the selection, for any tenant on behalf of the instance owner", async () => {
    ApiTenantService.getTenant.mockResolvedValue({
      data: { id: "t-2", supervisionLevel: "supervised" },
    });
    const store = createStore({ instanceOwner: true, tenants: [] });

    await store.dispatch("tenants/select", "t-2");
    await flushPromises();

    expect(ApiTenantService.getTenant).toHaveBeenCalledWith("t-2");
    expect(store.getters["tenants/currentSupervisionLevel"]).toBe("supervised");
  });

  it("asks nothing without a selected tenant", async () => {
    const store = createStore();
    await store.dispatch("tenants/select", null);

    await store.dispatch("tenants/loadSupervisionLevel");

    expect(ApiTenantService.getTenant).not.toHaveBeenCalled();
  });
});
