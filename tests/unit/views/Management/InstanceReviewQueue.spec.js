import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiReviewQueueService", () => ({
  default: { getReviewQueue: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn() },
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
import ApiTenantService from "@/services/api/ApiTenantService";
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
    mocks: { $router: { push } },
  });
  await flushPromises();
  return wrapper;
}

const lastParams = () =>
  ApiReviewQueueService.getReviewQueue.mock.calls.at(-1)[0];
const rows = (wrapper) => wrapper.findAll("tbody tr");
const setFilter = async (wrapper, name, value) => {
  wrapper.findComponent({ ref: name }).vm.$emit("input", value);
  await flushPromises();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-21T10:00:00.000Z"));
  selectTenant = vi.fn();
  addToast = vi.fn();
  push = vi.fn();
  currentTenantId = "t-9";
  ApiTenantService.getTenants.mockResolvedValue({
    data: [
      { id: "t-1", name: "Sportverein" },
      { id: "t-2", name: "Makerspace" },
    ],
  });
  ApiReviewQueueService.getReviewQueue.mockResolvedValue(pageOf([ROOM, EVENT]));
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
    expect(room).toContain("18.09.2026");
    expect(room).toContain("wartet seit 3 Tagen");
    expect(room).toContain("Ja");
  });

  it("names an offer without a title by its id", async () => {
    const wrapper = await mountView();

    const event = rows(wrapper).at(1).text();
    expect(event).toContain("Veranstaltung");
    expect(event).toContain("e-1");
    expect(event).toContain("wartet seit einer Stunde");
    expect(event).toContain("Nein");
  });

  it("offers no column to sort by", async () => {
    const wrapper = await mountView();

    expect(wrapper.findAll("th.sortable")).toHaveLength(0);
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

    await setFilter(wrapper, "offerTypeFilter", "event");
    expect(lastParams()).toEqual({
      page: 1,
      pageSize: 25,
      tenantId: "t-2",
      offerType: "event",
    });
  });

  it("offers the tenants of the instance as a filter", async () => {
    const wrapper = await mountView();

    expect(ApiTenantService.getTenants).toHaveBeenCalledWith(true);
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

    await setFilter(wrapper, "offerTypeFilter", "bookable");
    await setFilter(wrapper, "offerTypeFilter", "event");
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
});
