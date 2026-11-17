import { describe, expect, it } from "vitest";
import router from "@/router";

// The review queue (`adminPath` of an event row), „Verwendung“ in the media
// library and „Bearbeiten“ in the event list link an event as
// `/events/edit?id=<id>`: the event's editing page.
describe("router", () => {
  it.each([
    ["the path", "/events/edit?id=e-1"],
    ["the name", { name: "event-edit", query: { id: "e-1" } }],
  ])("opens an event linked by %s on its editing page", (_, location) => {
    const { route } = router.resolve(location);

    expect(route.name).toBe("event-edit");
    expect(route.path).toBe("/events/edit");
    expect(route.query).toEqual({ id: "e-1" });
    expect(route.matched).toHaveLength(1);
  });

  // vue-router keeps only the first route of a name and warns about the
  // second, so each name opens its own page (ECCdigital/tickets#317).
  it("gives every route a name of its own", () => {
    const names = router
      .getRoutes()
      .filter((record) => record.name)
      .map((record) => record.name);

    expect(names).toEqual([...new Set(names)]);
  });

  it.each([
    ["booking-request-reject", "/booking/request-reject/t-1"],
    ["booking-verify-reject", "/booking/verify-reject/t-1"],
  ])("resolves the route named %s to %s", (name, path) => {
    const { route } = router.resolve({ name, params: { tenantId: "t-1" } });

    expect(route.path).toBe(path);
  });
});
