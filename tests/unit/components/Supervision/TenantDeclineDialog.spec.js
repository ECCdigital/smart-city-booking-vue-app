import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  activeDialogText as rawDialogText,
  dialogButton,
} from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiSupervisionService", () => ({
  default: { setTenantLevel: vi.fn() },
}));

import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import TenantDeclineDialog from "@/components/Supervision/TenantDeclineDialog.vue";

// What the tenant approval queue hands in: no more than id, name and level.
const TENANT = { id: "t-7", name: "Sportverein", supervisionLevel: "pending" };

const selectTenant = vi.fn();
const push = vi.fn();

async function mountDialog(propsData) {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t-1" },
        actions: { select: selectTenant },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(TenantDeclineDialog, {
    store,
    mocks: { $router: { push } },
    propsData: { open: true, tenant: TENANT, ...propsData },
  });
  await flushPromises();
  return wrapper;
}

const activeDialogText = () => rawDialogText().replace(/\s+/g, " ");
const submitButton = () =>
  document.querySelector("[data-test='decline-submit']");

async function typeReason(wrapper, text) {
  wrapper.findComponent({ ref: "reason" }).vm.$emit("input", text);
  await flushPromises();
}

async function submit() {
  submitButton().click();
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiSupervisionService.setTenantLevel.mockResolvedValue({
    supervisionLevel: "declined",
    supervisionChangedAt: "2026-09-24T10:00:00.000Z",
    supervisionReason: "Kein Impressum",
  });
});

describe("TenantDeclineDialog", () => {
  it("names the tenant and what the decline means before it is sent", async () => {
    await mountDialog();

    const text = activeDialogText();
    expect(text).toContain("Mandanten abweisen");
    expect(text).toContain("Sportverein");
    expect(text).toContain("Nichts vom Mandanten ist öffentlich sichtbar.");
    expect(text).toContain(
      "Tenant-Owner und Mitglieder verlieren jeden Verwaltungszugriff"
    );
    expect(text).toContain("Bestehende Buchungen bleiben für Kunden nutzbar");
    expect(text).toContain("jederzeit zurücknehmen");
    expect(text).toContain(
      "Die Tenant-Owner sehen die Begründung per Mail und beim Anmelden."
    );
    expect(ApiSupervisionService.setTenantLevel).not.toHaveBeenCalled();
  });

  it("leads to the tenant's bookings to check them first", async () => {
    await mountDialog();

    const link = document.querySelector("[data-test='tenant-bookings-link']");
    expect(link.textContent.trim()).toBe("Offene Buchungen des Mandanten");
    link.click();
    await flushPromises();

    expect(selectTenant).toHaveBeenCalledWith(expect.anything(), "t-7");
    expect(push).toHaveBeenCalledWith({ name: "bookings" });
    expect(ApiSupervisionService.setTenantLevel).not.toHaveBeenCalled();
  });

  it("leads nowhere once the tenant is gone", async () => {
    // A host that reloaded after a 404 has no tenant left to hand in.
    await mountDialog({ tenant: {} });

    expect(
      document.querySelector("[data-test='tenant-bookings-link']")
    ).toBeNull();
  });

  it("declines the tenant with the reason and hands the answer on", async () => {
    const wrapper = await mountDialog();

    await typeReason(wrapper, "  Kein Impressum ");
    await submit();

    expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-7", {
      level: "declined",
      reason: "Kein Impressum",
    });
    expect(wrapper.emitted("declined")).toEqual([
      [
        {
          tenantId: "t-7",
          supervisionLevel: "declined",
          supervisionChangedAt: "2026-09-24T10:00:00.000Z",
          supervisionReason: "Kein Impressum",
        },
      ],
    ]);
  });

  it("declines without a reason when none was given", async () => {
    ApiSupervisionService.setTenantLevel.mockResolvedValue({
      supervisionLevel: "declined",
      supervisionChangedAt: "2026-09-24T10:00:00.000Z",
      supervisionReason: null,
    });
    const wrapper = await mountDialog();

    await typeReason(wrapper, "   ");
    await submit();

    expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-7", {
      level: "declined",
      reason: null,
    });
    expect(wrapper.emitted("declined")[0][0].supervisionReason).toBeNull();
  });

  it("names a concurrent change and asks the host to reload", async () => {
    ApiSupervisionService.setTenantLevel.mockRejectedValue({
      response: {
        status: 409,
        data: { code: "supervision_level_changed", statusCode: 409 },
      },
    });
    const wrapper = await mountDialog();

    await submit();

    expect(activeDialogText()).toContain(
      "Die Aufsichtsstufe wurde inzwischen geändert."
    );
    expect(wrapper.emitted("declined")).toBeUndefined();
    expect(wrapper.emitted("stale")).toHaveLength(1);
  });

  it("names a tenant that is gone and asks the host to reload", async () => {
    ApiSupervisionService.setTenantLevel.mockRejectedValue({
      response: {
        status: 404,
        data: { code: "tenant_not_found", statusCode: 404 },
      },
    });
    const wrapper = await mountDialog();

    await submit();

    expect(activeDialogText()).toContain("Der Mandant existiert nicht mehr.");
    expect(wrapper.emitted("stale")).toHaveLength(1);
  });

  it("says so when the decline fails otherwise, and keeps the list", async () => {
    ApiSupervisionService.setTenantLevel.mockRejectedValue(new Error("500"));
    const wrapper = await mountDialog();

    await submit();

    expect(activeDialogText()).toContain(
      "Der Mandant konnte nicht abgewiesen werden."
    );
    expect(wrapper.emitted("stale")).toBeUndefined();
  });

  it("closes without declining on cancel", async () => {
    const wrapper = await mountDialog();

    dialogButton("Abbrechen").click();
    await flushPromises();

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(ApiSupervisionService.setTenantLevel).not.toHaveBeenCalled();
  });

  it("starts empty again each time it opens", async () => {
    ApiSupervisionService.setTenantLevel.mockRejectedValue(new Error("500"));
    const wrapper = await mountDialog();
    await typeReason(wrapper, "Kein Impressum");
    await submit();

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(wrapper.findComponent({ ref: "reason" }).props("value")).toBe("");
    expect(activeDialogText()).not.toContain("nicht abgewiesen werden");
  });
});
