import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";

vi.mock("@/services/api/ApiSupervisionNotificationService", () => ({
  default: { getNotifications: vi.fn(), retry: vi.fn() },
}));

import ApiSupervisionNotificationService from "@/services/api/ApiSupervisionNotificationService";
import SupervisionNotificationList from "@/components/Supervision/SupervisionNotificationList.vue";

const FAILED_ROW = {
  id: "n-1",
  type: "review.queueEntered",
  tenantId: "t-1",
  payload: {
    tenantName: "Sportverein",
    offers: [
      { offerType: "bookable", offerId: "b-1", title: "Turnhalle" },
      { offerType: "event", offerId: "e-1", title: "Sommerfest" },
    ],
  },
  status: "failed",
  attempts: 2,
  lastError: "mail_disabled: the instance's mail is switched off",
  createdAt: "2026-09-21T08:30:00.000Z",
  sentAt: null,
  deliveries: [
    {
      mailType: "SUPERVISION_REVIEW_QUEUE_ENTERED",
      to: "owner@example.org",
      deliveredAt: "2026-09-21T08:30:05.000Z",
    },
  ],
};

const page = (items) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 50,
});

const SENT_ROW = {
  ...FAILED_ROW,
  id: "n-2",
  status: "sent",
  lastError: null,
  sentAt: "2026-09-21T08:31:00.000Z",
};

const api = ApiSupervisionNotificationService;
const firstRow = (wrapper) => wrapper.find("[data-test^='notification-row-']");
const retryButton = (wrapper, id = "n-1") =>
  wrapper.find(`[data-test='notification-retry-${id}']`);
const lastToast = () => addToast.mock.calls.at(-1)[1];

/** Picks a status the way the select does: model first, then `change`. */
async function chooseStatus(wrapper, status) {
  const select = wrapper.findComponent({ name: "v-select" });
  select.vm.$emit("input", status);
  select.vm.$emit("change", status);
  await wrapper.vm.$nextTick();
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
}

let addToast;

async function mountView() {
  addToast = vi.fn();
  const store = new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(SupervisionNotificationList, { store });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiSupervisionNotificationService.getNotifications.mockResolvedValue(
    page([FAILED_ROW])
  );
});

describe("SupervisionNotificationList", () => {
  it("opens on the notices that did not go out", async () => {
    const wrapper = await mountView();

    expect(
      ApiSupervisionNotificationService.getNotifications
    ).toHaveBeenLastCalledWith({ status: "failed", page: 1, pageSize: 50 });
    const row = firstRow(wrapper).text();
    expect(row).toContain("Eintritt in die Prüfliste");
    expect(row).toContain("Sportverein");
    expect(row).toContain("Turnhalle, Sommerfest");
    expect(row).toContain("owner@example.org");
    expect(row).toContain("fehlgeschlagen");
    expect(row).toContain("mail_disabled");
    expect(row).toContain("2 Versuche");
  });

  it("says so when nothing failed", async () => {
    api.getNotifications.mockResolvedValue(page([]));

    const wrapper = await mountView();

    expect(wrapper.text()).toContain("Keine fehlgeschlagenen Mitteilungen");
  });

  it("shows the other rows through the status filter", async () => {
    const wrapper = await mountView();
    api.getNotifications.mockResolvedValue(page([SENT_ROW]));

    await chooseStatus(wrapper, "sent");
    await flushPromises();

    expect(api.getNotifications).toHaveBeenLastCalledWith({
      status: "sent",
      page: 1,
      pageSize: 50,
    });
    expect(firstRow(wrapper).text()).toContain("gesendet");
  });

  it("offers no retry on a row that went out", async () => {
    api.getNotifications.mockResolvedValue(page([FAILED_ROW, SENT_ROW]));

    const wrapper = await mountView();

    expect(retryButton(wrapper, "n-1").exists()).toBe(true);
    expect(retryButton(wrapper, "n-2").exists()).toBe(false);
  });

  it("offers the retry on a pending row whose send never completed", async () => {
    api.getNotifications.mockResolvedValue(
      page([{ ...FAILED_ROW, id: "n-3", status: "pending", lastError: null }])
    );
    api.retry.mockResolvedValue({ ...SENT_ROW, id: "n-3" });

    const wrapper = await mountView();
    await retryButton(wrapper, "n-3").trigger("click");
    await flushPromises();

    expect(api.retry).toHaveBeenCalledWith("n-3");
  });

  it("tells that a retry sends the mail only", async () => {
    const wrapper = await mountView();

    expect(wrapper.text()).toContain(
      "Entscheidung und Verlauf bleiben unverändert"
    );
  });

  it("sends a failed row again once, then reloads the list", async () => {
    const wrapper = await mountView();
    const sending = deferred();
    api.retry.mockReturnValue(sending.promise);
    api.getNotifications.mockClear();
    api.getNotifications.mockResolvedValue(page([]));

    await retryButton(wrapper).trigger("click");
    expect(retryButton(wrapper).attributes("disabled")).toBe("disabled");
    await retryButton(wrapper).trigger("click");

    expect(api.retry).toHaveBeenCalledTimes(1);
    expect(api.retry).toHaveBeenCalledWith("n-1");
    expect(api.getNotifications).not.toHaveBeenCalled();

    sending.resolve({ ...FAILED_ROW, status: "sent", lastError: null });
    await flushPromises();

    expect(lastToast()).toEqual({
      message: "Die Mitteilung wurde gesendet.",
      type: "success",
    });
    expect(api.getNotifications).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Keine fehlgeschlagenen Mitteilungen");
  });

  it("shows why a retry failed again", async () => {
    const wrapper = await mountView();
    api.retry.mockResolvedValue({
      ...FAILED_ROW,
      attempts: 3,
      lastError: "no_recipients: no owner has an account",
    });

    await retryButton(wrapper).trigger("click");
    await flushPromises();

    expect(lastToast()).toEqual({
      message:
        "Der Versand ist erneut fehlgeschlagen: no_recipients: no owner has an account",
      type: "error",
    });
    expect(retryButton(wrapper).attributes("disabled")).toBeUndefined();
  });

  it("names a refused retry and reloads what the list no longer shows", async () => {
    const wrapper = await mountView();
    api.retry.mockRejectedValue(
      lifecycleError(409, "supervision_notification_already_sent")
    );
    api.getNotifications.mockClear();

    await retryButton(wrapper).trigger("click");
    await flushPromises();

    expect(lastToast()).toEqual({
      message: "Die Mitteilung wurde bereits gesendet.",
      type: "error",
    });
    expect(api.getNotifications).toHaveBeenCalledTimes(1);
  });

  it("says when the list could not be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    api.getNotifications.mockRejectedValue(serverError());

    const wrapper = await mountView();

    expect(
      wrapper.find("[data-test='notifications-load-error']").text()
    ).toContain("Die Aufsichtsmitteilungen konnten nicht geladen werden.");
  });

  it("keeps the answer asked for last when loads overlap", async () => {
    const wrapper = await mountView();
    const first = deferred();
    const second = deferred();
    api.getNotifications
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    await chooseStatus(wrapper, "pending");
    await chooseStatus(wrapper, "sent");
    second.resolve(page([SENT_ROW]));
    await flushPromises();
    first.resolve(page([]));
    await flushPromises();

    expect(firstRow(wrapper).text()).toContain("gesendet");
  });
});
