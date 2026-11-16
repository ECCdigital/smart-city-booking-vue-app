import { describe, expect, it } from "vitest";
import router from "@/router";

/** The browser-tab title the router sets for `path`, without the app name. */
function tabTitle(path) {
  return router.resolve(path).route.meta.title;
}

describe("router titles", () => {
  it("names the editor under „Geräte & Weiteres“ as its heading does", () => {
    expect(tabTitle("/resources/edit?id=res-1")).toBe("Objekt bearbeiten");
  });

  // Story 126 of ECCdigital/tickets#1082: „Zugangspunkt“ is the one word
  // for doors, Schließfachanlagen and fixed Fächer, the page's name too.
  it("names the page of the access points „Zugangspunkte“", () => {
    expect(tabTitle("/tenant/access-points")).toBe("Zugangspunkte");
  });
});
