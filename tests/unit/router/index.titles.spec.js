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
});
