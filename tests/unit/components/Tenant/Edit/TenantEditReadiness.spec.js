import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getReadiness: vi.fn() },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import TenantEditReadiness from "@/components/Tenant/Edit/TenantEditReadiness.vue";

// The tenant settings keep their tabs alive, as `TenantOverview.vue` does.
const Host = {
  props: { tenant: { type: Object, required: true } },
  data: () => ({ shown: true }),
  render(h) {
    return h("keep-alive", [
      this.shown
        ? h(TenantEditReadiness, { props: { tenant: this.tenant } })
        : null,
    ]);
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  ApiTenantService.getReadiness.mockResolvedValue({
    checkedAt: "2026-09-21T08:30:00.000Z",
    criteria: [],
  });
});

describe("TenantEditReadiness", () => {
  it("shows the check of the tenant being edited", async () => {
    mountComponent(Host, { propsData: { tenant: { id: "t-1" } } });
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledTimes(1);
    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-1");
  });

  it("waits for the tenant to be loaded", async () => {
    mountComponent(Host, { propsData: { tenant: {} } });
    await flushPromises();

    expect(ApiTenantService.getReadiness).not.toHaveBeenCalled();
  });

  it("computes the check again when the tab is shown again", async () => {
    const wrapper = mountComponent(Host, {
      propsData: { tenant: { id: "t-1" } },
    });
    await flushPromises();

    await wrapper.setData({ shown: false });
    await wrapper.setData({ shown: true });
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledTimes(2);
  });
});
