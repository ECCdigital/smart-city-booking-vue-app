import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import BookableEditAccessLocks from "@/components/Bookable/Edit/BookableEditAccessLocks.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenant: vi.fn() },
}));

vi.mock("@/services/permissions/BookablePermissionService", () => ({
  default: { allowCreate: () => true, allowUpdate: () => true },
}));

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

function doorPanel(wrapper) {
  return wrapper.findAll(".v-expansion-panel").wrappers[0];
}

/**
 * The tenant app list is readable for tenant owners only. When it cannot be
 * read, availability of the door section is *unknown*, and the section stays
 * usable - the access point list itself is the honest gate. Since 4.3.x a
 * tenant outside the caller's reach answers 404 instead of 403, so a 404 has
 * to read as the same unknown; reading it as "the list is empty" tells an
 * editor the provider is not configured, which is a claim the UI cannot make.
 */
async function mountWithTenantError(error) {
  ApiTenantService.getTenant.mockRejectedValueOnce(error);

  const wrapper = mountComponent(BookableEditAccessLocks, {
    store: store(),
    propsData: { bookable: { id: "b1" } },
    stubs: {
      BookableEditLockerSystems: true,
      BookableEditAccessPoints: true,
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();

  return wrapper;
}

describe("BookableEditAccessLocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not claim the provider is missing when a 403 hid the app list", async () => {
    const wrapper = await mountWithTenantError({ response: { status: 403 } });
    expect(doorPanel(wrapper).text()).not.toMatch(/Nicht verfügbar/);
  });

  it("does not claim it on a 404 either", async () => {
    const wrapper = await mountWithTenantError({ response: { status: 404 } });
    expect(doorPanel(wrapper).text()).not.toMatch(/Nicht verfügbar/);
  });

  it("still reports a missing provider when the list was read and is empty", async () => {
    ApiTenantService.getTenant.mockResolvedValueOnce({
      data: { applications: [] },
    });

    const wrapper = mountComponent(BookableEditAccessLocks, {
      store: store(),
      propsData: { bookable: { id: "b1" } },
      stubs: {
        BookableEditLockerSystems: true,
        BookableEditAccessPoints: true,
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(doorPanel(wrapper).text()).toMatch(/Nicht verfügbar/);
  });
});
