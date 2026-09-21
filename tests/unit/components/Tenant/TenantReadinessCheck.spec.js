import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getReadiness: vi.fn() },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import TenantReadinessCheck from "@/components/Tenant/TenantReadinessCheck.vue";

const READINESS = {
  checkedAt: "2026-09-21T08:30:00.000Z",
  criteria: [
    { key: "contact", state: "fulfilled", hint: "Kontakt ok.", offers: [] },
    { key: "legal", state: "not_required", hint: "Optional.", offers: [] },
    {
      key: "payment",
      state: "missing",
      hint: "Für kostenpflichtige Angebote fehlt ein Zahlungsweg.",
      offers: [
        { offerType: "bookable", offerId: "b-1", title: "Turnhalle" },
        { offerType: "event", offerId: "e-1", title: "Sommerfest" },
      ],
    },
    {
      key: "mail",
      state: "fulfilled",
      hint: "Der Versand ist eingerichtet.",
      offers: [],
      transport: "instance",
    },
  ],
};

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

async function mountCheck(tenantId = "t-1") {
  const wrapper = mountComponent(TenantReadinessCheck, {
    propsData: { tenantId },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiTenantService.getReadiness.mockResolvedValue(READINESS);
});

describe("TenantReadinessCheck", () => {
  it("shows every criterion with its state, hint and the offers it concerns", async () => {
    const wrapper = await mountCheck();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-1");
    expect(find(wrapper, "readiness-contact").text()).toContain("Erfüllt");
    expect(find(wrapper, "readiness-legal").text()).toContain(
      "Nicht erforderlich"
    );
    const payment = find(wrapper, "readiness-payment").text();
    expect(payment).toContain("Offen");
    expect(payment).toContain("fehlt ein Zahlungsweg");
    expect(payment).toContain("Turnhalle, Sommerfest");
  });

  it("names the time the check was computed", async () => {
    const wrapper = await mountCheck();

    const expected = new Date(READINESS.checkedAt).toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(find(wrapper, "readiness-checked-at").text()).toContain(expected);
  });

  it("names the transport the tenant's mails take", async () => {
    const wrapper = await mountCheck();

    expect(find(wrapper, "readiness-mail").text()).toContain(
      "Versand über die Instanz"
    );
    expect(find(wrapper, "readiness-contact").text()).not.toContain("Versand");
  });

  it("names the tenant's own transport, and none while mail is switched off", async () => {
    const mail = READINESS.criteria[3];
    ApiTenantService.getReadiness.mockResolvedValue({
      ...READINESS,
      criteria: [{ ...mail, transport: "tenant" }],
    });
    const own = await mountCheck();
    expect(find(own, "readiness-mail").text()).toContain(
      "Versand über die Mail-Konfiguration des Mandanten"
    );

    ApiTenantService.getReadiness.mockResolvedValue({
      ...READINESS,
      criteria: [{ ...mail, state: "missing", transport: null }],
    });
    const off = await mountCheck();
    expect(find(off, "readiness-mail").text()).not.toContain("Versand über");
  });

  it("keeps the answer of the tenant asked last when loads overlap", async () => {
    let answerFirst;
    ApiTenantService.getReadiness.mockReturnValueOnce(
      new Promise((resolve) => (answerFirst = resolve))
    );
    const wrapper = await mountCheck("t-1");

    ApiTenantService.getReadiness.mockResolvedValue({
      ...READINESS,
      criteria: [{ key: "offers", state: "missing", hint: "Neu.", offers: [] }],
    });
    await wrapper.setProps({ tenantId: "t-2" });
    await flushPromises();
    answerFirst(READINESS);
    await flushPromises();

    expect(find(wrapper, "readiness-offers").exists()).toBe(true);
    expect(find(wrapper, "readiness-contact").exists()).toBe(false);
  });

  it("computes the check again on demand", async () => {
    const wrapper = await mountCheck();
    ApiTenantService.getReadiness.mockResolvedValue({
      ...READINESS,
      criteria: [
        { key: "payment", state: "fulfilled", hint: "Ok.", offers: [] },
      ],
    });

    await find(wrapper, "readiness-reload").trigger("click");
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledTimes(2);
    expect(find(wrapper, "readiness-payment").text()).toContain("Erfüllt");
  });

  it("loads the check of another tenant when the tenant changes", async () => {
    const wrapper = await mountCheck();

    await wrapper.setProps({ tenantId: "t-2" });
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenLastCalledWith("t-2");
  });

  it("says so when the check cannot be loaded, and offers another try", async () => {
    ApiTenantService.getReadiness.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = await mountCheck();

    expect(wrapper.text()).toContain(
      "Der Bereitschafts-Check konnte nicht geladen werden."
    );
    expect(find(wrapper, "readiness-reload").exists()).toBe(true);
  });
});
