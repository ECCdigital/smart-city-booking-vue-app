import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { form } = vi.hoisted(() => ({ form: { current: {} } }));

vi.mock("@/store", () => ({
  default: {
    getters: { "tenants/currentTenantId": "t1" },
    state: {
      events: {
        get form() {
          return form.current;
        },
      },
    },
  },
}));

import ApiEventService from "@/services/api/ApiEventService";

/**
 * The review (glossary "Prüfstatus") changes through its own operations
 * alone (`ApiReviewService`); the backend strips it from a store body.
 */
describe("ApiEventService", () => {
  beforeEach(() => {
    global.ApiClient = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue({ data: {} }),
    };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("does not send the review when storing the event form", async () => {
    form.current = {
      id: "e-1",
      isPublic: true,
      information: { name: "Konzert" },
      review: { status: "approved" },
    };

    await ApiEventService.addEvent();

    const [path, body] = global.ApiClient.put.mock.calls[0];
    expect(path).toBe("api/t1/events?withTickets=false");
    expect(body).not.toHaveProperty("review");
    expect(body).toMatchObject({ id: "e-1", isPublic: true, tenantId: "t1" });
    expect(form.current).toHaveProperty("review");
  });

  it("duplicates an event without its review", async () => {
    global.ApiClient.get.mockResolvedValue({
      data: {
        id: "e-1",
        isPublic: true,
        information: { name: "Konzert" },
        review: { status: "approved" },
      },
    });

    await ApiEventService.duplicateEvent("e-1");

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body).not.toHaveProperty("review");
    expect(body.information.name).toBe("Konzert (Kopie)");
  });
});
