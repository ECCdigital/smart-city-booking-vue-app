import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getReadiness: vi.fn() },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import TenantReadinessDialog from "@/components/Tenant/TenantReadinessDialog.vue";

const TENANT = { id: "t-7", name: "Sportverein" };

const mountDialog = (propsData) =>
  mountComponent(TenantReadinessDialog, {
    propsData: { open: true, tenant: TENANT, ...propsData },
  });

beforeEach(() => {
  vi.clearAllMocks();
  ApiTenantService.getReadiness.mockResolvedValue({
    checkedAt: "2026-09-21T08:30:00.000Z",
    criteria: [
      { key: "offers", state: "missing", hint: "Kein Angebot.", offers: [] },
    ],
  });
});

describe("TenantReadinessDialog", () => {
  it("shows the check of the named tenant", async () => {
    mountDialog();
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-7");
    const dialog = document.querySelector("[data-test='readiness-dialog']");
    expect(dialog.textContent).toContain("Sportverein");
    expect(dialog.textContent).toContain("Kein Angebot.");
  });

  it("computes nothing while it is closed", async () => {
    mountDialog({ open: false });
    await flushPromises();

    expect(ApiTenantService.getReadiness).not.toHaveBeenCalled();
  });

  it("computes the check again each time it opens", async () => {
    const wrapper = mountDialog();
    await flushPromises();
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledTimes(2);
  });

  it("asks to be closed", async () => {
    const wrapper = mountDialog();
    await flushPromises();

    document.querySelector("[data-test='readiness-dialog-close']").click();

    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
