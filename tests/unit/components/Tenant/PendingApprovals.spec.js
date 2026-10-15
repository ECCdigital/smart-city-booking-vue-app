import { describe, expect, it, vi } from "vitest";
import PendingApprovals from "@/components/Tenant/PendingApprovals.vue";
import ApiMembershipService from "@/services/api/ApiMembershipService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiMembershipService", () => ({
  default: { getMyPendingMemberships: vi.fn() },
}));

async function mountApprovals(approvals) {
  ApiMembershipService.getMyPendingMemberships.mockResolvedValue({
    data: approvals,
  });
  const wrapper = mountComponent(PendingApprovals);
  await flushPromises();
  return wrapper;
}

describe("PendingApprovals", () => {
  // A dark primary colour (VUE_APP_PRIMARY_COLOR_DARK) all but vanished on
  // the dark alert (ECCdigital/tickets#307). The link token lightens it under
  // .theme--dark; the bare Vuetify class `primary--text` cannot.
  it("names the tenant in the link colour, not the bare primary colour", async () => {
    const wrapper = await mountApprovals([
      { tenantId: "t1", tenantName: "Stadtbibliothek" },
    ]);
    const tenant = wrapper.find(".pending-approvals__tenant");

    expect(tenant.text()).toBe("Stadtbibliothek");
    expect(tenant.classes()).not.toContain("primary--text");
  });
});
