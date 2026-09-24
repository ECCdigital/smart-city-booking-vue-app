import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { createTenant: vi.fn() },
}));
vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getPublicInstance: vi.fn() },
}));
vi.mock("@/services/api/ApiAuthService", () => ({
  default: { resendVerification: vi.fn() },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { isInstanceOwner: () => instanceOwner },
}));

import ApiInstanceService from "@/services/api/ApiInstanceService";
import TenantCreate from "@/components/Tenant/TenantCreate.vue";

let instanceOwner;

async function openDialog() {
  const store = new Vuex.Store({
    modules: {
      user: { namespaced: true, getters: { getUser: () => ({}) } },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t-1" },
      },
    },
  });
  const wrapper = mountComponent(TenantCreate, {
    propsData: { open: false },
    store,
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
}

// The dialog detaches into the `data-app` element.
const notice = () => document.querySelector("[data-test='supervision-notice']");

beforeEach(() => {
  instanceOwner = false;
  ApiInstanceService.getPublicInstance.mockReset();
  ApiInstanceService.getPublicInstance.mockResolvedValue({
    tenantInitialSupervisionLevel: "free",
  });
});

describe("TenantCreate — start level before the self-creation", () => {
  it.each([
    ["supervised", "beaufsichtigt"],
    ["blocked", "gesperrt"],
  ])("announces the start level %s", async (level, name) => {
    ApiInstanceService.getPublicInstance.mockResolvedValue({
      tenantInitialSupervisionLevel: level,
    });

    await openDialog();

    expect(notice().textContent).toContain(name);
  });

  it("explains nothing at the start level free", async () => {
    await openDialog();

    expect(notice()).toBeNull();
  });

  it("tells the instance owner nothing: the tenant starts free", async () => {
    instanceOwner = true;
    ApiInstanceService.getPublicInstance.mockResolvedValue({
      tenantInitialSupervisionLevel: "blocked",
    });

    await openDialog();

    expect(notice()).toBeNull();
    expect(ApiInstanceService.getPublicInstance).not.toHaveBeenCalled();
  });

  it("stays usable when the start level cannot be read", async () => {
    ApiInstanceService.getPublicInstance.mockRejectedValue(new Error("down"));

    await openDialog();

    expect(notice()).toBeNull();
    expect(document.querySelector(".v-dialog--active")).not.toBeNull();
  });
});
