import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiBookablesService from "@/services/api/ApiBookablesService";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "t1" } },
}));

function bookable(overrides = {}) {
  return {
    id: "b1",
    title: "Raum",
    specialOpeningHours: [],
    accessPointDetails: {
      active: true,
      accessBuffer: { before: 0, after: 0 },
      accessPointIds: ["ap-1"],
    },
    ...overrides,
  };
}

/**
 * Since 4.3.x `lockerDetails` is derived from the access points on the way out
 * and dropped on the way in - a PUT carrying it answers 201 and changes
 * nothing. Sending it anyway would claim a write permission that does not
 * exist, and would read as a third truth next to `accessPointIds` and
 * `amount`.
 */
describe("ApiBookablesService", () => {
  beforeEach(() => {
    global.ApiClient = { put: vi.fn().mockResolvedValue({ data: {} }) };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("does not send the read-only lockerDetails when storing", async () => {
    await ApiBookablesService.createOrUpdateBookable(
      bookable({ lockerDetails: { active: true, units: [{ amount: 2 }] } })
    );

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body).not.toHaveProperty("lockerDetails");
    expect(body.accessPointDetails.accessPointIds).toEqual(["ap-1"]);
  });

  it("leaves the caller's bookable untouched", async () => {
    const original = bookable({ lockerDetails: { active: true, units: [] } });

    await ApiBookablesService.createOrUpdateBookable(original);

    expect(original).toHaveProperty("lockerDetails");
  });

  /**
   * An amount for an access point the bookable does not reference means
   * nothing - the backend drops it too, and the UI has no reason to send
   * something meaningless (locker spec §L2.1).
   */
  it("drops distributed amounts of access points that are not assigned", async () => {
    await ApiBookablesService.createOrUpdateBookable(
      bookable({
        accessPointDetails: {
          active: true,
          accessBuffer: { before: 0, after: 0 },
          accessPointIds: ["ap-1"],
          accessPointAmounts: { "ap-1": 3, "ap-gone": 5 },
        },
      })
    );

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body.accessPointDetails.accessPointAmounts).toEqual({ "ap-1": 3 });
  });

  it("leaves the caller's amounts untouched while pruning", async () => {
    const original = bookable({
      accessPointDetails: {
        active: true,
        accessBuffer: { before: 0, after: 0 },
        accessPointIds: ["ap-1"],
        accessPointAmounts: { "ap-1": 3, "ap-gone": 5 },
      },
    });

    await ApiBookablesService.createOrUpdateBookable(original);

    expect(original.accessPointDetails.accessPointAmounts).toEqual({
      "ap-1": 3,
      "ap-gone": 5,
    });
  });

  it("sends no amounts block for a bookable without access details", async () => {
    await ApiBookablesService.createOrUpdateBookable(
      bookable({ accessPointDetails: undefined })
    );

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body.accessPointDetails).toBeUndefined();
  });

  /**
   * The field is additive: a bookable that carries no distribution keeps
   * carrying none. An empty map is not the same statement as its absence.
   */
  it("does not invent an amounts map for a bookable that has none", async () => {
    await ApiBookablesService.createOrUpdateBookable(bookable());

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body.accessPointDetails).not.toHaveProperty("accessPointAmounts");
  });
});
