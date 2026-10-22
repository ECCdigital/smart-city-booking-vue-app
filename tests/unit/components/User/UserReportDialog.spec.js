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
 * The toast after „Melden“ (ECCdigital/tickets#630) reads in plain words,
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
