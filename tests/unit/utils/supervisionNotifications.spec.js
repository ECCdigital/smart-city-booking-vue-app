import { describe, expect, it } from "vitest";
import {
  notificationOfferTitles,
  notificationTenantName,
} from "@/utils/supervisionNotifications";

describe("notificationOfferTitles", () => {
  it("names every offer of a joint review queue notice", () => {
    const row = {
      type: "review.queueEntered",
      payload: {
        offers: [
          { offerType: "bookable", offerId: "b-1", title: "Turnhalle" },
          { offerType: "event", offerId: "e-1", title: "Sommerfest" },
        ],
      },
    };

    expect(notificationOfferTitles(row)).toEqual(["Turnhalle", "Sommerfest"]);
  });

  it("names the one offer of a review decision", () => {
    const row = {
      type: "review.decided",
      payload: { offerId: "b-1", title: "Turnhalle" },
    };

    expect(notificationOfferTitles(row)).toEqual(["Turnhalle"]);
  });

  it("falls back to the id of an offer without a title", () => {
    const row = {
      type: "review.queueEntered",
      payload: { offers: [{ offerId: "b-7", title: null }] },
    };

    expect(notificationOfferTitles(row)).toEqual(["b-7"]);
  });

  it("names no offer for a notice about the tenant itself", () => {
    expect(
      notificationOfferTitles({ type: "tenant.levelChanged", payload: {} })
    ).toEqual([]);
    expect(notificationOfferTitles({ type: "tenant.selfCreated" })).toEqual([]);
  });
});

describe("notificationTenantName", () => {
  it("prefers the name recorded with the occasion over the id", () => {
    expect(
      notificationTenantName({
        tenantId: "t-1",
        payload: { tenantName: "Sportverein" },
      })
    ).toBe("Sportverein");
    expect(notificationTenantName({ tenantId: "t-1", payload: {} })).toBe(
      "t-1"
    );
  });
});
