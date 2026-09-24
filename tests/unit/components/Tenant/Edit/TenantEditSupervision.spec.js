import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiSupervisionService", () => ({
  default: { getTenantHistory: vi.fn(), getInstanceHistory: vi.fn() },
}));

import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import TenantEditSupervision from "@/components/Tenant/Edit/TenantEditSupervision.vue";

// The tenant settings keep their tabs alive, as `TenantOverview.vue` does.
const Host = {
  props: { tenant: { type: Object, required: true } },
  data: () => ({ shown: true }),
  render(h) {
    return h("keep-alive", [
      this.shown
        ? h(TenantEditSupervision, { props: { tenant: this.tenant } })
        : null,
    ]);
  },
};

async function mountTab(tenant) {
  const wrapper = mountComponent(Host, { propsData: { tenant } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiSupervisionService.getTenantHistory.mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
  });
});

describe("TenantEditSupervision", () => {
  it("shows the history of the tenant being edited, never the instance's", async () => {
    await mountTab({ id: "t-1" });

    expect(ApiSupervisionService.getTenantHistory).toHaveBeenCalledTimes(1);
    expect(ApiSupervisionService.getTenantHistory).toHaveBeenCalledWith("t-1", {
      page: 1,
      pageSize: 25,
    });
    expect(ApiSupervisionService.getInstanceHistory).not.toHaveBeenCalled();
  });

  it("waits for the tenant to be loaded", async () => {
    await mountTab({});

    expect(ApiSupervisionService.getTenantHistory).not.toHaveBeenCalled();
    expect(ApiSupervisionService.getInstanceHistory).not.toHaveBeenCalled();
  });

  it("tells the owner of a supervised tenant its level and what it means", async () => {
    const wrapper = await mountTab({
      id: "t-1",
      supervisionLevel: "supervised",
    });

    const notice = wrapper.find("[data-test='supervision-notice']");
    expect(notice.text()).toContain("Aufsichtsstufe: beaufsichtigt");
    expect(notice.text()).toContain("vor der Veröffentlichung");
  });

  it("tells the owner of a pending tenant that the operator approves it, as a warning", async () => {
    const wrapper = await mountTab({ id: "t-1", supervisionLevel: "pending" });

    const notice = wrapper.find("[data-test='supervision-notice']");
    expect(notice.text()).toContain("Aufsichtsstufe: Freigabe ausstehend");
    expect(notice.text()).toContain("Freigabe durch den Betreiber");
    expect(notice.text()).toContain("Sie können bereits alles vorbereiten");
    expect(notice.find(".v-alert").classes()).toContain("warning--text");
  });

  it("names a declined tenant's level and what it takes away, as an error", async () => {
    const wrapper = await mountTab({ id: "t-1", supervisionLevel: "declined" });

    const notice = wrapper.find("[data-test='supervision-notice']");
    expect(notice.text()).toContain("Aufsichtsstufe: abgewiesen");
    expect(notice.text()).toContain("keinen Verwaltungszugriff mehr");
    expect(notice.find(".v-alert").classes()).toContain("error--text");
  });

  it("shows nothing special for a free tenant", async () => {
    const wrapper = await mountTab({ id: "t-1", supervisionLevel: "free" });

    expect(wrapper.find("[data-test='supervision-notice']").exists()).toBe(
      false
    );
  });

  it("reads the history again when the tab is shown again", async () => {
    const wrapper = await mountTab({ id: "t-1" });

    await wrapper.setData({ shown: false });
    await wrapper.setData({ shown: true });
    await flushPromises();

    expect(ApiSupervisionService.getTenantHistory).toHaveBeenCalledTimes(2);
  });
});
