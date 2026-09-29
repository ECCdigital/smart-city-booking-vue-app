import { describe, expect, it } from "vitest";
import { reviewQueueLocation } from "@/utils/reviewQueueLink";

describe("reviewQueueLocation", () => {
  it.each([
    ["/rooms/edit?id=b-1", "/rooms/edit"],
    ["/resources/edit?id=b-1", "/resources/edit"],
    ["/tickets/edit?id=b-1", "/tickets/edit"],
    ["/event-locations/edit?id=b-1", "/event-locations/edit"],
  ])("opens the editor of the bookable's type (%s)", (adminPath, path) => {
    expect(
      reviewQueueLocation({ offerType: "bookable", offerId: "b-1", adminPath })
    ).toEqual({ path, query: { id: "b-1" } });
  });

  it("opens the event editor for an event", () => {
    expect(
      reviewQueueLocation({
        offerType: "event",
        offerId: "e-1",
        adminPath: "/events/edit?id=e-1",
      })
    ).toEqual({ path: "/events/edit", query: { id: "e-1" } });
  });

  it("opens the event editor even when the row carries no path", () => {
    expect(reviewQueueLocation({ offerType: "event", offerId: "e-1" })).toEqual(
      { path: "/events/edit", query: { id: "e-1" } }
    );
  });

  it("names the offer by its id, not by what the path carries", () => {
    expect(
      reviewQueueLocation({
        offerType: "bookable",
        offerId: "a b/ä",
        adminPath: "/rooms/edit?id=a%20b%2F%C3%A4",
      })
    ).toEqual({ path: "/rooms/edit", query: { id: "a b/ä" } });
  });

  it("has no link for a bookable of a type without an editor", () => {
    expect(
      reviewQueueLocation({
        offerType: "bookable",
        offerId: "b-1",
        adminPath: null,
      })
    ).toBeNull();
  });

  it.each([
    "https://evil.example/rooms/edit?id=b-1",
    "//evil.example/rooms/edit?id=b-1",
    "/instance/mandanten",
    "/events/edit?id=b-1",
  ])("follows no path outside the offer type's editors (%s)", (adminPath) => {
    expect(
      reviewQueueLocation({ offerType: "bookable", offerId: "b-1", adminPath })
    ).toBeNull();
  });

  it("has no link for a row without an offer id", () => {
    expect(
      reviewQueueLocation({ offerType: "event", adminPath: "/events/edit?id=" })
    ).toBeNull();
  });
});
