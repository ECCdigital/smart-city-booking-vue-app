import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  filterOptionLabels,
  openFilterCard,
  pickFilterOption,
  typeSearch,
} from "@tests/unit/support/search";

let readable = [];
let instanceOwner = false;

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenants: vi.fn(),
    getReadiness: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiCatalogService", () => ({
  default: {
    getCatalog: vi.fn(),
    updateCatalog: vi.fn(),
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
    allowCatalogExposure: () => instanceOwner,
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
import ApiCatalogService from "@/services/api/ApiCatalogService";
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import InstanceTenants from "@/views/Management/InstanceTenants.vue";

const TENANTS = [
  {
    id: "t-1",
    name: "Sportverein",
    contactName: "Sabine Sport",
    mail: "sabine@sportverein.example",
    location: "Musterstadt",
    supervisionLevel: "pending",
  },
  // From before the supervision: no stored level.
  { id: "t-2", name: "Makerspace", mail: "hallo@makerspace.example" },
];

const CATALOG = {
  type: "instance",
  name: "Marktplatz",
  excludedTenantIds: ["t-1"],
  heroLayout: { version: 1, blocks: [] },
};

const addToast = vi.fn();
const selectTenant = vi.fn();
const push = vi.fn();

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
      tenants: { namespaced: true, actions: { select: selectTenant } },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(InstanceTenants, {
    store,
    mocks: { $router: { push } },
    stubs: {
      TenantCreate: true,
      DeleteConformationDialog: true,
    },
  });
  await flushPromises();
  return wrapper;
}

const rows = (wrapper) => wrapper.findAll("[data-test='tenant-row']");
const rowTexts = (wrapper) =>
  rows(wrapper).wrappers.map((row) => row.text().replace(/\s+/g, " "));
const panel = (wrapper) => wrapper.find("[data-test='tenant-panel']");
const panelAction = (wrapper, name) =>
  panel(wrapper).find(`[data-test='${name}']`);

/** Selects the row at `index` (the list is sorted by name). */
async function selectRow(wrapper, index) {
  await rows(wrapper).at(index).trigger("click");
  await flushPromises();
}

/** Types into the field of the open dialog that `selector` names. */
async function typeInDialog(selector, text) {
  const field = document.querySelector(`.v-dialog--active ${selector}`);
  field.value = text;
  field.dispatchEvent(new Event("input"));
  await flushPromises();
}

/** The catalog switch of the selected tenant, in the panel. */
const catalogSwitch = (wrapper) =>
  panel(wrapper).find("input[data-test='catalog-switch']");

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
  // A copy per read: a change the page makes to its rows must not leak into
  // what the server answers next.
  ApiTenantService.getTenants.mockImplementation(() =>
    Promise.resolve({ data: JSON.parse(JSON.stringify(TENANTS)) })
  );
  ApiTenantService.getReadiness.mockResolvedValue({
    checkedAt: "2026-09-21T08:30:00.000Z",
    criteria: [
      { key: "offers", state: "missing", hint: "Kein Angebot.", offers: [] },
    ],
  });
  ApiCatalogService.getCatalog.mockResolvedValue({
    data: JSON.parse(JSON.stringify(CATALOG)),
  });
  ApiCatalogService.updateCatalog.mockResolvedValue({ data: {} });
});

describe("InstanceTenants", () => {
  it("lists the tenants by name with their contact facts", async () => {
    const wrapper = await mountView();

    const [makerspace, sportverein] = rowTexts(wrapper);
    expect(makerspace).toContain("Makerspace");
    expect(makerspace).toContain("Keine Kontaktperson");
    expect(sportverein).toContain("Sabine Sport");
    expect(sportverein).toContain("Musterstadt");
    expect(wrapper.find("[data-test='tenant-count']").text()).toBe(
      "2 Mandanten"
    );
  });

  it("narrows the list to what the search matches", async () => {
    const wrapper = await mountView();

    await typeSearch(wrapper.find("input[data-test='tenant-search']"), "sport");
    await flushPromises();

    expect(rowTexts(wrapper)).toHaveLength(1);
    expect(rowTexts(wrapper)[0]).toContain("Sportverein");
  });

  it("shows the selected tenant's facts and actions in the panel", async () => {
    const wrapper = await mountView();
    expect(wrapper.find("[data-test='tenant-panel-none']").exists()).toBe(true);

    await selectRow(wrapper, 1);

    const text = panel(wrapper).text();
    expect(text).toContain("Sportverein");
    expect(text).toContain("sabine@sportverein.example");
    expect(text).toContain("Musterstadt");
    expect(rows(wrapper).at(1).classes()).toContain("tenant-row--selected");
    expect(panelAction(wrapper, "open-edit").exists()).toBe(true);
    expect(panelAction(wrapper, "open-delete").exists()).toBe(true);
  });

  it("opens the tenant page of the selected tenant for editing", async () => {
    const wrapper = await mountView();

    await selectRow(wrapper, 0);
    await panelAction(wrapper, "open-edit").trigger("click");
    await flushPromises();

    expect(selectTenant).toHaveBeenCalledWith(expect.anything(), "t-2");
    expect(push).toHaveBeenCalledWith({ name: "tenant" });
    expect(addToast.mock.calls[0][1].message).toContain("Makerspace");
    expect(panelAction(wrapper, "switch-tenant").exists()).toBe(false);
  });

  it("opens the readiness check of the selected tenant", async () => {
    const wrapper = await mountView();
    expect(ApiTenantService.getReadiness).not.toHaveBeenCalled();

    // Sorted by name: Makerspace (t-2) comes first.
    await selectRow(wrapper, 0);
    await panelAction(wrapper, "open-readiness").trigger("click");
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-2");
    const dialog = document.querySelector("[data-test='readiness-dialog']");
    expect(dialog.textContent).toContain("Makerspace");
    expect(dialog.textContent).toContain("Kein Angebot.");
  });

  it("offers the check only where the user may see it", async () => {
    readable = [];
    const wrapper = await mountView();

    await selectRow(wrapper, 0);

    expect(panelAction(wrapper, "open-readiness").exists()).toBe(false);
  });

  describe("catalog", () => {
    it("badges the tenants the catalog leaves out and switches the selected one", async () => {
      instanceOwner = true;
      const wrapper = await mountView();

      expect(ApiCatalogService.getCatalog).toHaveBeenCalledTimes(1);
      // Makerspace is in the catalog and carries no badge; the Sportverein
      // is excluded.
      const badges = (index) =>
        rows(wrapper).at(index).findAll("[data-test='catalog-badge']");
      expect(badges(0)).toHaveLength(0);
      expect(badges(1)).toHaveLength(1);
      expect(rowTexts(wrapper)[1]).toContain("Nicht im Katalog");

      await selectRow(wrapper, 0);
      expect(catalogSwitch(wrapper).element.checked).toBe(true);
      await selectRow(wrapper, 1);
      expect(catalogSwitch(wrapper).element.checked).toBe(false);
    });

    it("keeps badge and switch from everyone else and reads no catalog", async () => {
      const wrapper = await mountView();

      expect(ApiCatalogService.getCatalog).not.toHaveBeenCalled();
      expect(wrapper.find("[data-test='catalog-badge']").exists()).toBe(false);
      await selectRow(wrapper, 1);
      expect(wrapper.find("[data-test='catalog-switch']").exists()).toBe(false);
    });

    it("takes a tenant out of the catalog without carrying the hero layout", async () => {
      instanceOwner = true;
      const wrapper = await mountView();
      await selectRow(wrapper, 0);

      await catalogSwitch(wrapper).setChecked(false);
      await flushPromises();

      // Read anew right before the write, then written without the layout.
      expect(ApiCatalogService.getCatalog).toHaveBeenCalledTimes(2);
      expect(ApiCatalogService.updateCatalog).toHaveBeenCalledWith({
        type: "instance",
        name: "Marktplatz",
        excludedTenantIds: ["t-1", "t-2"],
      });
      expect(catalogSwitch(wrapper).element.checked).toBe(false);
      expect(
        rows(wrapper).at(0).find("[data-test='catalog-badge']").exists()
      ).toBe(true);
      expect(addToast.mock.calls[0][1].message).toBe(
        "„Makerspace“ erscheint nicht mehr im Katalog."
      );
    });

    it("puts a tenant back into the catalog", async () => {
      instanceOwner = true;
      const wrapper = await mountView();
      await selectRow(wrapper, 1);

      await catalogSwitch(wrapper).setChecked(true);
      await flushPromises();

      expect(ApiCatalogService.updateCatalog).toHaveBeenCalledWith({
        type: "instance",
        name: "Marktplatz",
        excludedTenantIds: [],
      });
      expect(
        rows(wrapper).at(1).find("[data-test='catalog-badge']").exists()
      ).toBe(false);
      expect(addToast.mock.calls[0][1].message).toBe(
        "„Sportverein“ erscheint jetzt im Katalog."
      );
    });

    it("flips the switch back and says so when the save fails", async () => {
      instanceOwner = true;
      ApiCatalogService.updateCatalog.mockRejectedValue(new Error("500"));
      const wrapper = await mountView();
      await selectRow(wrapper, 0);

      await catalogSwitch(wrapper).setChecked(false);
      await flushPromises();

      expect(catalogSwitch(wrapper).element.checked).toBe(true);
      expect(addToast.mock.calls[0][1].type).toBe("error");
      expect(addToast.mock.calls[0][1].message).toContain("Makerspace");
    });

    it("hides the switch and says why when the catalog cannot be read", async () => {
      instanceOwner = true;
      ApiCatalogService.getCatalog.mockRejectedValue(new Error("403"));
      const wrapper = await mountView();

      expect(wrapper.find("[data-test='catalog-unavailable']").exists()).toBe(
        true
      );
      await selectRow(wrapper, 0);
      expect(wrapper.find("[data-test='catalog-switch']").exists()).toBe(false);
    });
  });

  describe("supervision", () => {
    it("badges the instance owner's tenants that are not free, never the free ones", async () => {
      instanceOwner = true;
      const wrapper = await mountView();

      const [makerspace, sportverein] = rowTexts(wrapper);
      expect(makerspace).not.toContain("frei");
      expect(sportverein).toContain("Freigabe ausstehend");
      // The panel names the level of every tenant, the free one included.
      await selectRow(wrapper, 0);
      expect(panel(wrapper).text()).toContain("frei");
    });

    it("badges a pending tenant in warning and a declined one in error", async () => {
      instanceOwner = true;
      ApiTenantService.getTenants.mockResolvedValue({
        data: [
          { id: "t-3", name: "Chor", supervisionLevel: "declined" },
          { id: "t-4", name: "Dojo", supervisionLevel: "pending" },
        ],
      });
      const wrapper = await mountView();

      const [chor, dojo] = rows(wrapper).wrappers.map((row) =>
        row.find("[data-test='supervision-level']")
      );
      expect(chor.text()).toBe("abgewiesen");
      expect(chor.classes()).toContain("error--text");
      expect(dojo.text()).toBe("Freigabe ausstehend");
      expect(dojo.classes()).toContain("warning--text");
    });

    it("shows a level it does not know as stored, in a neutral chip", async () => {
      instanceOwner = true;
      ApiTenantService.getTenants.mockResolvedValue({
        data: [{ id: "t-3", name: "Chor", supervisionLevel: "locked" }],
      });
      const wrapper = await mountView();

      const badge = rows(wrapper).at(0).find("[data-test='supervision-level']");
      expect(badge.text()).toBe("locked");
      expect(badge.classes()).toContain("grey--text");
    });

    it("filters by each of the four levels", async () => {
      instanceOwner = true;
      const wrapper = await mountView();

      await openFilterCard(wrapper);

      expect(filterOptionLabels()).toEqual([
        "frei",
        "beaufsichtigt",
        "Freigabe ausstehend",
        "abgewiesen",
      ]);
    });

    it("keeps level, filter and supervision actions from everyone else", async () => {
      const wrapper = await mountView();

      expect(wrapper.text()).not.toContain("Freigabe ausstehend");
      expect(wrapper.find("[data-test='search-filter']").exists()).toBe(false);
      expect(wrapper.find("[data-test='open-instance-history']").exists()).toBe(
        false
      );

      await selectRow(wrapper, 0);
      expect(panelAction(wrapper, "open-level-change").exists()).toBe(false);
      expect(panelAction(wrapper, "open-decline").exists()).toBe(false);
      expect(panelAction(wrapper, "open-reinstate").exists()).toBe(false);
      expect(panelAction(wrapper, "open-supervision-history").exists()).toBe(
        false
      );
    });

    it("filters the list by level on the server", async () => {
      instanceOwner = true;
      const wrapper = await mountView();
      expect(ApiTenantService.getTenants).toHaveBeenLastCalledWith(false, {
        supervisionLevel: null,
      });

      await openFilterCard(wrapper);
      await pickFilterOption("abgewiesen");
      await flushPromises();

      expect(ApiTenantService.getTenants).toHaveBeenLastCalledWith(false, {
        supervisionLevel: "declined",
      });
    });

    it("changes the level of the selected tenant and shows the effective level", async () => {
      instanceOwner = true;
      ApiSupervisionService.setTenantLevel.mockResolvedValue({
        supervisionLevel: "supervised",
        supervisionChangedAt: "2026-09-21T08:30:00.000Z",
      });
      const wrapper = await mountView();
      // The reload that follows the change has not answered yet.
      ApiTenantService.getTenants.mockClear();
      ApiTenantService.getTenants.mockReturnValue(new Promise(() => {}));

      // Sorted by name: Makerspace (t-2) comes first.
      await selectRow(wrapper, 0);
      await panelAction(wrapper, "open-level-change").trigger("click");
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
      expect(ApiTenantService.getTenants).toHaveBeenCalledTimes(1);
      expect(rowTexts(wrapper)[0]).toContain("beaufsichtigt");
      expect(panel(wrapper).text()).toContain("beaufsichtigt");
      expect(addToast.mock.calls[0][1].message).toBe(
        "„Makerspace“ ist jetzt beaufsichtigt."
      );
    });

    it("names an effective level it does not know as stored in the toast", async () => {
      instanceOwner = true;
      ApiSupervisionService.setTenantLevel.mockResolvedValue({
        supervisionLevel: "locked",
        supervisionChangedAt: "2026-09-21T08:30:00.000Z",
      });
      const wrapper = await mountView();

      await selectRow(wrapper, 0);
      await panelAction(wrapper, "open-level-change").trigger("click");
      await flushPromises();
      document.querySelector("input[data-test='level-option-pending']").click();
      await flushPromises();
      document.querySelector("[data-test='level-submit']").click();
      await flushPromises();

      expect(addToast.mock.calls[0][1].message).toBe(
        "„Makerspace“ ist jetzt locked."
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
      // Someone else set the Makerspace to pending in the meantime.
      ApiTenantService.getTenants.mockResolvedValue({
        data: [TENANTS[0], { ...TENANTS[1], supervisionLevel: "pending" }],
      });

      await selectRow(wrapper, 0);
      await panelAction(wrapper, "open-level-change").trigger("click");
      await flushPromises();
      document.querySelector("input[data-test='level-option-pending']").click();
      await flushPromises();
      document.querySelector("[data-test='level-submit']").click();
      await flushPromises();

      expect(ApiTenantService.getTenants).toHaveBeenCalledTimes(1);
      expect(rowTexts(wrapper)[0]).toContain("Freigabe ausstehend");
      // The dialog follows: the level now effective is no longer on offer.
      expect(
        document.querySelector("input[data-test='level-option-pending']")
      ).toBeNull();
      expect(
        document.querySelector("[data-test='level-submit']").disabled
      ).toBe(true);
    });

    it("declines the selected tenant through its own red action", async () => {
      instanceOwner = true;
      ApiSupervisionService.setTenantLevel.mockResolvedValue({
        supervisionLevel: "declined",
        supervisionChangedAt: "2026-09-24T10:00:00.000Z",
        supervisionReason: "Kein Impressum",
      });
      const wrapper = await mountView();
      // Sorted by name: the Sportverein (t-1, pending) comes second.
      await selectRow(wrapper, 1);
      expect(panelAction(wrapper, "open-reinstate").exists()).toBe(false);
      const decline = panelAction(wrapper, "open-decline");
      expect(decline.text()).toBe("Mandanten abweisen");
      expect(decline.find(".error--text").exists()).toBe(true);
      ApiTenantService.getTenants.mockClear();
      ApiTenantService.getTenants.mockResolvedValue({
        data: [
          {
            ...TENANTS[0],
            supervisionLevel: "declined",
            supervisionChangedAt: "2026-09-24T10:00:00.000Z",
            supervisionReason: "Kein Impressum",
          },
          TENANTS[1],
        ],
      });

      await decline.trigger("click");
      await flushPromises();
      await typeInDialog("textarea", "Kein Impressum");
      document.querySelector("[data-test='decline-submit']").click();
      await flushPromises();

      expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-1", {
        level: "declined",
        reason: "Kein Impressum",
      });
      expect(document.querySelector(".v-dialog--active")).toBeNull();
      // Panel and list are read again.
      expect(ApiTenantService.getTenants).toHaveBeenCalledTimes(1);
      expect(rowTexts(wrapper)[1]).toContain("abgewiesen");
      expect(addToast.mock.calls[0][1].message).toBe(
        "„Sportverein“ ist jetzt abgewiesen."
      );
    });

    it("reloads the list when the level moved underneath the decline", async () => {
      instanceOwner = true;
      ApiSupervisionService.setTenantLevel.mockRejectedValue({
        response: {
          status: 409,
          data: { code: "supervision_level_changed", statusCode: 409 },
        },
      });
      const wrapper = await mountView();
      ApiTenantService.getTenants.mockClear();
      // Someone else declined the Sportverein in the meantime.
      ApiTenantService.getTenants.mockResolvedValue({
        data: [{ ...TENANTS[0], supervisionLevel: "declined" }, TENANTS[1]],
      });

      await selectRow(wrapper, 1);
      await panelAction(wrapper, "open-decline").trigger("click");
      await flushPromises();
      document.querySelector("[data-test='decline-submit']").click();
      await flushPromises();

      expect(ApiTenantService.getTenants).toHaveBeenCalledTimes(1);
      expect(
        document.querySelector("[data-test='decline-dialog']").textContent
      ).toContain("Die Aufsichtsstufe wurde inzwischen geändert.");
      expect(rowTexts(wrapper)[1]).toContain("abgewiesen");
      expect(panelAction(wrapper, "open-reinstate").exists()).toBe(true);
    });

    it("shows a declined tenant's level, time and reason in the panel", async () => {
      instanceOwner = true;
      ApiTenantService.getTenants.mockResolvedValue({
        data: [
          {
            id: "t-3",
            name: "Chor",
            supervisionLevel: "declined",
            supervisionChangedAt: "2026-09-24T10:00:00.000Z",
            supervisionReason: "Kein Impressum",
          },
          {
            id: "t-4",
            name: "Dojo",
            supervisionLevel: "declined",
            supervisionChangedAt: "2026-09-24T10:00:00.000Z",
            supervisionReason: null,
          },
        ],
      });
      const wrapper = await mountView();

      await selectRow(wrapper, 0);
      const reason = () => panel(wrapper).find("[data-test='level-reason']");
      expect(panel(wrapper).text()).toContain("abgewiesen");
      expect(panel(wrapper).text()).toContain("Geändert am");
      expect(reason().text().replace(/\s+/g, " ")).toBe(
        "Begründung Kein Impressum"
      );

      await selectRow(wrapper, 1);
      expect(reason().text().replace(/\s+/g, " ")).toBe(
        "Begründung keine Begründung"
      );
    });

    it("names no reason in the panel of a tenant that is not declined", async () => {
      instanceOwner = true;
      ApiTenantService.getTenants.mockResolvedValue({
        data: [{ ...TENANTS[0], supervisionReason: "Neu angelegt" }],
      });
      const wrapper = await mountView();

      await selectRow(wrapper, 0);

      expect(panel(wrapper).find("[data-test='level-reason']").exists()).toBe(
        false
      );
    });

    it("takes a decline back instead of offering it again", async () => {
      instanceOwner = true;
      ApiTenantService.getTenants.mockResolvedValue({
        data: [{ id: "t-3", name: "Chor", supervisionLevel: "declined" }],
      });
      ApiSupervisionService.setTenantLevel.mockResolvedValue({
        supervisionLevel: "supervised",
        supervisionChangedAt: "2026-09-24T11:00:00.000Z",
        supervisionReason: null,
      });
      const wrapper = await mountView();
      await selectRow(wrapper, 0);

      expect(panelAction(wrapper, "open-decline").exists()).toBe(false);
      expect(panelAction(wrapper, "open-level-change").classes()).toContain(
        "v-list-item--disabled"
      );
      const reinstate = panelAction(wrapper, "open-reinstate");
      expect(reinstate.text()).toBe("Abweisung zurücknehmen");

      await reinstate.trigger("click");
      await flushPromises();
      expect(
        document.querySelector("[data-test='level-dialog']").textContent
      ).toContain("Der Mandant erhält die Stufe");
      document
        .querySelector("input[data-test='level-option-supervised']")
        .click();
      await flushPromises();
      document.querySelector("[data-test='level-submit']").click();
      await flushPromises();

      expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-3", {
        level: "supervised",
        reason: null,
      });
    });

    it("opens the supervision history of the selected tenant", async () => {
      instanceOwner = true;
      const wrapper = await mountView();

      await selectRow(wrapper, 0);
      await panelAction(wrapper, "open-supervision-history").trigger("click");
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

    it("names every tenant in the instance-wide history while the list is filtered", async () => {
      instanceOwner = true;
      ApiTenantService.getTenants.mockImplementation((_public, filter) =>
        Promise.resolve({
          data: filter?.supervisionLevel ? [TENANTS[0]] : TENANTS,
        })
      );
      ApiSupervisionService.getInstanceHistory.mockResolvedValue({
        items: [
          {
            id: "h-1",
            tenantId: "t-2",
            eventType: "level_changed",
            occurredAt: "2026-09-21T08:30:00.000Z",
            actor: { type: "system" },
            from: "free",
            to: "supervised",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      });
      const wrapper = await mountView();
      await openFilterCard(wrapper);
      await pickFilterOption("Freigabe ausstehend");
      await flushPromises();
      expect(rowTexts(wrapper)).toHaveLength(1);

      await wrapper
        .find("[data-test='open-instance-history']")
        .trigger("click");
      await flushPromises();

      expect(
        document.querySelector("[data-test='list-row']").textContent
      ).toContain("Makerspace");
      // The list stays filtered.
      expect(rowTexts(wrapper).join(" ")).not.toContain("Makerspace");
    });
  });
});
