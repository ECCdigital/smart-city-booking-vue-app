import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import { activeDialog, dialogButton } from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiReviewQueueService", () => ({
  default: { getReviewQueue: vi.fn() },
}));
vi.mock("@/services/api/ApiReviewService", () => ({
  default: { decide: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn() },
}));
vi.mock("@/services/api/ApiSupervisionNotificationService", () => ({
  default: { getNotifications: vi.fn(), retry: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantApprovalQueueService", () => ({
  default: { getTenantApprovalQueue: vi.fn() },
}));
vi.mock("@/services/api/ApiSupervisionService", () => ({
  default: { setTenantLevel: vi.fn(), getTenantHistory: vi.fn() },
}));
// The decline dialog is ticket 03's: the queue is tested against its
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
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

import ApiReviewQueueService from "@/services/api/ApiReviewQueueService";
import ApiReviewService from "@/services/api/ApiReviewService";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiSupervisionNotificationService from "@/services/api/ApiSupervisionNotificationService";
import ApiTenantApprovalQueueService from "@/services/api/ApiTenantApprovalQueueService";
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import InstanceReviewQueue from "@/views/Management/InstanceReviewQueue.vue";

const ROOM = {
  tenantId: "t-1",
  tenantName: "Sportverein",
  offerType: "bookable",
  offerId: "b-1",
  title: "Turnhalle",
  submittedAt: "2026-09-18T08:30:00.000Z",
  isPublic: true,
  adminPath: "/rooms/edit?id=b-1",
};
const EVENT = {
  tenantId: "t-2",
  tenantName: "Makerspace",
  offerType: "event",
  offerId: "e-1",
  title: null,
  submittedAt: "2026-09-21T09:00:00.000Z",
  isPublic: false,
  adminPath: "/events/edit?id=e-1",
};

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

const FAILED_NOTICE = {
  id: "n-1",
  type: "review.queueEntered",
  tenantId: "t-1",
  payload: { tenantName: "Sportverein", offers: [] },
  status: "failed",
  attempts: 2,
  lastError: "mail_disabled",
  createdAt: "2026-09-21T08:30:00.000Z",
  deliveries: [],
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
let replace;
let query;
let currentTenantId;

async function mountView() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => currentTenantId },
        actions: { select: selectTenant },
      },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(InstanceReviewQueue, {
    store,
    mocks: { $router: { push, replace }, $route: { query } },
  });
  await flushPromises();
  return wrapper;
}

const lastParams = () =>
  ApiReviewQueueService.getReviewQueue.mock.calls.at(-1)[0];
const rows = (wrapper) => wrapper.findAll("[data-test='review-queue-row']");
const notices = ApiSupervisionNotificationService;
const setFilter = async (wrapper, name, value) => {
  wrapper.findComponent({ ref: name }).vm.$emit("input", value);
  await flushPromises();
};
const register = (wrapper, key) =>
  wrapper.find(`[data-test='review-queue-register-${key}']`);
const counter = (wrapper, key) =>
  wrapper.find(`[data-test='review-queue-count-${key}']`);
const openRegister = async (wrapper, key) => {
  await register(wrapper, key).trigger("click");
  await flushPromises();
};
const tenantRows = (wrapper) =>
  wrapper.findAll("[data-test='tenant-queue-row']");
/** The kind filter is a pair of buttons: a click picks one. */
const pickType = async (wrapper, value) => {
  await wrapper
    .find(`[data-test='review-queue-type-${value}']`)
    .trigger("click");
  await flushPromises();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-21T10:00:00.000Z"));
  selectTenant = vi.fn();
  addToast = vi.fn();
  push = vi.fn();
  replace = vi.fn();
  query = {};
  currentTenantId = "t-9";
  ApiTenantService.getTenants.mockResolvedValue({
    data: [
      { id: "t-1", name: "Sportverein" },
      { id: "t-2", name: "Makerspace" },
    ],
  });
  ApiReviewQueueService.getReviewQueue.mockResolvedValue(pageOf([ROOM, EVENT]));
  ApiReviewService.decide.mockResolvedValue({ status: "approved" });
  notices.getNotifications.mockResolvedValue(pageOf([]));
  ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
    pageOf([NEW_TENANT, RESET_TENANT], 3)
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("InstanceReviewQueue", () => {
  it("lists the waiting offers in the order the backend sends", async () => {
    const wrapper = await mountView();

    expect(lastParams()).toEqual({
      page: 1,
      pageSize: 25,
      tenantId: null,
      offerType: null,
    });
    expect(rows(wrapper)).toHaveLength(2);
    const room = rows(wrapper).at(0).text();
    expect(room).toContain("Sportverein");
    expect(room).toContain("Buchungsobjekt");
    expect(room).toContain("Turnhalle");
    expect(room).toContain("18.09.26");
    expect(room).toContain("wartet seit 3 Tagen");
    expect(room).toContain("Veröffentlichung gewünscht");
    expect(counter(wrapper, "offers").text()).toBe("2");
  });

  it("names an offer without a title by its id", async () => {
    const wrapper = await mountView();

    const event = rows(wrapper).at(1).text();
    expect(event).toContain("Veranstaltung");
    expect(event).toContain("e-1");
    expect(event).toContain("wartet seit einer Stunde");
    expect(event).toContain("Kein Veröffentlichungswunsch");
  });

  it("asks the backend for the page the footer turns to", async () => {
    ApiReviewQueueService.getReviewQueue.mockResolvedValue(
      pageOf([ROOM, EVENT], 60)
    );
    const wrapper = await mountView();

    await wrapper.find(".v-data-footer__icons-after button").trigger("click");
    await flushPromises();

    expect(lastParams()).toMatchObject({ page: 2, pageSize: 25 });
  });

  it("starts at the first page again when a filter changes", async () => {
    ApiReviewQueueService.getReviewQueue.mockResolvedValue(
      pageOf([ROOM, EVENT], 60)
    );
    const wrapper = await mountView();
    await wrapper.find(".v-data-footer__icons-after button").trigger("click");
    await flushPromises();

    await setFilter(wrapper, "tenantFilter", "t-2");
    expect(lastParams()).toEqual({
      page: 1,
      pageSize: 25,
      tenantId: "t-2",
      offerType: null,
    });

    await pickType(wrapper, "event");
    expect(lastParams()).toEqual({
      page: 1,
      pageSize: 25,
      tenantId: "t-2",
      offerType: "event",
    });
  });

  it("offers the supervised tenants of the instance as a filter", async () => {
    const wrapper = await mountView();

    // Only a supervised tenant's offers wait for a review.
    expect(ApiTenantService.getTenants).toHaveBeenCalledWith(true, {
      supervisionLevel: "supervised",
    });
    expect(
      wrapper
        .findComponent({ ref: "tenantFilter" })
        .props("items")
        .map((tenant) => tenant.id)
    ).toEqual(["t-1", "t-2"]);
  });

  it("keeps the answer asked for last when loads overlap", async () => {
    const wrapper = await mountView();
    const first = deferred();
    const second = deferred();
    ApiReviewQueueService.getReviewQueue
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await pickType(wrapper, "bookable");
    await pickType(wrapper, "event");
    second.resolve(pageOf([EVENT]));
    await flushPromises();
    first.resolve(pageOf([ROOM]));
    await flushPromises();

    expect(rows(wrapper)).toHaveLength(1);
    expect(rows(wrapper).at(0).text()).toContain("Makerspace");
  });

  it("reloads on demand", async () => {
    const wrapper = await mountView();
    ApiReviewQueueService.getReviewQueue.mockResolvedValue(pageOf([EVENT]));

    await wrapper.find("[data-test='review-queue-reload']").trigger("click");
    await flushPromises();

    expect(ApiReviewQueueService.getReviewQueue).toHaveBeenCalledTimes(2);
    expect(rows(wrapper)).toHaveLength(1);
    // Both counters sit in the header: both registers are read anew.
    expect(
      ApiTenantApprovalQueueService.getTenantApprovalQueue
    ).toHaveBeenCalledTimes(2);
  });

  it("says so when nothing waits", async () => {
    ApiReviewQueueService.getReviewQueue.mockResolvedValue(pageOf([]));
    const wrapper = await mountView();

    expect(wrapper.text()).toContain("Keine Angebote warten auf Prüfung");
  });

  it("tells a refusal apart from an empty queue", async () => {
    ApiReviewQueueService.getReviewQueue.mockRejectedValue({
      response: { status: 403, data: { code: "forbidden", statusCode: 403 } },
    });
    const wrapper = await mountView();

    const notice = wrapper.find("[data-test='review-queue-error']");
    expect(notice.text()).toContain(
      "Sie haben keine Berechtigung für diese Aktion."
    );
    expect(wrapper.text()).not.toContain("Keine Angebote warten auf Prüfung");
  });

  it("names a failed load", async () => {
    ApiReviewQueueService.getReviewQueue.mockRejectedValue({
      response: { status: 404, data: {} },
    });
    const wrapper = await mountView();

    expect(wrapper.find("[data-test='review-queue-error']").text()).toContain(
      "Die Prüfliste konnte nicht geladen werden."
    );
  });

  it("opens the offer's editor in the tenant of the row", async () => {
    const wrapper = await mountView();

    await rows(wrapper)
      .at(0)
      .find("[data-test='review-queue-open']")
      .trigger("click");
    await flushPromises();

    expect(selectTenant).toHaveBeenCalledWith(expect.anything(), "t-1");
    expect(push).toHaveBeenCalledWith({
      path: "/rooms/edit",
      query: { id: "b-1" },
    });
    expect(selectTenant.mock.invocationCallOrder[0]).toBeLessThan(
      push.mock.invocationCallOrder[0]
    );
    expect(addToast).toHaveBeenCalledTimes(1);
  });

  it("stays silent about the tenant when it is the current one already", async () => {
    currentTenantId = "t-2";
    const wrapper = await mountView();

    await rows(wrapper)
      .at(1)
      .find("[data-test='review-queue-open']")
      .trigger("click");
    await flushPromises();

    expect(push).toHaveBeenCalledWith({
      path: "/events/edit",
      query: { id: "e-1" },
    });
    expect(addToast).not.toHaveBeenCalled();
  });

  it("offers no link for an offer without an editor", async () => {
    ApiReviewQueueService.getReviewQueue.mockResolvedValue(
      pageOf([{ ...ROOM, adminPath: null }])
    );
    const wrapper = await mountView();

    expect(
      rows(wrapper).at(0).find("[data-test='review-queue-open']").exists()
    ).toBe(false);
  });

  it("approves a row in place and reads the queue anew", async () => {
    const wrapper = await mountView();
    ApiReviewQueueService.getReviewQueue.mockResolvedValue(pageOf([EVENT]));

    await rows(wrapper)
      .at(0)
      .find("[data-test='review-queue-approve']")
      .trigger("click");
    await flushPromises();

    expect(ApiReviewService.decide).toHaveBeenCalledWith(
      "t-1",
      "bookable",
      "b-1",
      { action: "approve", reason: undefined }
    );
    expect(rows(wrapper)).toHaveLength(1);
    expect(rows(wrapper).at(0).text()).toContain("Makerspace");
  });

  it("asks for a reason before it rejects", async () => {
    const wrapper = await mountView();

    await rows(wrapper)
      .at(1)
      .find("[data-test='review-queue-reject']")
      .trigger("click");
    expect(ApiReviewService.decide).not.toHaveBeenCalled();

    const reason = activeDialog().querySelector("textarea");
    reason.value = "Bilder fehlen";
    reason.dispatchEvent(new Event("input"));
    await wrapper.vm.$nextTick();
    dialogButton("Ablehnen").click();
    await flushPromises();

    expect(ApiReviewService.decide).toHaveBeenCalledWith(
      "t-2",
      "event",
      "e-1",
      {
        action: "reject",
        reason: "Bilder fehlen",
      }
    );
    expect(ApiReviewQueueService.getReviewQueue).toHaveBeenCalledTimes(2);
  });

  it("names a decision someone else took meanwhile and reloads", async () => {
    ApiReviewService.decide.mockRejectedValue({ response: { status: 409 } });
    const wrapper = await mountView();

    await rows(wrapper)
      .at(0)
      .find("[data-test='review-queue-approve']")
      .trigger("click");
    await flushPromises();

    expect(
      wrapper.find("[data-test='review-queue-decision-error']").text()
    ).toContain("inzwischen geändert");
    expect(ApiReviewQueueService.getReviewQueue).toHaveBeenCalledTimes(2);
  });

  it("names a failed decision", async () => {
    ApiReviewService.decide.mockRejectedValue(new Error("offline"));
    const wrapper = await mountView();

    await rows(wrapper)
      .at(0)
      .find("[data-test='review-queue-approve']")
      .trigger("click");
    await flushPromises();

    expect(
      wrapper.find("[data-test='review-queue-decision-error']").text()
    ).toContain("konnte nicht ausgeführt werden");
  });
  describe("the registers", () => {
    it("opens at the offers and counts both registers", async () => {
      const wrapper = await mountView();

      expect(register(wrapper, "offers").classes()).toContain("v-btn--active");
      expect(counter(wrapper, "offers").text()).toBe("2");
      expect(counter(wrapper, "tenants").text()).toBe("3");
      expect(
        ApiTenantApprovalQueueService.getTenantApprovalQueue
      ).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
      expect(rows(wrapper).at(0).isVisible()).toBe(true);
      expect(tenantRows(wrapper).at(0).isVisible()).toBe(false);
    });

    it("keeps the register it switches to in ?tab=", async () => {
      query = { page: "x" };
      const wrapper = await mountView();

      await openRegister(wrapper, "tenants");

      expect(replace).toHaveBeenCalledWith({
        query: { page: "x", tab: "tenants" },
      });
      expect(tenantRows(wrapper).at(0).isVisible()).toBe(true);
      expect(rows(wrapper).at(0).isVisible()).toBe(false);
    });

    it("opens the register ?tab= names", async () => {
      query = { tab: "tenants" };
      const wrapper = await mountView();

      expect(register(wrapper, "tenants").classes()).toContain("v-btn--active");
      expect(tenantRows(wrapper).at(0).isVisible()).toBe(true);
      expect(replace).not.toHaveBeenCalled();
    });

    it("opens at the offers for a register it does not know", async () => {
      query = { tab: "unknown" };
      const wrapper = await mountView();

      expect(register(wrapper, "offers").classes()).toContain("v-btn--active");
    });
  });

  describe("the tenants register", () => {
    const facts = (row) => row.find("[data-test='tenant-queue-facts']").text();
    const origin = (row) =>
      row.find("[data-test='tenant-queue-origin']").text();

    beforeEach(() => {
      query = { tab: "tenants" };
    });

    it("draws a new tenant with contact, owners, offers and its wait", async () => {
      const wrapper = await mountView();

      const row = tenantRows(wrapper).at(0);
      expect(row.find(".booking-row__title").text()).toBe("SV Blau-Weiß");
      expect(facts(row)).toBe(
        "Petra Lehmann · vorstand@sv-blau-weiss.de · Musterstadt · Petra Lehmann · 4 Angebote"
      );
      expect(origin(row)).toBe("neu angelegt");
      expect(row.text()).toContain("wartet seit 5 Tagen");
      expect(row.text()).toContain("16.09.26");
    });

    it("names a reset with the level it came from and its reason", async () => {
      const wrapper = await mountView();

      const row = tenantRows(wrapper).at(1);
      expect(facts(row)).toBe(
        "hallo@makerspace-nord.de · Jonas Weber, aylin@makerspace-nord.de · ein Angebot"
      );
      expect(origin(row)).toBe(
        "zurückgesetzt aus ‚beaufsichtigt‘ – ‚Impressum fehlt‘"
      );
      expect(row.text()).toContain("wartet seit 45 Minuten");
    });

    it("names a reset without a reason by its level alone", async () => {
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
        pageOf([
          {
            ...RESET_TENANT,
            lastChange: { ...RESET_TENANT.lastChange, reason: null },
          },
        ])
      );
      const wrapper = await mountView();

      expect(origin(tenantRows(wrapper).at(0))).toBe(
        "zurückgesetzt aus ‚beaufsichtigt‘"
      );
    });

    it("reads an adopted start level as new", async () => {
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
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
      const wrapper = await mountView();

      expect(origin(tenantRows(wrapper).at(0))).toBe("neu angelegt");
    });

    it("says so when a tenant has no owner and no offers", async () => {
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
        pageOf([{ ...NEW_TENANT, owners: [], offerCount: 0, lastChange: null }])
      );
      const wrapper = await mountView();

      const row = tenantRows(wrapper).at(0);
      expect(facts(row)).toBe(
        "Petra Lehmann · vorstand@sv-blau-weiss.de · Musterstadt · kein Owner · keine Angebote"
      );
      expect(row.find("[data-test='tenant-queue-origin']").exists()).toBe(
        false
      );
    });

    it("says so when no tenant waits", async () => {
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
        pageOf([])
      );
      const wrapper = await mountView();

      expect(wrapper.text()).toContain("Keine Mandanten warten auf Freigabe");
      expect(counter(wrapper, "tenants").text()).toBe("0");
    });

    it("names a failed load and shows no counter", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockRejectedValue({
        response: { status: 500, data: {} },
      });
      const wrapper = await mountView();

      expect(wrapper.find("[data-test='tenant-queue-error']").text()).toBe(
        "Die wartenden Mandanten konnten nicht geladen werden."
      );
      expect(wrapper.text()).not.toContain(
        "Keine Mandanten warten auf Freigabe"
      );
      expect(counter(wrapper, "tenants").exists()).toBe(false);
    });

    it("asks the backend for the page the footer turns to", async () => {
      ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
        pageOf([NEW_TENANT, RESET_TENANT], 60)
      );
      const wrapper = await mountView();

      await wrapper
        .find(".tenant-queue .v-data-footer__icons-after button")
        .trigger("click");
      await flushPromises();

      expect(
        ApiTenantApprovalQueueService.getTenantApprovalQueue
      ).toHaveBeenLastCalledWith({ page: 2, pageSize: 25 });
    });

    it("opens the tenant's bookings in the tenant of the row", async () => {
      const wrapper = await mountView();

      await tenantRows(wrapper)
        .at(0)
        .find("[data-test='tenant-queue-bookings']")
        .trigger("click");
      await flushPromises();

      expect(selectTenant).toHaveBeenCalledWith(expect.anything(), "t-3");
      expect(push).toHaveBeenCalledWith({ name: "bookings" });
      expect(selectTenant.mock.invocationCallOrder[0]).toBeLessThan(
        push.mock.invocationCallOrder[0]
      );
      expect(addToast.mock.calls.at(-1)[1].message).toBe(
        "Mandant zu „SV Blau-Weiß“ gewechselt."
      );
    });

    it("opens the tenant's supervision history", async () => {
      ApiSupervisionService.getTenantHistory.mockResolvedValue(pageOf([]));
      const wrapper = await mountView();

      await tenantRows(wrapper)
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

    describe("the decision", () => {
      const approve = async (wrapper, index) => {
        await tenantRows(wrapper)
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

      it("approves a tenant as supervised and reads both registers anew", async () => {
        const wrapper = await mountView();
        ApiTenantApprovalQueueService.getTenantApprovalQueue.mockResolvedValue(
          pageOf([RESET_TENANT])
        );
        // A supervised tenant's pending offers enter the offers' register.
        ApiReviewQueueService.getReviewQueue.mockResolvedValue(
          pageOf([ROOM, EVENT], 5)
        );

        await approve(wrapper, 0);

        expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith(
          "t-3",
          { level: "supervised" }
        );
        expect(tenantRows(wrapper)).toHaveLength(1);
        expect(counter(wrapper, "tenants").text()).toBe("1");
        expect(counter(wrapper, "offers").text()).toBe("5");
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
        const wrapper = await mountView();

        await tenantRows(wrapper)
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

        expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith(
          "t-4",
          { level: "free" }
        );
        expect(addToast.mock.calls.at(-1)[1].message).toBe(
          "„Makerspace Nord“ ist jetzt frei."
        );
        expect(
          ApiTenantApprovalQueueService.getTenantApprovalQueue
        ).toHaveBeenCalledTimes(2);
      });

      it("names a level someone else changed meanwhile and reloads", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        ApiSupervisionService.setTenantLevel.mockRejectedValue(
          lifecycleError(409, "supervision_level_changed", {
            tenantId: "t-3",
            expected: "pending",
          })
        );
        const wrapper = await mountView();

        await approve(wrapper, 0);

        expect(
          wrapper.find("[data-test='tenant-queue-decision-error']").text()
        ).toContain("Die Aufsichtsstufe wurde inzwischen geändert.");
        expect(
          ApiTenantApprovalQueueService.getTenantApprovalQueue
        ).toHaveBeenCalledTimes(2);
        expect(ApiReviewQueueService.getReviewQueue).toHaveBeenCalledTimes(2);
        expect(addToast).not.toHaveBeenCalled();
      });

      it("names a tenant that is gone and reloads", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        ApiSupervisionService.setTenantLevel.mockRejectedValue(
          lifecycleError(404, "tenant_not_found", { id: "t-3" })
        );
        const wrapper = await mountView();

        await approve(wrapper, 0);

        expect(
          wrapper.find("[data-test='tenant-queue-decision-error']").text()
        ).toBe("Der Mandant existiert nicht mehr.");
        expect(
          ApiTenantApprovalQueueService.getTenantApprovalQueue
        ).toHaveBeenCalledTimes(2);
      });

      it("names a failed decision and leaves the list as it is", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        ApiSupervisionService.setTenantLevel.mockRejectedValue(serverError());
        const wrapper = await mountView();

        await approve(wrapper, 0);

        expect(
          wrapper.find("[data-test='tenant-queue-decision-error']").text()
        ).toBe("Die Aufsichtsstufe konnte nicht geändert werden.");
        expect(
          ApiTenantApprovalQueueService.getTenantApprovalQueue
        ).toHaveBeenCalledTimes(1);
        expect(tenantRows(wrapper)).toHaveLength(2);
      });
    });

    describe("the decline", () => {
      const declineDialog = (wrapper) =>
        wrapper.findComponent({ name: "TenantDeclineDialog" });
      const startDecline = async (wrapper, index) => {
        await tenantRows(wrapper)
          .at(index)
          .find("[data-test='tenant-queue-decline']")
          .trigger("click");
        await flushPromises();
      };

      it("opens the decline dialog with the row's tenant", async () => {
        const wrapper = await mountView();

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

      it("reads both registers anew once the tenant is declined", async () => {
        const wrapper = await mountView();
        await startDecline(wrapper, 1);

        declineDialog(wrapper).vm.$emit("declined", {
          tenantId: "t-4",
          supervisionLevel: "declined",
          supervisionChangedAt: "2026-09-21T10:00:00.000Z",
          supervisionReason: "Kein Impressum",
        });
        await flushPromises();

        expect(declineDialog(wrapper).props("open")).toBe(false);
        expect(
          ApiTenantApprovalQueueService.getTenantApprovalQueue
        ).toHaveBeenCalledTimes(2);
        expect(ApiReviewQueueService.getReviewQueue).toHaveBeenCalledTimes(2);
        expect(addToast.mock.calls.at(-1)[1].message).toBe(
          "„Makerspace Nord“ ist jetzt abgewiesen."
        );
      });

      it("reads both registers anew when the dialog finds the tenant changed", async () => {
        const wrapper = await mountView();
        await startDecline(wrapper, 0);

        declineDialog(wrapper).vm.$emit("stale");
        await flushPromises();

        expect(
          ApiTenantApprovalQueueService.getTenantApprovalQueue
        ).toHaveBeenCalledTimes(2);
        expect(ApiReviewQueueService.getReviewQueue).toHaveBeenCalledTimes(2);
        // The dialog says what happened; it stays open until closed.
        expect(declineDialog(wrapper).props("open")).toBe(true);
      });
    });
  });

  describe("the notices beside it", () => {
    it("says so when every notice went out", async () => {
      const wrapper = await mountView();

      expect(notices.getNotifications).toHaveBeenCalledWith({
        status: "failed",
        page: 1,
        pageSize: 5,
      });
      expect(wrapper.find("[data-test='notice-panel-none']").text()).toBe(
        "Alle Mitteilungen sind zugestellt."
      );
      expect(wrapper.text()).toContain(
        "Entscheidung und Verlauf bleiben unverändert"
      );
    });

    it("names the notices that did not go out and counts the rest", async () => {
      notices.getNotifications.mockResolvedValue(pageOf([FAILED_NOTICE], 4));
      const wrapper = await mountView();

      const row = wrapper.find("[data-test='notice-panel-row-n-1']").text();
      expect(row).toContain("Eintritt in die Prüfliste");
      expect(row).toContain("Sportverein");
      expect(row).toContain("21.09.26");
      expect(wrapper.find("[data-test='notice-panel-more']").text()).toBe(
        "und 3 weitere"
      );
    });

    it("sends a notice again from the panel and reads it anew", async () => {
      notices.getNotifications.mockResolvedValue(pageOf([FAILED_NOTICE]));
      notices.retry.mockResolvedValue({ ...FAILED_NOTICE, status: "sent" });
      const wrapper = await mountView();
      notices.getNotifications.mockResolvedValue(pageOf([]));

      await wrapper
        .find("[data-test='notification-retry-n-1']")
        .trigger("click");
      await flushPromises();

      expect(notices.retry).toHaveBeenCalledWith("n-1");
      expect(addToast.mock.calls.at(-1)[1]).toEqual({
        message: "Die Mitteilung wurde gesendet.",
        type: "success",
      });
      expect(wrapper.find("[data-test='notice-panel-none']").exists()).toBe(
        true
      );
    });

    it("opens the whole outbox in a dialog and reads the panel anew on close", async () => {
      const wrapper = await mountView();
      notices.getNotifications.mockClear();

      await wrapper.find("[data-test='notice-panel-open']").trigger("click");
      await flushPromises();

      expect(
        activeDialog().querySelector("[data-test='notification-list']")
      ).not.toBeNull();
      expect(notices.getNotifications).toHaveBeenLastCalledWith({
        status: "failed",
        page: 1,
        pageSize: 50,
      });

      dialogButton("Schließen").click();
      await flushPromises();

      expect(notices.getNotifications).toHaveBeenLastCalledWith({
        status: "failed",
        page: 1,
        pageSize: 5,
      });
    });

    it("names a failed load of the notices without touching the queue", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      notices.getNotifications.mockRejectedValue({
        response: { status: 500, data: {} },
      });
      const wrapper = await mountView();

      expect(wrapper.find("[data-test='notice-panel-error']").text()).toContain(
        "Die Aufsichtsmitteilungen konnten nicht geladen werden."
      );
      expect(rows(wrapper)).toHaveLength(2);
    });
  });
});
