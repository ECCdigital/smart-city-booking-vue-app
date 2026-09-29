import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import { activeDialog, dialogButton } from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiTenantApprovalQueueService", () => ({
  default: { getTenantApprovalQueue: vi.fn() },
}));
vi.mock("@/services/api/ApiSupervisionService", () => ({
  default: { setTenantLevel: vi.fn(), getTenantHistory: vi.fn() },
}));
// The decline dialog is ticket 03's: the register is tested against its
// interface only (`open`, `tenant`, `declined`, `stale`, `close`).
vi.mock("@/components/Supervision/TenantDeclineDialog.vue", () => ({
  default: {
    name: "TenantDeclineDialog",
    props: { open: Boolean, tenant: Object },
    render(h) {
      return h("div");
    },
  },
}));

import ApiTenantApprovalQueueService from "@/services/api/ApiTenantApprovalQueueService";
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import TenantApprovalQueue from "@/components/Supervision/TenantApprovalQueue.vue";

const NEW_TENANT = {
  tenantId: "t-3",
  tenantName: "SV Blau-Weiß",
  waitingSince: "2026-09-16T09:00:00.000Z",
  contact: {
    contactName: "Petra Lehmann",
    mail: "vorstand@sv-blau-weiss.de",
    phone: "0176 1234567",
    website: null,
    location: "Musterstadt",
  },
  owners: [
    {
      userId: "petra@sv-blau-weiss.de",
      displayName: "Petra Lehmann",
      mail: "petra@sv-blau-weiss.de",
    },
  ],
  offerCount: 4,
  lastChange: {
    eventType: "tenant.created",
    occurredAt: "2026-09-16T09:00:00.000Z",
    actor: { type: "user", userId: "petra@sv-blau-weiss.de" },
    from: null,
    to: "pending",
    reason: null,
  },
};
const RESET_TENANT = {
  tenantId: "t-4",
  tenantName: "Makerspace Nord",
  waitingSince: "2026-09-21T09:15:00.000Z",
  contact: {
    contactName: null,
    mail: "hallo@makerspace-nord.de",
    phone: null,
    website: null,
    location: null,
  },
  owners: [
    {
      userId: "jonas@makerspace-nord.de",
      displayName: "Jonas Weber",
      mail: "jonas@makerspace-nord.de",
    },
    {
      userId: "aylin@makerspace-nord.de",
      displayName: null,
      mail: "aylin@makerspace-nord.de",
    },
  ],
  offerCount: 1,
  lastChange: {
    eventType: "tenant.levelChanged",
    occurredAt: "2026-09-21T09:15:00.000Z",
    actor: { type: "user", userId: "owner@stadt.de" },
    from: "supervised",
    to: "pending",
    reason: "Impressum fehlt",
  },
};

const pageOf = (items, total = items.length) => ({
  items,
  total,
  page: 1,
  pageSize: 25,
});

function deferred() {
  let resolve;
  const promise = new Promise((res) => (resolve = res));
  return { promise, resolve };
}

let selectTenant;
let addToast;
let push;

async function mountQueue() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t-9" },
        actions: { select: selectTenant },
      },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(TenantApprovalQueue, {
    store,
    mocks: { $router: { push } },
  });
  await flushPromises();
  return wrapper;
}

const load = ApiTenantApprovalQueueService.getTenantApprovalQueue;
const rows = (wrapper) => wrapper.findAll("[data-test='tenant-queue-row']");
const facts = (row) => row.find("[data-test='tenant-queue-facts']").text();
const origin = (row) => row.find("[data-test='tenant-queue-origin']").text();
const lastCount = (wrapper) => wrapper.emitted("count").at(-1)[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-21T10:00:00.000Z"));
  selectTenant = vi.fn();
  addToast = vi.fn();
  push = vi.fn();
  load.mockResolvedValue(pageOf([NEW_TENANT, RESET_TENANT], 3));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TenantApprovalQueue", () => {
  describe("the rows", () => {
    it("draws a new tenant with contact, owners, offers and its wait", async () => {
      const wrapper = await mountQueue();

      expect(load).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
      const row = rows(wrapper).at(0);
      expect(row.find(".booking-row__title").text()).toBe("SV Blau-Weiß");
      expect(facts(row)).toBe(
        "Petra Lehmann · vorstand@sv-blau-weiss.de · Musterstadt · Petra Lehmann · 4 Angebote"
      );
      expect(origin(row)).toBe("neu angelegt");
      expect(row.text()).toContain("wartet seit 5 Tagen");
      expect(row.text()).toContain("16.09.26");
    });

    it("names a reset with the level it came from and its reason", async () => {
      const wrapper = await mountQueue();

      const row = rows(wrapper).at(1);
      expect(facts(row)).toBe(
        "hallo@makerspace-nord.de · Jonas Weber, aylin@makerspace-nord.de · ein Angebot"
      );
      expect(origin(row)).toBe(
        "zurückgesetzt aus ‚beaufsichtigt‘ – ‚Impressum fehlt‘"
      );
      expect(row.text()).toContain("wartet seit 45 Minuten");
    });

    it("names a reset without a reason by its level alone", async () => {
      load.mockResolvedValue(
        pageOf([
          {
            ...RESET_TENANT,
            lastChange: { ...RESET_TENANT.lastChange, reason: null },
          },
        ])
      );
      const wrapper = await mountQueue();

      expect(origin(rows(wrapper).at(0))).toBe(
        "zurückgesetzt aus ‚beaufsichtigt‘"
      );
    });

    it("reads an adopted start level as new", async () => {
      load.mockResolvedValue(
        pageOf([
          {
            ...NEW_TENANT,
            lastChange: {
              ...NEW_TENANT.lastChange,
              eventType: "tenant.levelInitialized",
            },
          },
        ])
      );
      const wrapper = await mountQueue();

      expect(origin(rows(wrapper).at(0))).toBe("neu angelegt");
    });

    it("says so when a tenant has no owner and no offers", async () => {
      load.mockResolvedValue(
        pageOf([{ ...NEW_TENANT, owners: [], offerCount: 0, lastChange: null }])
      );
      const wrapper = await mountQueue();

      const row = rows(wrapper).at(0);
      expect(facts(row)).toBe(
        "Petra Lehmann · vorstand@sv-blau-weiss.de · Musterstadt · kein Owner · keine Angebote"
      );
      expect(row.find("[data-test='tenant-queue-origin']").exists()).toBe(
        false
      );
    });
  });

  describe("the list", () => {
    it("tells the page its counter", async () => {
      const wrapper = await mountQueue();

      expect(lastCount(wrapper)).toBe(3);
    });

    it("says so when no tenant waits", async () => {
      load.mockResolvedValue(pageOf([]));
      const wrapper = await mountQueue();

      expect(wrapper.text()).toContain("Keine Mandanten warten auf Freigabe");
      expect(lastCount(wrapper)).toBe(0);
    });

    it("names a failed load and counts nothing", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      load.mockRejectedValue(serverError());
      const wrapper = await mountQueue();

      expect(wrapper.find("[data-test='tenant-queue-error']").text()).toBe(
        "Die wartenden Mandanten konnten nicht geladen werden."
      );
      expect(wrapper.text()).not.toContain(
        "Keine Mandanten warten auf Freigabe"
      );
      expect(lastCount(wrapper)).toBeNull();
    });

    it("counts nothing until the load asked for last has answered", async () => {
      const first = deferred();
      const second = deferred();
      load
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const wrapper = await mountQueue();
      expect(lastCount(wrapper)).toBeNull();

      wrapper.vm.load();
      first.resolve(pageOf([NEW_TENANT], 7));
      await flushPromises();
      expect(lastCount(wrapper)).toBeNull();

      second.resolve(pageOf([RESET_TENANT], 2));
      await flushPromises();
      expect(lastCount(wrapper)).toBe(2);
      expect(rows(wrapper)).toHaveLength(1);
    });

    it("asks the backend for the page the footer turns to", async () => {
      load.mockResolvedValue(pageOf([NEW_TENANT, RESET_TENANT], 60));
      const wrapper = await mountQueue();

      await wrapper.find(".v-data-footer__icons-after button").trigger("click");
      await flushPromises();

      expect(load).toHaveBeenLastCalledWith({ page: 2, pageSize: 25 });
    });
  });

  describe("the links", () => {
    it("opens the tenant's bookings in the tenant of the row", async () => {
      const wrapper = await mountQueue();

      const link = rows(wrapper)
        .at(0)
        .find("[data-test='tenant-bookings-link']");
      expect(link.text()).toBe("Buchungen des Mandanten");
      await link.trigger("click");
      await flushPromises();

      expect(selectTenant).toHaveBeenCalledWith(expect.anything(), "t-3");
      expect(push).toHaveBeenCalledWith({ name: "bookings" });
      expect(addToast.mock.calls.at(-1)[1].message).toBe(
        "Mandant zu „SV Blau-Weiß“ gewechselt."
      );
    });

    it("opens the tenant's supervision history", async () => {
      ApiSupervisionService.getTenantHistory.mockResolvedValue(pageOf([]));
      const wrapper = await mountQueue();

      await rows(wrapper)
        .at(1)
        .find("[data-test='tenant-queue-history']")
        .trigger("click");
      await flushPromises();

      expect(ApiSupervisionService.getTenantHistory).toHaveBeenCalledWith(
        "t-4",
        expect.objectContaining({ page: 1 })
      );
      expect(activeDialog().textContent).toContain("Makerspace Nord");

      dialogButton("Schließen").click();
      await flushPromises();
      expect(activeDialog()).toBeNull();
    });
  });

  describe("the decision", () => {
    const approve = async (wrapper, index) => {
      await rows(wrapper)
        .at(index)
        .find("[data-test='tenant-queue-approve']")
        .trigger("click");
      await flushPromises();
    };

    beforeEach(() => {
      ApiSupervisionService.setTenantLevel.mockResolvedValue({
        supervisionLevel: "supervised",
        supervisionChangedAt: "2026-09-21T10:00:00.000Z",
        supervisionReason: null,
      });
    });

    it("approves a tenant as supervised and reads the list anew", async () => {
      const wrapper = await mountQueue();
      load.mockResolvedValue(pageOf([RESET_TENANT]));

      await approve(wrapper, 0);

      expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-3", {
        level: "supervised",
      });
      expect(rows(wrapper)).toHaveLength(1);
      expect(lastCount(wrapper)).toBe(1);
      expect(wrapper.emitted("changed")).toHaveLength(1);
      expect(addToast.mock.calls.at(-1)[1]).toMatchObject({
        message: "„SV Blau-Weiß“ ist jetzt beaufsichtigt.",
        type: "success",
      });
    });

    it("approves a tenant as free from the split button's menu", async () => {
      ApiSupervisionService.setTenantLevel.mockResolvedValue({
        supervisionLevel: "free",
        supervisionChangedAt: "2026-09-21T10:00:00.000Z",
        supervisionReason: null,
      });
      const wrapper = await mountQueue();

      await rows(wrapper)
        .at(1)
        .find("[data-test='tenant-queue-approve-more']")
        .trigger("click");
      await flushPromises();
      const entry = document.querySelector(
        ".menuable__content__active [data-test='tenant-queue-approve-free']"
      );
      expect(entry.textContent.trim()).toBe("als frei freigeben");
      entry.click();
      await flushPromises();

      expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-4", {
        level: "free",
      });
      expect(addToast.mock.calls.at(-1)[1].message).toBe(
        "„Makerspace Nord“ ist jetzt frei."
      );
      expect(load).toHaveBeenCalledTimes(2);
    });

    it("names a level someone else changed meanwhile and reloads", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      ApiSupervisionService.setTenantLevel.mockRejectedValue(
        lifecycleError(409, "supervision_level_changed", {
          tenantId: "t-3",
          expected: "pending",
        })
      );
      const wrapper = await mountQueue();

      await approve(wrapper, 0);

      expect(
        wrapper.find("[data-test='tenant-queue-decision-error']").text()
      ).toContain("Die Aufsichtsstufe wurde inzwischen geändert.");
      expect(load).toHaveBeenCalledTimes(2);
      expect(wrapper.emitted("changed")).toHaveLength(1);
      expect(addToast).not.toHaveBeenCalled();
    });

    it("names a tenant that is gone and reloads", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      ApiSupervisionService.setTenantLevel.mockRejectedValue(
        lifecycleError(404, "tenant_not_found", { id: "t-3" })
      );
      const wrapper = await mountQueue();

      await approve(wrapper, 0);

      expect(
        wrapper.find("[data-test='tenant-queue-decision-error']").text()
      ).toBe("Der Mandant existiert nicht mehr.");
      expect(load).toHaveBeenCalledTimes(2);
    });

    it("names a failed decision and leaves the list as it is", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      ApiSupervisionService.setTenantLevel.mockRejectedValue(serverError());
      const wrapper = await mountQueue();

      await approve(wrapper, 0);

      expect(
        wrapper.find("[data-test='tenant-queue-decision-error']").text()
      ).toBe("Die Aufsichtsstufe konnte nicht geändert werden.");
      expect(load).toHaveBeenCalledTimes(1);
      expect(wrapper.emitted("changed")).toBeUndefined();
      expect(rows(wrapper)).toHaveLength(2);
    });
  });

  describe("the decline", () => {
    const declineDialog = (wrapper) =>
      wrapper.findComponent({ name: "TenantDeclineDialog" });
    const startDecline = async (wrapper, index) => {
      await rows(wrapper)
        .at(index)
        .find("[data-test='tenant-queue-decline']")
        .trigger("click");
      await flushPromises();
    };

    it("opens the decline dialog with the row's tenant", async () => {
      const wrapper = await mountQueue();

      expect(declineDialog(wrapper).props("open")).toBe(false);
      await startDecline(wrapper, 1);

      expect(declineDialog(wrapper).props()).toEqual({
        open: true,
        tenant: {
          id: "t-4",
          name: "Makerspace Nord",
          supervisionLevel: "pending",
        },
      });
      expect(ApiSupervisionService.setTenantLevel).not.toHaveBeenCalled();

      declineDialog(wrapper).vm.$emit("close");
      await flushPromises();
      expect(declineDialog(wrapper).props("open")).toBe(false);
    });

    it("reads the list anew once the tenant is declined", async () => {
      const wrapper = await mountQueue();
      await startDecline(wrapper, 1);

      declineDialog(wrapper).vm.$emit("declined", {
        tenantId: "t-4",
        supervisionLevel: "declined",
        supervisionChangedAt: "2026-09-21T10:00:00.000Z",
        supervisionReason: "Kein Impressum",
      });
      await flushPromises();

      expect(declineDialog(wrapper).props("open")).toBe(false);
      expect(load).toHaveBeenCalledTimes(2);
      expect(wrapper.emitted("changed")).toHaveLength(1);
      expect(addToast.mock.calls.at(-1)[1].message).toBe(
        "„Makerspace Nord“ ist jetzt abgewiesen."
      );
    });

    it("reads the list anew when the dialog finds the tenant changed", async () => {
      const wrapper = await mountQueue();
      await startDecline(wrapper, 0);

      declineDialog(wrapper).vm.$emit("stale");
      await flushPromises();

      expect(load).toHaveBeenCalledTimes(2);
      expect(wrapper.emitted("changed")).toHaveLength(1);
      // The dialog says what happened; it stays open until closed.
      expect(declineDialog(wrapper).props("open")).toBe(true);
    });
  });
});
