import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookableEditAccessLocks from "@/components/Bookable/Edit/BookableEditAccessLocks.vue";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiTenantService from "@/services/api/ApiTenantService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn() },
}));

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn() },
}));

vi.mock("@/services/permissions/BookablePermissionService", () => ({
  default: { allowCreate: () => true, allowUpdate: () => true },
}));

vi.mock("@/services/permissions/AccessPointPermissionService", () => ({
  default: { allowWrite: () => false },
}));

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

async function mountLocks(bookable = {}) {
  const wrapper = mountComponent(BookableEditAccessLocks, {
    store: store(),
    propsData: {
      bookable: {
        id: "b1",
        amount: 3,
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: [],
        },
        ...bookable,
      },
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * Since the locker fold the access tab is one assignment table for doors and
 * locker systems alike. The three provider cards are gone, and with them the
 * "provider not active in the tenant" signal they carried - the picker simply
 * lists what the tenant has.
 */
describe("BookableEditAccessLocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiAccessPointService.getAccessPoints.mockResolvedValue({ data: [] });
  });

  it("no longer offers the three provider cards", async () => {
    const wrapper = await mountLocks();

    expect(wrapper.text()).not.toMatch(/Fahrradbox/);
    expect(wrapper.text()).not.toMatch(/Smartes Türschloss/);
  });

  it("does not read the tenant application list any more", async () => {
    await mountLocks();

    expect(ApiTenantService.getTenant).not.toHaveBeenCalled();
  });

  it("shows the capacity of the bookable and hands an edit back", async () => {
    const wrapper = await mountLocks({ amount: 3 });

    const field = wrapper.find(".capacity-field input");
    expect(field.element.value).toBe("3");

    await field.setValue("7");

    const updates = wrapper.emitted("update:bookable");
    expect(updates).toBeTruthy();
    expect(updates[updates.length - 1][0].amount).toBe(7);
  });

  /**
   * The pricing tab locks the amount when an external provider reports it
   * (`handles: ["maxAmount"]`). A second, unguarded editor for the same field
   * would let an admin overwrite what the provider owns.
   */
  it("locks the capacity while an external provider owns it", async () => {
    const wrapper = await mountLocks({
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["maxAmount"] },
      ],
    });

    const field = wrapper.find(".capacity-field input");
    expect(field.attributes("disabled")).toBeTruthy();
  });
});
