import { describe, expect, it } from "vitest";
import router from "@/router";
import EventCreate from "@/views/Bookables/Events/EventCreate.vue";
import EventCreateInformation from "@/views/Bookables/Events/Form/Information.vue";

// The review queue (`adminPath` of an event row) and „Verwendung“ in the media
// library link an event as `/events/edit?id=<id>`. The editor's form and steps
// are child routes of `/events/create`, so the link has to land on one of
// them, as „Bearbeiten“ in the event list does (ECCdigital/tickets#275).
describe("router", () => {
  it.each([
    ["the path", "/events/edit?id=e-1"],
    ["the name", { name: "event-edit", query: { id: "e-1" } }],
  ])(
    "opens an event linked by %s in the editor's first step",
    (_, location) => {
      const { route } = router.resolve(location);

      expect(route.name).toBe("event-create-information");
      expect(route.query).toEqual({ id: "e-1" });
      expect(route.matched.map((record) => record.components.default)).toEqual([
        EventCreate,
        EventCreateInformation,
      ]);
    }
  );
});
