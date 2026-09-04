import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn(), deleteAccessPoint: vi.fn() },
}));
vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { getProviders: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));
vi.mock("@/components/AccessPoint/AccessPointEditDialog.vue", () => ({
  default: { name: "AccessPointEditDialog", render: () => null },
}));
vi.mock("@/components/AccessPoint/AccessPointDeleteDialog.vue", () => ({
  default: { name: "AccessPointDeleteDialog", render: () => null },
}));
vi.mock("@/components/AccessPoint/AccessPointRotateDialog.vue", () => ({
  default: { name: "AccessPointRotateDialog", render: () => null },
}));

import AccessPointManagement from "@/components/AccessPoint/AccessPointManagement.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";

const UNASSIGNED = "Keinem Buchungsobjekt zugeordnet";
const NOT_READABLE = "Nicht abrufbar";
const HINT = "Die Spalte „Zuordnung“ kann nicht gefüllt werden";

async function mountManagement() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant-1" },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(AccessPointManagement, { store });
  await flushPromises();
  await wrapper.vm.$nextTick();
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * The assignment column is resolved from the bookables, not from the access
 * points, so a denied bookable list leaves it unresolvable. The original
 * decision - "the list stays usable without the assignment column" - is kept:
 * nothing replaces the table. What is not kept is the column then claiming
 * "Keinem Buchungsobjekt zugeordnet" for every row, which is an assertion
 * about data the user was refused.
 */
describe("AccessPointManagement", () => {
  it("keeps the access point table when the bookable list is forbidden", async () => {
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [{ id: "ap1", label: "Door", externalId: "x1" }],
    });
    ApiAccessAppsService.getProviders.mockResolvedValue({ data: [] });
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());

    const wrapper = await mountManagement();

    expect(wrapper.text()).toContain("Door");
    expect(wrapper.text()).toContain(NOT_READABLE);
    expect(wrapper.text()).not.toContain(UNASSIGNED);
    expect(wrapper.text()).toContain(HINT);
  });

  it("still says 'not assigned' when the bookables were readable", async () => {
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [{ id: "ap1", label: "Door", externalId: "x1" }],
    });
    ApiAccessAppsService.getProviders.mockResolvedValue({ data: [] });
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });

    const wrapper = await mountManagement();

    expect(wrapper.text()).toContain(UNASSIGNED);
    expect(wrapper.text()).not.toContain(NOT_READABLE);
    expect(wrapper.text()).not.toContain(HINT);
  });
});
