import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn(async () => ({ data: [] })) },
}));
vi.mock("@/layouts/Admin", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));
vi.mock("@/components/Tenant/PendingApprovals.vue", () => ({
  default: { name: "PendingApprovals", render: () => null },
}));
vi.mock("@/components/Tenant/PendingTenantInvitations.vue", () => ({
  default: { name: "PendingTenantInvitations", render: () => null },
}));
vi.mock("@/components/Tenant/TenantCreate.vue", () => ({
  default: { name: "TenantCreate", props: ["open"], render: () => null },
}));

import Home from "@/views/Home.vue";

const TENANTS = [{ id: "tenant-a", name: "Musterstadt" }];

let authorizedInterfaces;
let permissionsLoaded;
let push;
let selected;

let redirect;

function mountHome() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { tenants: () => TENANTS, currentTenantId: () => null },
        actions: {
          select: (context, tenantId) => {
            selected = tenantId;
          },
          setTenants: vi.fn(),
        },
      },
      user: {
        namespaced: true,
        getters: {
          allowToCreateTenants: () => false,
          // Mirrors the real getter: denied only where the reach is known.
          isDenied: () => (ifce) =>
            permissionsLoaded && !authorizedInterfaces.includes(ifce),
        },
      },
    },
  });

  return mountComponent(Home, {
    store,
    mocks: {
      $router: { push, resolve: () => ({ route: { matched: [{}] } }) },
      $route: { query: redirect ? { redirect } : {} },
    },
  });
}

beforeEach(() => {
  authorizedInterfaces = ["bookings"];
  permissionsLoaded = true;
  push = vi.fn();
  selected = null;
  redirect = null;
});

describe("Home — picking a tenant", () => {
  it("opens the booking list of the picked tenant", async () => {
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(selected).toBe("tenant-a");
    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });

  it("stays on the overview when the membership has no booking reach", async () => {
    authorizedInterfaces = ["rooms"];
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(selected).toBe("tenant-a");
    expect(push).not.toHaveBeenCalled();
  });

  it("follows a redirect the user asked for, reach or not — the router explains the refusal there", async () => {
    redirect = "/coupons";
    authorizedInterfaces = [];
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(push).toHaveBeenCalledWith("/coupons");
  });

  it("keeps opening the booking list while the reach is unknown", async () => {
    permissionsLoaded = false;
    authorizedInterfaces = [];
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });
});
