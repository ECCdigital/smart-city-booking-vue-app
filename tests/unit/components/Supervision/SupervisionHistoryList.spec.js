import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  filterOptionLabels,
  openFilterCard,
  pickFilterOption,
  typeSearch,
} from "@tests/unit/support/search";

vi.mock("@/services/api/ApiSupervisionService", () => ({
  default: { getTenantHistory: vi.fn(), getInstanceHistory: vi.fn() },
}));

import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import SupervisionHistoryList from "@/components/Supervision/SupervisionHistoryList.vue";

const LEVEL_CHANGE = {
  id: "h-1",
  tenantId: "t-1",
  offerType: null,
  offerId: null,
  eventType: "tenant.levelChanged",
  occurredAt: "2026-09-21T12:00:00.000Z",
  actor: { type: "user", userId: "owner@example.org" },
  from: "pending",
  to: "declined",
  reason: "Missbrauch gemeldet",
  origin: "api",
};
const REVIEW = {
  id: "h-2",
  tenantId: "t-1",
  offerType: "bookable",
  offerId: "b-7",
  eventType: "review.submitted",
  occurredAt: "2026-09-20T12:00:00.000Z",
  actor: { type: "user", userId: "tenant@example.org" },
  from: null,
  to: "pending",
  reason: null,
  origin: "api",
};
const MIGRATED = {
  id: "h-3",
  tenantId: "t-2",
  offerType: null,
  offerId: null,
  eventType: "tenant.levelInitialized",
  occurredAt: "2026-09-01T12:00:00.000Z",
  actor: { type: "system", userId: null },
  from: null,
  to: "free",
  reason: null,
  origin: "migration",
};

const page = (items, total = items.length, number = 1) => ({
  items,
  total,
  page: number,
  pageSize: 25,
});

async function mountList(propsData) {
  const wrapper = mountComponent(SupervisionHistoryList, { propsData });
  await flushPromises();
  return wrapper;
}

const rowTexts = (wrapper) =>
  wrapper
    .findAll("[data-test='list-row']")
    .wrappers.map((row) => row.text().replace(/\s+/g, " "));

beforeEach(() => {
  vi.clearAllMocks();
  ApiSupervisionService.getTenantHistory.mockResolvedValue(
    page([LEVEL_CHANGE, REVIEW])
  );
  ApiSupervisionService.getInstanceHistory.mockResolvedValue(
    page([LEVEL_CHANGE, MIGRATED])
  );
});

describe("SupervisionHistoryList", () => {
  it("shows the history of the named tenant, read from the tenant's route", async () => {
    const wrapper = await mountList({ tenantId: "t-1" });

    expect(ApiSupervisionService.getTenantHistory).toHaveBeenCalledWith("t-1", {
      page: 1,
      pageSize: 25,
    });
    expect(ApiSupervisionService.getInstanceHistory).not.toHaveBeenCalled();

    const [levelChange] = rowTexts(wrapper);
    expect(levelChange).toContain("21.09.26");
    expect(levelChange).toContain("14:00");
    expect(levelChange).toContain("Aufsichtsstufe geändert");
    expect(levelChange).toContain("owner@example.org");
    expect(levelChange).toContain("Freigabe ausstehend → abgewiesen");
    expect(levelChange).toContain("Missbrauch gemeldet");
  });

  it("names a level it does not know as stored, never as free", async () => {
    ApiSupervisionService.getTenantHistory.mockResolvedValue(
      page([{ ...LEVEL_CHANGE, from: "supervised", to: "locked" }])
    );
    const wrapper = await mountList({ tenantId: "t-1" });

    expect(rowTexts(wrapper)[0]).toContain("beaufsichtigt → locked");
  });

  it("names the offer and its review statuses on a review row", async () => {
    const wrapper = await mountList({ tenantId: "t-1" });

    const review = rowTexts(wrapper)[1];
    expect(review).toContain("Zur Prüfung eingereicht");
    expect(review).toContain("Buchungsobjekt b-7");
    expect(review).toContain("kein Prüfstatus → ausstehend");
  });

  it("reads the instance-wide history without a tenant and names tenant and migration", async () => {
    const wrapper = await mountList({
      instanceWide: true,
      tenants: [{ id: "t-2", name: "Makerspace" }],
    });

    expect(ApiSupervisionService.getInstanceHistory).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
    });
    const migrated = rowTexts(wrapper)[1];
    expect(migrated).toContain("Makerspace");
    expect(migrated).toContain("Aufsichtsstufe übernommen");
    expect(migrated).toContain("Migration");
    expect(migrated).toContain("frei");
    expect(migrated).not.toContain("→");
  });

  it("reads nothing while the tenant is still unknown", async () => {
    await mountList({ tenantId: null });

    expect(ApiSupervisionService.getTenantHistory).not.toHaveBeenCalled();
    expect(ApiSupervisionService.getInstanceHistory).not.toHaveBeenCalled();
  });

  it("narrows the instance-wide history to one tenant and one offer type on the server", async () => {
    const wrapper = await mountList({
      instanceWide: true,
      tenants: [{ id: "t-2", name: "Makerspace" }],
    });

    await openFilterCard(wrapper);
    await pickFilterOption("Makerspace");
    await pickFilterOption("Veranstaltung");
    await flushPromises();

    expect(ApiSupervisionService.getInstanceHistory).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 25,
      tenantId: "t-2",
      offerType: "event",
    });
  });

  it("offers no tenant filter within one tenant's history", async () => {
    const wrapper = await mountList({ tenantId: "t-1" });

    await openFilterCard(wrapper);

    expect(filterOptionLabels()).toEqual(["Buchungsobjekt", "Veranstaltung"]);
  });

  it("searches the offer id on the server once the user stops typing", async () => {
    const wrapper = await mountList({ tenantId: "t-1" });

    await typeSearch(wrapper.find("input[data-test='history-search']"), "b-7");
    await flushPromises();

    expect(ApiSupervisionService.getTenantHistory).toHaveBeenLastCalledWith(
      "t-1",
      { page: 1, pageSize: 25, offerId: "b-7" }
    );
  });

  it("pages on the server", async () => {
    ApiSupervisionService.getTenantHistory.mockResolvedValue(
      page([LEVEL_CHANGE], 60)
    );
    const wrapper = await mountList({ tenantId: "t-1" });

    expect(wrapper.text()).toContain("1–25 von 60");
    await wrapper.find("[data-test='list-next']").trigger("click");
    await flushPromises();

    expect(ApiSupervisionService.getTenantHistory).toHaveBeenLastCalledWith(
      "t-1",
      { page: 2, pageSize: 25 }
    );
  });

  it("says so when there is no entry yet", async () => {
    ApiSupervisionService.getTenantHistory.mockResolvedValue(page([]));
    const wrapper = await mountList({ tenantId: "t-1" });

    expect(wrapper.text()).toContain("Noch keine Einträge.");
  });

  it("tells a failed load from an empty history", async () => {
    ApiSupervisionService.getTenantHistory.mockRejectedValue({
      response: { status: 403, data: { code: "forbidden", statusCode: 403 } },
    });
    const wrapper = await mountList({ tenantId: "t-1" });

    expect(wrapper.text()).toContain(
      "Sie haben keine Berechtigung für diese Aktion."
    );
    expect(wrapper.text()).not.toContain("Noch keine Einträge.");
  });
});
