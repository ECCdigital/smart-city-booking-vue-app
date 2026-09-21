import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiReviewService from "@/services/api/ApiReviewService";

const REVIEW = {
  status: "pending",
  submittedAt: "2026-09-21T08:30:00.000Z",
  decidedAt: null,
  decidedBy: null,
  reason: null,
};

describe("ApiReviewService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
    ApiClient.post.mockReset();
  });

  it("submits a bookable for review without a body and answers the review", async () => {
    ApiClient.post.mockResolvedValue({
      data: { offerType: "bookable", offerId: "b-1", review: REVIEW },
    });

    const review = await ApiReviewService.submit("t-1", "bookable", "b-1");

    expect(ApiClient.post).toHaveBeenCalledWith(
      "api/t-1/bookables/b-1/review/submissions"
    );
    expect(review).toEqual(REVIEW);
  });

  it("decides over an event with the action and the reason", async () => {
    const decided = { ...REVIEW, status: "rejected", reason: "Bild fehlt" };
    ApiClient.post.mockResolvedValue({
      data: { offerType: "event", offerId: "e-1", review: decided },
    });

    const review = await ApiReviewService.decide("t-1", "event", "e-1", {
      action: "reject",
      reason: "Bild fehlt",
    });

    expect(ApiClient.post).toHaveBeenCalledWith(
      "api/t-1/events/e-1/review/decisions",
      { action: "reject", reason: "Bild fehlt" }
    );
    expect(review).toEqual(decided);
  });

  it("sends no reason when none was given", async () => {
    ApiClient.post.mockResolvedValue({ data: { review: REVIEW } });

    await ApiReviewService.decide("t-1", "bookable", "b-1", {
      action: "approve",
      reason: "  ",
    });

    expect(ApiClient.post).toHaveBeenCalledWith(
      "api/t-1/bookables/b-1/review/decisions",
      { action: "approve" }
    );
  });

  it("reads the current review from the offer's admin DTO", async () => {
    ApiClient.get.mockResolvedValue({ data: { id: "b-1", review: REVIEW } });

    const review = await ApiReviewService.getReview("t-1", "bookable", "b-1");

    expect(ApiClient.get).toHaveBeenCalledWith("api/t-1/bookables/b-1");
    expect(review).toEqual(REVIEW);
  });

  it("submits an event for review on the event's own route", async () => {
    ApiClient.post.mockResolvedValue({
      data: { offerType: "event", offerId: "e-1", review: REVIEW },
    });

    const review = await ApiReviewService.submit("t-1", "event", "e-1");

    expect(ApiClient.post).toHaveBeenCalledWith(
      "api/t-1/events/e-1/review/submissions"
    );
    expect(review).toEqual(REVIEW);
  });

  it("reads the current review of an event from the event's admin DTO", async () => {
    ApiClient.get.mockResolvedValue({
      data: { id: "e-1", information: { name: "Konzert" }, review: REVIEW },
    });

    const review = await ApiReviewService.getReview("t-1", "event", "e-1");

    expect(ApiClient.get).toHaveBeenCalledWith("api/t-1/events/e-1");
    expect(review).toEqual(REVIEW);
  });

  it("refuses an offer type the backend does not know", async () => {
    await expect(ApiReviewService.submit("t-1", "ticket", "x")).rejects.toThrow(
      /offer type/
    );
    expect(ApiClient.post).not.toHaveBeenCalled();
  });
});
