import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import UserReportDialog from "@/components/User/UserReportDialog.vue";
import ApiReportService from "@/services/api/ApiReportService";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiReportService", () => ({
  default: { report: vi.fn() },
}));

const addToast = vi.fn();

function store() {
  return new Vuex.Store({
    modules: { toasts: { namespaced: true, actions: { add: addToast } } },
  });
}

/**
 * The toast after „Melden“ reads in plain words,
 * never the translation keys it is built from.
 */
async function reportAnswering(status) {
  ApiReportService.report.mockResolvedValueOnce({ status, data: {} });
  const wrapper = mountComponent(UserReportDialog, {
    store: store(),
    propsData: {
      open: true,
      name: "Erika Muster",
      tenantId: "stadt",
      userId: "erika@example.de",
    },
  });
  await wrapper.setData({ reason: "Beleidigt" });
  await wrapper.vm.confirm();
  return addToast.mock.calls[0][1];
}

describe("UserReportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("says in words that a new report reached the instance", async () => {
    const toast = await reportAnswering(201);

    expect(toast.title).toBe("Meldung gesendet");
    expect(toast.message).toBe("Die Meldung ist bei der Instanz eingegangen.");
  });

  it("says in words that the open report was added to", async () => {
    const toast = await reportAnswering(200);

    expect(toast.title).toBe("Meldung ergänzt");
    expect(toast.message).toBe(
      "Die offene Meldung zu diesem User wurde ergänzt."
    );
  });
});

describe("UserReportDialog: „Mitgliedschaft beenden“", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mount = (propsData = {}) =>
    mountComponent(UserReportDialog, {
      store: store(),
      propsData: {
        open: true,
        name: "Erika Muster",
        tenantId: "stadt",
        userId: "erika@example.de",
        ...propsData,
      },
    });

  it("ends the membership with the report when ticked", async () => {
    ApiReportService.report.mockResolvedValueOnce({ status: 201, data: {} });
    const wrapper = mount({ offerEndMembership: true });
    await wrapper.setData({ reason: "Beleidigt", endMembership: true });

    await wrapper.vm.confirm();

    expect(ApiReportService.report).toHaveBeenCalledWith("stadt", {
      userId: "erika@example.de",
      bookingId: undefined,
      reason: "Beleidigt",
      endMembership: true,
    });
    expect(wrapper.emitted("reported")).toEqual([[{ membershipEnded: true }]]);
  });

  it("offers no checkbox where it is not asked for, and ends nothing", async () => {
    ApiReportService.report.mockResolvedValueOnce({ status: 201, data: {} });
    const wrapper = mount();
    await wrapper.setData({ reason: "Beleidigt", endMembership: true });

    expect(
      wrapper.find('[data-test="user-report-end-membership"]').exists()
    ).toBe(false);
    await wrapper.vm.confirm();

    expect(ApiReportService.report.mock.calls[0][1].endMembership).toBe(false);
    expect(wrapper.emitted("reported")).toEqual([[{ membershipEnded: false }]]);
  });
});

describe("UserReportDialog: guest addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mount = (addresses) =>
    mountComponent(UserReportDialog, {
      store: store(),
      propsData: {
        open: true,
        name: "Gast",
        tenantId: "stadt",
        bookingId: "B-1",
        addresses,
      },
    });

  it("ticks the one address of the booking and reports it with the booking", async () => {
    ApiReportService.report.mockResolvedValueOnce({
      status: 201,
      data: { reports: [{}], blacklisted: [] },
    });
    const wrapper = mount(["gast@example.de"]);
    await wrapper.vm.$nextTick();
    await wrapper.setData({ reason: "No-Show" });

    await wrapper.vm.confirm();

    expect(ApiReportService.report).toHaveBeenCalledWith("stadt", {
      bookingId: "B-1",
      addresses: ["gast@example.de"],
      reason: "No-Show",
    });
  });

  it("ticks none of several addresses and reports nothing until one is ticked", async () => {
    const wrapper = mount(["a@example.de", "b@example.de"]);
    await wrapper.vm.$nextTick();
    await wrapper.setData({ reason: "No-Show" });

    expect(wrapper.vm.picked).toEqual([]);
    expect(wrapper.vm.canConfirm).toBe(false);

    await wrapper.setData({ picked: ["a@example.de", "b@example.de"] });
    expect(wrapper.vm.canConfirm).toBe(true);
  });

  it("says in words which address is already on the blacklist", async () => {
    ApiReportService.report.mockResolvedValueOnce({
      status: 201,
      data: { reports: [{}], blacklisted: ["b@example.de"] },
    });
    const wrapper = mount(["a@example.de", "b@example.de"]);
    await wrapper.setData({
      reason: "No-Show",
      picked: ["a@example.de", "b@example.de"],
    });

    await wrapper.vm.confirm();

    const toasts = addToast.mock.calls.map((call) => call[1]);
    expect(toasts.map((toast) => toast.title)).toEqual([
      "Meldung gesendet",
      "Steht bereits auf der Sperrliste",
    ]);
    expect(toasts[1].message).toBe(
      "b@example.de steht bereits auf der Sperrliste. Dazu entstand keine Meldung."
    );
  });
});
