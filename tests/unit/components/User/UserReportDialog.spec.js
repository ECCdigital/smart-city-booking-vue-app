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

/** A user's report asks for a suspension, an address's for the Sperrliste. */
describe("UserReportDialog: account or address", () => {
  // The dialog detaches into the document, out of the wrapper's element.
  const dialogText = () => document.querySelector(".v-dialog").textContent;
  const reportText = () =>
    document.querySelector("[data-test='user-report-text']").textContent;

  const mount = async (propsData = {}) => {
    const wrapper = mountComponent(UserReportDialog, {
      store: store(),
      propsData: {
        open: true,
        name: "Erika Muster",
        tenantId: "stadt",
        bookingId: "b1",
        ...propsData,
      },
    });
    await wrapper.vm.$nextTick();
    return wrapper;
  };

  it("reports the account of a user, which the instance may suspend", async () => {
    await mount();

    expect(dialogText()).toContain("Erika Muster an die Instanz melden");
    expect(reportText()).toContain("Sie melden das Konto von Erika Muster.");
  });

  it("reports an address, which the instance may put on the Sperrliste", async () => {
    await mount({ addresses: ["erika@example.de"] });

    expect(dialogText()).toContain("E-Mailadresse an die Instanz melden");
    expect(dialogText()).not.toContain("Erika Muster an die Instanz melden");
    expect(reportText()).toContain("Sie melden eine Mailadresse, kein Konto.");
  });
});

/** „Adresse … zusätzlich melden“ beside the report of the booker's account. */
describe("UserReportDialog: the account's address too", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const hint = () =>
    document.querySelector("[data-test='user-report-also-address-hint']");

  const mount = async (propsData = {}) => {
    const wrapper = mountComponent(UserReportDialog, {
      store: store(),
      propsData: {
        open: true,
        name: "Erika Muster",
        tenantId: "stadt",
        bookingId: "b1",
        reportAddress: "erika@example.de",
        ...propsData,
      },
    });
    await wrapper.vm.$nextTick();
    return wrapper;
  };

  it("names the booking and that the booker learns nothing in one paragraph", async () => {
    await mount();

    expect(
      document
        .querySelector("[data-test='user-report-unaware']")
        .textContent.replace(/\s+/g, " ")
        .trim()
    ).toBe(
      "Die Buchung hängt als Beleg an der Meldung. Erika Muster erfährt von der Meldung nichts."
    );
  });

  it("offers the address unticked, with the same hint either way", async () => {
    const wrapper = await mount();
    const text =
      "Die Instanz kann die Adresse auf die Sperrliste setzen. Dann sind mit ihr keine Gast-Buchung und keine Registrierung mehr möglich.";

    expect(wrapper.vm.alsoAddress).toBe(false);
    expect(hint().textContent.trim()).toBe(text);
    await wrapper.setData({ alsoAddress: true });
    expect(hint().textContent.trim()).toBe(text);
  });

  it("offers nothing without the address", async () => {
    await mount({ reportAddress: null });

    expect(hint()).toBe(null);
  });

  it("reports the account only, unticked", async () => {
    ApiReportService.report.mockResolvedValueOnce({ status: 201, data: {} });
    const wrapper = await mount();
    await wrapper.setData({ reason: "Spam" });
    await wrapper.vm.confirm();

    expect(ApiReportService.report).toHaveBeenCalledTimes(1);
  });

  it("reports the address by hand after the account, ticked", async () => {
    ApiReportService.report.mockResolvedValue({ status: 201, data: {} });
    const wrapper = await mount();
    await wrapper.setData({ reason: " Spam ", alsoAddress: true });
    await wrapper.vm.confirm();

    expect(ApiReportService.report.mock.calls).toEqual([
      ["stadt", expect.objectContaining({ bookingId: "b1", reason: "Spam" })],
      ["stadt", { addresses: ["erika@example.de"], reason: "Spam" }],
    ]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("closes with a toast when the address is refused after the account", async () => {
    ApiReportService.report
      .mockResolvedValueOnce({ status: 201, data: {} })
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: { code: "report_target_already_blacklisted" },
        },
      });
    const wrapper = await mount();
    await wrapper.setData({ reason: "Spam", alsoAddress: true });
    await wrapper.vm.confirm();

    expect(addToast.mock.calls[1][1].title).toBe("Adresse nicht gemeldet");
    expect(addToast.mock.calls[1][1].message).toMatch(
      /^Das Konto wurde gemeldet, die Adresse nicht: /
    );
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});

/** A booker whose account is gone: the address can be reported still. */
describe("UserReportDialog: the booker's account is gone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const withoutAccount = {
    response: {
      status: 400,
      data: { code: "report_target_without_account" },
    },
  };

  const mount = async (propsData = {}) => {
    const wrapper = mountComponent(UserReportDialog, {
      store: store(),
      propsData: {
        open: true,
        name: "Erika Muster",
        tenantId: "stadt",
        bookingId: "b1",
        reportAddress: "erika@example.de",
        reportAddressOfBooking: true,
        ...propsData,
      },
    });
    await wrapper.setData({ reason: "Spam" });
    return wrapper;
  };

  it("turns to the address, ticked, with the reason kept", async () => {
    ApiReportService.report.mockRejectedValueOnce(withoutAccount);
    const wrapper = await mount();
    await wrapper.vm.confirm();

    expect(wrapper.vm.byAddress).toBe(true);
    expect(wrapper.vm.picked).toEqual(["erika@example.de"]);
    expect(wrapper.vm.reason).toBe("Spam");
    expect(wrapper.vm.error).toBe(null);
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(
      document
        .querySelector("[data-test='user-report-account-gone']")
        .textContent.trim()
    ).toBe(
      "Das Konto von Erika Muster gibt es nicht mehr. Sie können noch die Mailadresse melden."
    );
  });

  it("then reports the address from the booking", async () => {
    ApiReportService.report
      .mockRejectedValueOnce(withoutAccount)
      .mockResolvedValueOnce({ status: 201, data: {} });
    const wrapper = await mount();
    await wrapper.vm.confirm();
    await wrapper.vm.confirm();

    expect(ApiReportService.report.mock.calls[1]).toEqual([
      "stadt",
      { bookingId: "b1", addresses: ["erika@example.de"], reason: "Spam" },
    ]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("reports it by hand where it is not of the booking's mail", async () => {
    ApiReportService.report
      .mockRejectedValueOnce(withoutAccount)
      .mockResolvedValueOnce({ status: 201, data: {} });
    const wrapper = await mount({ reportAddressOfBooking: false });
    await wrapper.vm.confirm();
    await wrapper.vm.confirm();

    expect(ApiReportService.report.mock.calls[1][1].bookingId).toBeUndefined();
  });

  it("keeps the backend's word without an address to turn to", async () => {
    ApiReportService.report.mockRejectedValueOnce(withoutAccount);
    const wrapper = await mount({ reportAddress: null });
    await wrapper.vm.confirm();

    expect(wrapper.vm.byAddress).toBe(false);
    expect(wrapper.vm.error).toBe(
      "Der Bucher hat kein Konto. Gäste lassen sich hier nicht melden."
    );
  });
});
