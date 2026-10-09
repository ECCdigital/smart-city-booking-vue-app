import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn() },
}));
vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));

/**
 * The titles live in a module-level cache, so every case loads a fresh copy
 * of the module.
 */
async function freshModule() {
  vi.resetModules();
  const ApiEventService = (await import("@/services/api/ApiEventService"))
    .default;
  ApiEventService.getEvents.mockReset();
  const store = (await import("@/store")).default;
  store.getters["tenants/currentTenantId"] = "tenant-1";
  const eventTitles = await import("@/utils/eventTitles");
  return { ApiEventService, store, ...eventTitles };
}

const EVENTS = {
  data: [
    { id: "e1", information: { name: "Sommerfest" } },
    { id: "e2", information: {} },
  ],
};

describe("loadEventTitlesById", () => {
  let api;

  beforeEach(async () => {
    api = await freshModule();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("names each event of the current tenant by its title, else its id", async () => {
    api.ApiEventService.getEvents.mockResolvedValue(EVENTS);

    expect(await api.loadEventTitlesById()).toEqual({
      e1: "Sommerfest",
      e2: "e2",
    });
  });

  it("asks once and answers later calls from the cache", async () => {
    api.ApiEventService.getEvents.mockResolvedValue(EVENTS);

    await Promise.all([api.loadEventTitlesById(), api.loadEventTitlesById()]);
    await api.loadEventTitlesById();

    expect(api.ApiEventService.getEvents).toHaveBeenCalledTimes(1);
    expect(api.cachedEventTitlesById()).toEqual({
      e1: "Sommerfest",
      e2: "e2",
    });
  });

  it("answers a failed load with no titles and asks again next time", async () => {
    api.ApiEventService.getEvents
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(EVENTS);

    expect(await api.loadEventTitlesById()).toEqual({});
    expect(await api.loadEventTitlesById()).toEqual({
      e1: "Sommerfest",
      e2: "e2",
    });
    expect(api.ApiEventService.getEvents).toHaveBeenCalledTimes(2);
  });

  it("asks again for another tenant", async () => {
    api.ApiEventService.getEvents.mockResolvedValue(EVENTS);
    await api.loadEventTitlesById();

    api.store.getters["tenants/currentTenantId"] = "tenant-2";
    api.ApiEventService.getEvents.mockResolvedValue({ data: [] });

    expect(await api.loadEventTitlesById()).toEqual({});
    expect(api.ApiEventService.getEvents).toHaveBeenCalledTimes(2);
  });
});
