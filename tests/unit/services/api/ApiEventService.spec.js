import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeDouble = vi.hoisted(() => ({ form: {} }));

vi.mock("@/store", () => ({
  default: {
    getters: { "tenants/currentTenantId": "t1" },
    get state() {
      return { events: { form: storeDouble.form } };
    },
  },
}));

const ApiEventService = (await import("@/services/api/ApiEventService"))
  .default;

/**
 * Creating is a POST since ticket 12 of the backend's authorization map;
 * the PUT carries `update` alone.
 */
describe("ApiEventService", () => {
  beforeEach(() => {
    storeDouble.form = {};
    global.ApiClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("creates the form without an id over POST, with the tickets flag", async () => {
    storeDouble.form = { information: { name: "Neu" } };

    await ApiEventService.addEvent(true);

    expect(global.ApiClient.post).toHaveBeenCalledWith(
      "api/t1/events?withTickets=true",
      { information: { name: "Neu" }, tenantId: "t1" }
    );
    expect(global.ApiClient.put).not.toHaveBeenCalled();
  });

  it("updates the form with an id over PUT", async () => {
    storeDouble.form = { id: "e1", information: { name: "Alt" } };

    await ApiEventService.addEvent();

    expect(global.ApiClient.put).toHaveBeenCalledWith(
      "api/t1/events?withTickets=false",
      { id: "e1", information: { name: "Alt" }, tenantId: "t1" }
    );
    expect(global.ApiClient.post).not.toHaveBeenCalled();
  });

  it("duplicates over POST, without the id of the original", async () => {
    global.ApiClient.get.mockResolvedValue({
      data: { id: "e1", _id: "x", information: { name: "Fest" } },
    });

    await ApiEventService.duplicateEvent("e1");

    expect(global.ApiClient.get).toHaveBeenCalledWith("api/t1/events/e1");
    expect(global.ApiClient.post).toHaveBeenCalledWith("api/t1/events", {
      information: { name: "Fest (Kopie)" },
    });
    expect(global.ApiClient.put).not.toHaveBeenCalled();
  });
});
