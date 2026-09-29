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
    global.ApiClient = {
      put: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      get: vi.fn(),
    };
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

  // The review (glossary "Prüfstatus") changes through its own operations
  // alone (`ApiReviewService`); the backend strips it from a store body.
  it("does not send the review when storing", async () => {
    await ApiBookablesService.createOrUpdateBookable(
      bookable({ isPublic: true, review: { status: "approved" } })
    );

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body).not.toHaveProperty("review");
    expect(body.isPublic).toBe(true);
  });

  it("leaves the caller's bookable untouched", async () => {
    const original = bookable({ lockerDetails: { active: true, units: [] } });

    await ApiBookablesService.createOrUpdateBookable(original);

    expect(original).toHaveProperty("lockerDetails");
  });

  /**
   * `accessPointDetails.accessPointAmounts` is retired: a booking gets one
   * compartment per booked unit at each assigned locker system, and nothing is
   * distributed. A map a bookable saved before that must not travel on, so the
   * field is dropped on the way out - the caller's object stays as it is.
   */
  it("sends no accessPointAmounts, even when the bookable still carries one", async () => {
    const original = bookable({
      accessPointDetails: {
        active: true,
        accessBuffer: { before: 0, after: 0 },
        accessPointIds: ["ap-1"],
        accessPointAmounts: { "ap-1": 3 },
      },
    });

    await ApiBookablesService.createOrUpdateBookable(original);

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body.accessPointDetails).not.toHaveProperty("accessPointAmounts");
    expect(body.accessPointDetails.accessPointIds).toEqual(["ap-1"]);
    expect(original.accessPointDetails.accessPointAmounts).toEqual({
      "ap-1": 3,
    });
  });

  it("sends no access details block for a bookable without one", async () => {
    await ApiBookablesService.createOrUpdateBookable(
      bookable({ accessPointDetails: undefined })
    );

    const [, body] = global.ApiClient.put.mock.calls[0];
    expect(body.accessPointDetails).toBeUndefined();
  });

  /**
   * Since ticket 12 of the backend's authorization map, creating is a POST
   * with the entry `create`, and the PUT carries `update` alone: a body
   * without an id no longer creates there.
   */
  it("creates a bookable without an id over POST", async () => {
    await ApiBookablesService.createOrUpdateBookable(
      bookable({ id: undefined })
    );

    expect(global.ApiClient.post).toHaveBeenCalledWith(
      "api/t1/bookables",
      expect.objectContaining({ title: "Raum" })
    );
    expect(global.ApiClient.put).not.toHaveBeenCalled();
  });

  it("updates a bookable with an id over PUT", async () => {
    await ApiBookablesService.createOrUpdateBookable(bookable());

    expect(global.ApiClient.put).toHaveBeenCalledWith(
      "api/t1/bookables",
      expect.objectContaining({ id: "b1" })
    );
    expect(global.ApiClient.post).not.toHaveBeenCalled();
  });

  it("duplicates over POST, without the id of the original", async () => {
    global.ApiClient.get.mockResolvedValue({
      data: { id: "b1", _id: "x", title: "Raum", lockerDetails: {} },
    });

    await ApiBookablesService.duplicateBookable("b1");

    expect(global.ApiClient.get).toHaveBeenCalledWith("api/t1/bookables/b1");
    const [path, body] = global.ApiClient.post.mock.calls[0];
    expect(path).toBe("api/t1/bookables");
    expect(body).toEqual({ title: "Raum (Kopie)" });
    expect(global.ApiClient.put).not.toHaveBeenCalled();
  });
});
