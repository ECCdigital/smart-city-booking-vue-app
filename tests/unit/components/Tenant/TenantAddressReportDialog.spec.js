import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import TenantAddressReportDialog from "@/components/Tenant/TenantAddressReportDialog.vue";
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

const mount = () =>
  mountComponent(TenantAddressReportDialog, {
    store: store(),
    propsData: {
      open: true,
      tenantId: "stadt",
      memberIds: ["Erika@example.de"],
    },
  });

const memberHint = () =>
  document.querySelector("[data-test='address-report-member']");

/**
 * „E-Mailadresse melden“ in „Meldungen“: an address
 * entered by hand, reported to the instance.
 */
describe("TenantAddressReportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("takes a single address only, no domain", async () => {
    const wrapper = mount();

    await wrapper.setData({ value: "@wegwerf.de", reason: "Spam" });
    expect(wrapper.vm.address).toBe(null);
    expect(wrapper.vm.canConfirm).toBe(false);
    expect(wrapper.vm.valueError).toBe(
      "Bitte geben Sie eine vollständige Mailadresse ein, etwa max@firma.de."
    );

    await wrapper.setData({ value: " Spam@Wegwerf.de " });
    expect(wrapper.vm.address).toBe("spam@wegwerf.de");
    expect(wrapper.vm.canConfirm).toBe(true);
  });

  it("reports the address once the reason is there", async () => {
    ApiReportService.report.mockResolvedValueOnce({ status: 201, data: {} });
    const wrapper = mount();
    await wrapper.setData({ value: "spam@wegwerf.de" });
    expect(wrapper.vm.canConfirm).toBe(false);

    await wrapper.setData({ reason: "Spam" });
    await wrapper.vm.confirm();

    expect(ApiReportService.report).toHaveBeenCalledWith("stadt", {
      addresses: ["spam@wegwerf.de"],
      reason: "Spam",
    });
    expect(addToast.mock.calls[0][1].title).toBe("Meldung gesendet");
    expect(wrapper.emitted("reported")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("points to the list of members for a member's address, and reports it all the same", async () => {
    const wrapper = mount();

    await wrapper.setData({ value: "spam@wegwerf.de" });
    expect(memberHint()).toBe(null);

    await wrapper.setData({ value: "erika@example.de", reason: "Spam" });
    expect(memberHint().textContent.trim()).toBe(
      "Die Adresse gehört zu einem Mitglied dieses Mandanten. Sie können den Benutzer auch direkt in der Mitgliederliste an die Instanz melden oder dessen Mitgliedschaft beenden."
    );
    expect(memberHint().classList.contains("v-alert")).toBe(true);
    expect(memberHint().classList.contains("text-body-2")).toBe(true);
    expect(wrapper.vm.canConfirm).toBe(true);
  });

  it("offers no preview of affected accounts", () => {
    mount();

    expect(document.body.textContent).not.toContain("Betroffene Konten zeigen");
  });
});
