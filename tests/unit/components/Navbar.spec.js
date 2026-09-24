import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import VueRouter from "vue-router";
import { createLocalVue } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn() },
}));
vi.mock("@/services/api/ApiReviewQueueService", () => ({
  default: { getReviewQueue: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantApprovalQueueService", () => ({
  default: { getTenantApprovalQueue: vi.fn() },
}));
vi.mock("@/services/api/ApiAuthService", () => ({
  default: { logout: vi.fn() },
}));
vi.mock("@/services/api/ApiClientService", () => ({
  default: { getAuthType: vi.fn() },
}));
vi.mock("@/services/KeycloakService", () => ({
  default: { logout: vi.fn() },
}));
vi.mock("@/components/NotificationDisplay", () => ({
  default: {
    name: "NotificationDisplay",
    render(h) {
      return h("div");
    },
  },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import ApiReviewQueueService from "@/services/api/ApiReviewQueueService";
import ApiTenantApprovalQueueService from "@/services/api/ApiTenantApprovalQueueService";
import Navbar from "@/components/Navbar.vue";

const localVue = createLocalVue();
localVue.use(VueRouter);

// The entries the drawer shows without a current tenant.
const ROUTES = [
  "dashboard",
  "dataDashboard",
  "instances",
  "instance-tenants",
  "instance-review-queue",
  "instance-users",
  "rules",
  "settings",
].map((name) => ({ path: `/${name}`, name }));

const pageOfOne = (total) => ({
  items: total ? [{}] : [],
  total,
  page: 1,
  pageSize: 1,
});

let instanceOwner;

async function mountNavbar() {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { data: { permissions: { instanceOwner, tenants: [] } } },
        getters: {
          getUser: () => ({ firstName: "Ina" }),
          isAuthorized: () => () => true,
        },
        actions: { delete: vi.fn() },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => null },
        actions: { select: vi.fn() },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(Navbar, {
    localVue,
    store,
    router: new VueRouter({ routes: ROUTES }),
  });
  await flushPromises();
  return wrapper;
}

const badge = (wrapper) =>
  wrapper.find("[data-test='nav-badge-instance-review-queue']");

beforeEach(() => {
  vi.clearAllMocks();
  ApiTenantService.getTenants.mockResolvedValue({ data: [] });
  instanceOwner = true;
  ApiReviewQueueService.getReviewQueue.mockResolvedValue(pageOfOne(3));
  ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
    pageOfOne(2)
  );
});

describe("Navbar", () => {
  describe("the badge of the Prüfliste", () => {
    it("sums the counters of both registers", async () => {
      const wrapper = await mountNavbar();

      expect(ApiReviewQueueService.getReviewQueue).toHaveBeenCalledWith({
        page: 1,
        pageSize: 1,
      });
      expect(
        ApiTenantApprovalQueueService.getTenantApprovalQueue
      ).toHaveBeenCalledWith({ page: 1, pageSize: 1 });
      expect(badge(wrapper).text()).toBe("5");
    });

    it("shows no badge when nothing waits", async () => {
      ApiReviewQueueService.getReviewQueue.mockResolvedValue(pageOfOne(0));
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
        pageOfOne(0)
      );
      const wrapper = await mountNavbar();

      expect(badge(wrapper).exists()).toBe(false);
    });

    it("asks nothing for anyone but an instance owner", async () => {
      instanceOwner = false;
      const wrapper = await mountNavbar();

      expect(ApiReviewQueueService.getReviewQueue).not.toHaveBeenCalled();
      expect(
        ApiTenantApprovalQueueService.getTenantApprovalQueue
      ).not.toHaveBeenCalled();
      expect(badge(wrapper).exists()).toBe(false);
    });

    it("counts the register it could read when the other fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockRejectedValue(
        serverError()
      );
      const wrapper = await mountNavbar();

      expect(badge(wrapper).text()).toBe("3");
    });
  });
});
