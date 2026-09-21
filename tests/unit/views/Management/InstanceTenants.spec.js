import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

let readable = [];

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenants: vi.fn(),
    tenantCountCheck: vi.fn(),
    getReadiness: vi.fn(),
  },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { allowReadiness: (tenantId) => readable.includes(tenantId) },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import InstanceTenants from "@/views/Management/InstanceTenants.vue";

const TENANTS = [
  { id: "t-1", name: "Sportverein" },
  { id: "t-2", name: "Makerspace" },
];

async function mountView() {
  const store = new Vuex.Store({
    modules: {
      loading: {
        namespaced: true,
        getters: { isLoading: () => false },
        actions: { start: vi.fn(), stop: vi.fn() },
      },
      user: {
        namespaced: true,
        getters: { allowToCreateTenants: () => false },
      },
      tenants: { namespaced: true, actions: { select: vi.fn() } },
    },
  });
  const wrapper = mountComponent(InstanceTenants, {
    store,
    stubs: {
      TenantEditDialog: true,
      TenantCreate: true,
      DeleteConformationDialog: true,
    },
  });
  await flushPromises();
  return wrapper;
}

async function openMenuOf(wrapper, index) {
  await wrapper.findAll("tbody tr").at(index).find("button").trigger("click");
  await flushPromises();
}

const readinessItems = () =>
  document.querySelectorAll("[data-test='open-readiness']");

beforeEach(() => {
  vi.clearAllMocks();
  readable = ["t-1", "t-2"];
  ApiTenantService.getTenants.mockResolvedValue({ data: TENANTS });
  ApiTenantService.tenantCountCheck.mockResolvedValue(true);
  ApiTenantService.getReadiness.mockResolvedValue({
    checkedAt: "2026-09-21T08:30:00.000Z",
    criteria: [
      { key: "offers", state: "missing", hint: "Kein Angebot.", offers: [] },
    ],
  });
});

describe("InstanceTenants", () => {
  it("opens the readiness check of the tenant chosen in the list", async () => {
    const wrapper = await mountView();
    expect(ApiTenantService.getReadiness).not.toHaveBeenCalled();

    // Sorted by name: Makerspace (t-2) comes first.
    await openMenuOf(wrapper, 0);
    readinessItems()[0].click();
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-2");
    const dialog = document.querySelector("[data-test='readiness-dialog']");
    expect(dialog.textContent).toContain("Makerspace");
    expect(dialog.textContent).toContain("Kein Angebot.");
  });

  it("offers the check only where the user may see it", async () => {
    readable = [];
    const wrapper = await mountView();

    await openMenuOf(wrapper, 0);

    expect(readinessItems()).toHaveLength(0);
  });
});
