import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

let readable = [];
let instanceOwner = false;

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenants: vi.fn(),
    tenantCountCheck: vi.fn(),
    getReadiness: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiSupervisionService", () => ({
  default: {
    setTenantLevel: vi.fn(),
    getTenantHistory: vi.fn(),
    getInstanceHistory: vi.fn(),
  },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    allowReadiness: (tenantId) => readable.includes(tenantId),
    allowSupervise: () => instanceOwner,
    allowSupervisionHistory: () => instanceOwner,
    allowInstanceSupervisionHistory: () => instanceOwner,
  },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import InstanceTenants from "@/views/Management/InstanceTenants.vue";

const TENANTS = [
  { id: "t-1", name: "Sportverein", supervisionLevel: "blocked" },
  // From before the supervision: no stored level.
  { id: "t-2", name: "Makerspace" },
];

const addToast = vi.fn();

async function mountView() {
  const store = new Vuex.Store({
    modules: {
      loading: {
        namespaced: true,
        getters: { isLoading: () => false },
        actions: { start: vi.fn(), stop: vi.fn() },
      },
      user: {
        namespaced: true,
        getters: { allowToCreateTenants: () => false },
      },
      tenants: { namespaced: true, actions: { select: vi.fn() } },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(InstanceTenants, {
    store,
    stubs: {
      TenantEditDialog: true,
      TenantCreate: true,
      DeleteConformationDialog: true,
    },
  });
  await flushPromises();
  return wrapper;
}

async function openMenuOf(wrapper, index) {
  await wrapper.findAll("tbody tr").at(index).find("button").trigger("click");
  await flushPromises();
}

const readinessItems = () =>
  document.querySelectorAll("[data-test='open-readiness']");

const menuItem = (name) => document.querySelector(`[data-test='${name}']`);
const rowTexts = (wrapper) =>
  wrapper
    .findAll("tbody tr")
    .wrappers.map((row) => row.text().replace(/\s+/g, " "));

beforeEach(() => {
  vi.clearAllMocks();
  readable = ["t-1", "t-2"];
  instanceOwner = false;
  ApiSupervisionService.getTenantHistory.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
  });
  ApiSupervisionService.getInstanceHistory.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
  });
  ApiTenantService.getTenants.mockResolvedValue({ data: TENANTS });
  ApiTenantService.tenantCountCheck.mockResolvedValue(true);
  ApiTenantService.getReadiness.mockResolvedValue({
    checkedAt: "2026-09-21T08:30:00.000Z",
    criteria: [
      { key: "offers", state: "missing", hint: "Kein Angebot.", offers: [] },
    ],
  });
});

describe("InstanceTenants", () => {
  it("opens the readiness check of the tenant chosen in the list", async () => {
    const wrapper = await mountView();
    expect(ApiTenantService.getReadiness).not.toHaveBeenCalled();

    // Sorted by name: Makerspace (t-2) comes first.
    await openMenuOf(wrapper, 0);
    readinessItems()[0].click();
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-2");
    const dialog = document.querySelector("[data-test='readiness-dialog']");
    expect(dialog.textContent).toContain("Makerspace");
    expect(dialog.textContent).toContain("Kein Angebot.");
  });

  it("offers the check only where the user may see it", async () => {
    readable = [];
    const wrapper = await mountView();

    await openMenuOf(wrapper, 0);

    expect(readinessItems()).toHaveLength(0);
  });

  describe("supervision", () => {
    it("shows the instance owner the level of every tenant, free where none is stored", async () => {
      instanceOwner = true;
      const wrapper = await mountView();

      expect(wrapper.find("thead").text()).toContain("Aufsichtsstufe");
      const [makerspace, sportverein] = rowTexts(wrapper);
      expect(makerspace).toContain("frei");
      expect(sportverein).toContain("gesperrt");
    });

    it("keeps level, filter and supervision actions from everyone else", async () => {
      const wrapper = await mountView();

      expect(wrapper.find("thead").text()).not.toContain("Aufsichtsstufe");
      expect(wrapper.findComponent({ ref: "levelFilter" }).exists()).toBe(
        false
      );
      expect(wrapper.find("[data-test='open-instance-history']").exists()).toBe(
        false
      );

      await openMenuOf(wrapper, 0);
      expect(menuItem("open-level-change")).toBeNull();
      expect(menuItem("open-supervision-history")).toBeNull();
    });

    it("filters the list by level on the server", async () => {
      instanceOwner = true;
      const wrapper = await mountView();
      expect(ApiTenantService.getTenants).toHaveBeenLastCalledWith(false, {
        supervisionLevel: null,
      });

      wrapper
        .findComponent({ ref: "levelFilter" })
        .vm.$emit("input", "blocked");
      await flushPromises();

      expect(ApiTenantService.getTenants).toHaveBeenLastCalledWith(false, {
        supervisionLevel: "blocked",
      });
    });

    it("changes the level of the chosen tenant and shows the effective level", async () => {
      instanceOwner = true;
      ApiSupervisionService.setTenantLevel.mockResolvedValue({
        supervisionLevel: "supervised",
        supervisionChangedAt: "2026-09-21T08:30:00.000Z",
      });
      const wrapper = await mountView();

      // Sorted by name: Makerspace (t-2) comes first.
      await openMenuOf(wrapper, 0);
      menuItem("open-level-change").click();
      await flushPromises();
      document
        .querySelector("input[data-test='level-option-supervised']")
        .click();
      await flushPromises();
      document.querySelector("[data-test='level-submit']").click();
      await flushPromises();

      expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-2", {
        level: "supervised",
        reason: null,
      });
      expect(rowTexts(wrapper)[0]).toContain("beaufsichtigt");
      expect(addToast.mock.calls[0][1].message).toBe(
        "„Makerspace“ ist jetzt beaufsichtigt."
      );
    });

    it("reloads list and dialog when the level moved underneath the dialog", async () => {
      instanceOwner = true;
      ApiSupervisionService.setTenantLevel.mockRejectedValue({
        response: {
          status: 409,
          data: { code: "supervision_level_changed", statusCode: 409 },
        },
      });
      const wrapper = await mountView();
      ApiTenantService.getTenants.mockClear();
      // Someone else blocked the Makerspace in the meantime.
      ApiTenantService.getTenants.mockResolvedValue({
        data: [TENANTS[0], { ...TENANTS[1], supervisionLevel: "blocked" }],
      });

      await openMenuOf(wrapper, 0);
      menuItem("open-level-change").click();
      await flushPromises();
      document.querySelector("input[data-test='level-option-blocked']").click();
      await flushPromises();
      document.querySelector("[data-test='level-submit']").click();
      await flushPromises();

      expect(ApiTenantService.getTenants).toHaveBeenCalledTimes(1);
      expect(rowTexts(wrapper)[0]).toContain("gesperrt");
      // The dialog follows: the level now effective is no longer on offer.
      expect(
        document.querySelector("input[data-test='level-option-blocked']")
      ).toBeNull();
      expect(
        document.querySelector("[data-test='level-submit']").disabled
      ).toBe(true);
    });

    it("opens the supervision history of the chosen tenant", async () => {
      instanceOwner = true;
      const wrapper = await mountView();

      await openMenuOf(wrapper, 0);
      menuItem("open-supervision-history").click();
      await flushPromises();

      expect(ApiSupervisionService.getTenantHistory).toHaveBeenCalledWith(
        "t-2",
        { page: 1, pageSize: 25 }
      );
      expect(
        document.querySelector("[data-test='supervision-history-dialog']")
          .textContent
      ).toContain("Makerspace");
    });

    it("opens the instance-wide supervision history", async () => {
      instanceOwner = true;
      const wrapper = await mountView();

      await wrapper
        .find("[data-test='open-instance-history']")
        .trigger("click");
      await flushPromises();

      expect(ApiSupervisionService.getInstanceHistory).toHaveBeenCalledWith({
        page: 1,
        pageSize: 25,
      });
      expect(ApiSupervisionService.getTenantHistory).not.toHaveBeenCalled();
    });
  });
});
