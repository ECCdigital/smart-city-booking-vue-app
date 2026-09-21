import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn(), submitTenant: vi.fn() },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import TenantEditDialog from "@/components/Tenant/TenantEditDialog.vue";

async function openDialog(tenant) {
  ApiTenantService.getTenant.mockResolvedValue({
    data: { applications: [], ...tenant },
  });
  const store = new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(TenantEditDialog, {
    store,
    propsData: { open: true, tenantId: tenant.id },
    stubs: { MailKonfiguration: true },
  });
  await flushPromises();
  return wrapper;
}

async function save(wrapper) {
  await wrapper.find("[data-test='tenant-edit-submit']").trigger("click");
  await flushPromises();
}

describe("TenantEditDialog — the required contact is not retroactive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiTenantService.submitTenant.mockResolvedValue({ status: 200 });
  });

  it("saves a tenant from before the required contact", async () => {
    const wrapper = await openDialog({ id: "t-old", name: "Altverein" });

    await save(wrapper);

    expect(ApiTenantService.submitTenant).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t-old", name: "Altverein" })
    );
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("still refuses a contact mail that is filled but formally invalid", async () => {
    const wrapper = await openDialog({
      id: "t-old",
      name: "Altverein",
      mail: "kontakt@",
    });

    await save(wrapper);

    expect(ApiTenantService.submitTenant).not.toHaveBeenCalled();
  });

  it("still requires the name", async () => {
    const wrapper = await openDialog({ id: "t-old", name: "" });

    await save(wrapper);

    expect(ApiTenantService.submitTenant).not.toHaveBeenCalled();
  });
});
