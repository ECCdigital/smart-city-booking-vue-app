import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import i18n from "@/language/index";
import AccessAuditExport from "@/components/Tenant/Edit/AccessAuditExport.vue";
import ApiAccessService from "@/services/api/ApiAccessService";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiAccessService", () => ({
  default: { exportAudit: vi.fn() },
}));

const addToast = vi.fn();

function store() {
  return new Vuex.Store({
    modules: { toasts: { namespaced: true, actions: { add: addToast } } },
  });
}

function csvButton(wrapper) {
  return wrapper
    .findAll("button")
    .wrappers.find((button) =>
      button.text().includes(i18n.t("accessPoint.audit.exportCsv"))
    );
}

/**
 * A denied audit export used to be a 403 and nothing else. Since 4.3.x a
 * tenant outside the caller's reach answers 404, which fell through to the
 * generic "Export fehlgeschlagen. Bitte versuchen Sie es erneut." - an
 * invitation to retry something that will never work.
 */
async function exportWith(error) {
  ApiAccessService.exportAudit.mockRejectedValueOnce(error);

  const wrapper = mountComponent(AccessAuditExport, {
    store: store(),
    propsData: { tenant: "t1" },
  });
  await csvButton(wrapper).trigger("click");
  await new Promise((resolve) => setTimeout(resolve, 0));

  return addToast.mock.calls[0][1];
}

describe("AccessAuditExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("names a denial on a 403", async () => {
    const toast = await exportWith({ response: { status: 403 } });
    expect(toast.title).toBe(i18n.t("accessPoint.audit.error.forbidden.title"));
  });

  it("stays neutral on a 404 instead of inviting a retry", async () => {
    const toast = await exportWith({ response: { status: 404 } });
    expect(toast.title).toBe(
      i18n.t("accessPoint.audit.error.notFoundOrForbidden.title")
    );
    expect(toast.message).not.toMatch(/erneut/i);
  });

  it("keeps the generic failure for anything else", async () => {
    const toast = await exportWith(new Error("Network Error"));
    expect(toast.title).toBe(i18n.t("accessPoint.audit.error.failed.title"));
  });
});
