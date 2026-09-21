import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { activeDialogText as rawDialogText } from "@tests/unit/support/dialog";

vi.mock("@/services/api/ApiSupervisionService", () => ({
  default: { setTenantLevel: vi.fn() },
}));

import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import SupervisionLevelDialog from "@/components/Supervision/SupervisionLevelDialog.vue";

const TENANT = { id: "t-7", name: "Sportverein", supervisionLevel: "free" };

async function mountDialog(propsData) {
  const wrapper = mountComponent(SupervisionLevelDialog, {
    propsData: { open: true, tenant: TENANT, ...propsData },
  });
  await flushPromises();
  return wrapper;
}

const activeDialogText = () => rawDialogText().replace(/\s+/g, " ");
// Vuetify hands a radio's attributes to its input.
const levelOption = (level) =>
  document.querySelector(`input[data-test='level-option-${level}']`);
const submitButton = () => document.querySelector("[data-test='level-submit']");

async function choose(level) {
  levelOption(level).click();
  await flushPromises();
}

async function typeReason(wrapper, text) {
  wrapper.findComponent({ ref: "reason" }).vm.$emit("input", text);
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  ApiSupervisionService.setTenantLevel.mockResolvedValue({
    supervisionLevel: "blocked",
    supervisionChangedAt: "2026-09-21T08:30:00.000Z",
  });
});

describe("SupervisionLevelDialog", () => {
  it("names the tenant and its effective level, and offers the two others", async () => {
    await mountDialog();

    expect(activeDialogText()).toContain("Sportverein");
    expect(activeDialogText()).toContain("Aktuelle Stufe: frei");
    expect(levelOption("free")).toBeNull();
    expect(levelOption("supervised")).not.toBeNull();
    expect(levelOption("blocked")).not.toBeNull();
  });

  it("reads a tenant without a stored level as free", async () => {
    await mountDialog({ tenant: { id: "t-8", name: "Altbestand" } });

    expect(activeDialogText()).toContain("Aktuelle Stufe: frei");
    expect(levelOption("free")).toBeNull();
  });

  it("offers every direction: a blocked tenant may become free or supervised", async () => {
    await mountDialog({ tenant: { ...TENANT, supervisionLevel: "blocked" } });

    expect(levelOption("free")).not.toBeNull();
    expect(levelOption("supervised")).not.toBeNull();
    expect(levelOption("blocked")).toBeNull();
  });

  it("changes nothing before a level is chosen", async () => {
    await mountDialog();

    expect(submitButton().disabled).toBe(true);
  });

  it("says what the chosen level means", async () => {
    await mountDialog();

    await choose("blocked");
    expect(activeDialogText()).toContain("Bestehende Buchungen bleiben");
    expect(activeDialogText()).toContain("die Verwaltung bleibt nutzbar");

    await choose("supervised");
    expect(activeDialogText()).toContain("für den Direktlink");
    expect(activeDialogText()).toContain("nicht automatisch freigegeben");
    expect(activeDialogText()).not.toContain("Bestehende Buchungen bleiben");
  });

  it("says that a stored review status has no effect for a free tenant", async () => {
    await mountDialog({ tenant: { ...TENANT, supervisionLevel: "blocked" } });

    await choose("free");

    expect(activeDialogText()).toContain("haben aber keine Wirkung");
  });

  it("sends level and reason and hands the effective level on", async () => {
    const wrapper = await mountDialog();

    await choose("blocked");
    await typeReason(wrapper, "  Missbrauch gemeldet ");
    submitButton().click();
    await flushPromises();

    expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-7", {
      level: "blocked",
      reason: "Missbrauch gemeldet",
    });
    expect(wrapper.emitted("changed")).toEqual([
      [
        {
          tenantId: "t-7",
          supervisionLevel: "blocked",
          supervisionChangedAt: "2026-09-21T08:30:00.000Z",
        },
      ],
    ]);
  });

  it("sends no reason when none was given", async () => {
    await mountDialog();

    await choose("supervised");
    submitButton().click();
    await flushPromises();

    expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-7", {
      level: "supervised",
      reason: null,
    });
  });

  it("names a concurrent change and asks the host to reload", async () => {
    ApiSupervisionService.setTenantLevel.mockRejectedValue({
      response: {
        status: 409,
        data: { code: "supervision_level_changed", statusCode: 409 },
      },
    });
    const wrapper = await mountDialog();

    await choose("blocked");
    submitButton().click();
    await flushPromises();

    expect(activeDialogText()).toContain(
      "Die Aufsichtsstufe wurde inzwischen geändert."
    );
    expect(wrapper.emitted("changed")).toBeUndefined();
    expect(wrapper.emitted("stale")).toHaveLength(1);
  });

  it("reads a refusal through the central error texts", async () => {
    ApiSupervisionService.setTenantLevel.mockRejectedValue({
      response: { status: 403, data: { code: "forbidden", statusCode: 403 } },
    });
    const wrapper = await mountDialog();

    await choose("blocked");
    submitButton().click();
    await flushPromises();

    expect(activeDialogText()).toContain(
      "Sie haben keine Berechtigung für diese Aktion."
    );
    expect(wrapper.emitted("stale")).toBeUndefined();
  });

  it("names a tenant that is gone", async () => {
    ApiSupervisionService.setTenantLevel.mockRejectedValue({
      response: {
        status: 404,
        data: { code: "tenant_not_found", statusCode: 404 },
      },
    });
    await mountDialog();

    await choose("blocked");
    submitButton().click();
    await flushPromises();

    expect(activeDialogText()).toContain("Der Mandant existiert nicht mehr.");
  });

  it("starts empty again each time it opens", async () => {
    const wrapper = await mountDialog();
    await choose("blocked");
    await typeReason(wrapper, "Missbrauch");

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(submitButton().disabled).toBe(true);
    expect(wrapper.findComponent({ ref: "reason" }).props("value")).toBe("");
  });
});
