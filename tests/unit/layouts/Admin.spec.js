import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/components/Navbar", () => ({
  default: { name: "Navbar", render: () => null },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenants: vi.fn(async () => ({
      data: [{ id: "tenant-a", name: "SV Blau-Weiß" }],
    })),
  },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { allowUpdate: () => true },
}));

import AdminLayout from "@/layouts/Admin.vue";

const ROOMS = { requiresAuth: true, interfaceName: "rooms", title: "Räume" };
const MY_TENANTS = {
  requiresAuth: true,
  interfaceName: "dashboard",
  public: true,
  title: "Meine Mandanten",
};

let level;

function mountLayout(meta, propsData = {}) {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        getters: { supervisionLevelOf: () => () => level },
      },
      tenants: {
        namespaced: true,
        getters: {
          currentTenantId: () => "tenant-a",
          currentTenant: () => ({ id: "tenant-a", name: "SV Blau-Weiß" }),
          currentSupervisionLevel: () => null,
        },
        actions: {
          setTenants: vi.fn(),
          select: vi.fn(),
          loadSupervisionLevel: vi.fn(),
        },
      },
    },
  });
  return mountComponent(AdminLayout, {
    store,
    propsData,
    mocks: { $route: { meta }, $router: { replace: vi.fn(), push: vi.fn() } },
  });
}

const banner = (wrapper) =>
  wrapper.find("[data-test='supervision-pending-banner']");

function follows(earlier, later) {
  return (
    earlier.element.compareDocumentPosition(later.element) &
    Node.DOCUMENT_POSITION_FOLLOWING
  );
}

beforeEach(() => {
  level = "pending";
});

describe("AdminLayout — the band of a waiting tenant", () => {
  it("stands under the page title of a tenant page", async () => {
    const wrapper = mountLayout(ROOMS);
    await flushPromises();

    expect(banner(wrapper).exists()).toBe(true);
    expect(follows(wrapper.find("h1"), banner(wrapper))).toBeTruthy();
  });

  it("stands under the title of a page with a scrolling body as well", async () => {
    const wrapper = mountLayout(ROOMS, { scrollBody: true });
    await flushPromises();

    const header = wrapper.find(".admin-page__header");
    expect(
      header.find("[data-test='supervision-pending-banner']").exists()
    ).toBe(true);
  });

  it("stays off pages that belong to no tenant", async () => {
    const wrapper = mountLayout(MY_TENANTS);
    await flushPromises();

    expect(banner(wrapper).exists()).toBe(false);
  });
});
