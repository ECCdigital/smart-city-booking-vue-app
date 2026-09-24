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
    supervisionLevel: "pending",
    supervisionChangedAt: "2026-09-21T08:30:00.000Z",
    supervisionReason: "Missbrauch gemeldet",
  });
});

describe("SupervisionLevelDialog", () => {
  it("names the tenant and its effective level, and offers the two others", async () => {
    await mountDialog();

    expect(activeDialogText()).toContain("Sportverein");
    expect(activeDialogText()).toContain("Aktuelle Stufe: frei");
    expect(levelOption("free")).toBeNull();
    expect(levelOption("supervised")).not.toBeNull();
    expect(levelOption("pending")).not.toBeNull();
    expect(levelOption("declined")).toBeNull();
  });

  it("reads a tenant without a stored level as free", async () => {
    await mountDialog({ tenant: { id: "t-8", name: "Altbestand" } });

    expect(activeDialogText()).toContain("Aktuelle Stufe: frei");
    expect(levelOption("free")).toBeNull();
  });

  it("offers every direction: a pending tenant may become free or supervised", async () => {
    await mountDialog({ tenant: { ...TENANT, supervisionLevel: "pending" } });

    expect(levelOption("free")).not.toBeNull();
    expect(levelOption("supervised")).not.toBeNull();
    expect(levelOption("pending")).toBeNull();
  });

  it("names a declined tenant's level and offers the three others, never declined", async () => {
    await mountDialog({ tenant: { ...TENANT, supervisionLevel: "declined" } });

    expect(activeDialogText()).toContain("Aktuelle Stufe: abgewiesen");
    expect(levelOption("free")).not.toBeNull();
    expect(levelOption("supervised")).not.toBeNull();
    expect(levelOption("pending")).not.toBeNull();
    expect(levelOption("declined")).toBeNull();
  });

  it("takes a decline back: asks for the level the tenant returns to", async () => {
    ApiSupervisionService.setTenantLevel.mockResolvedValue({
      supervisionLevel: "supervised",
      supervisionChangedAt: "2026-09-24T10:00:00.000Z",
      supervisionReason: "Impressum nachgereicht",
    });
    const wrapper = await mountDialog({
      tenant: { ...TENANT, supervisionLevel: "declined" },
    });

    expect(activeDialogText()).toContain("Abweisung zurücknehmen");
    expect(activeDialogText()).not.toContain("Aufsichtsstufe ändern");
    expect(activeDialogText()).toContain("Der Mandant erhält die Stufe");
    await choose("supervised");
    await typeReason(wrapper, "Impressum nachgereicht");
    submitButton().click();
    await flushPromises();

    expect(submitButton().textContent.trim()).toBe("Abweisung zurücknehmen");
    expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-7", {
      level: "supervised",
      reason: "Impressum nachgereicht",
    });
    expect(wrapper.emitted("changed")[0][0]).toMatchObject({
      supervisionLevel: "supervised",
      supervisionReason: "Impressum nachgereicht",
    });
  });

  it("changes nothing before a level is chosen", async () => {
    await mountDialog();

    expect(submitButton().disabled).toBe(true);
  });

  it("says what the chosen level means", async () => {
    await mountDialog();

    await choose("pending");
    expect(activeDialogText()).toContain("wartet auf Ihre Freigabe");
    expect(activeDialogText()).toContain("können weiter alles vorbereiten");
    expect(activeDialogText()).toContain("bestehende Buchungen bleiben");

    await choose("supervised");
    expect(activeDialogText()).toContain("für den Direktlink");
    expect(activeDialogText()).toContain("nicht automatisch freigegeben");
    expect(activeDialogText()).not.toContain("wartet auf Ihre Freigabe");
  });

  it("says that a stored review status has no effect for a free tenant", async () => {
    await mountDialog({ tenant: { ...TENANT, supervisionLevel: "pending" } });

    await choose("free");

    expect(activeDialogText()).toContain("haben aber keine Wirkung");
  });

  it("sends level and reason and hands the effective level on", async () => {
    const wrapper = await mountDialog();

    await choose("pending");
    await typeReason(wrapper, "  Missbrauch gemeldet ");
    submitButton().click();
    await flushPromises();

    expect(ApiSupervisionService.setTenantLevel).toHaveBeenCalledWith("t-7", {
      level: "pending",
      reason: "Missbrauch gemeldet",
    });
    expect(wrapper.emitted("changed")).toEqual([
      [
        {
          tenantId: "t-7",
          supervisionLevel: "pending",
          supervisionChangedAt: "2026-09-21T08:30:00.000Z",
          supervisionReason: "Missbrauch gemeldet",
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

    await choose("pending");
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

    await choose("pending");
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

    await choose("pending");
    submitButton().click();
    await flushPromises();

    expect(activeDialogText()).toContain("Der Mandant existiert nicht mehr.");
  });

  it("starts empty again each time it opens", async () => {
    const wrapper = await mountDialog();
    await choose("pending");
    await typeReason(wrapper, "Missbrauch");

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(submitButton().disabled).toBe(true);
    expect(wrapper.findComponent({ ref: "reason" }).props("value")).toBe("");
  });
});
