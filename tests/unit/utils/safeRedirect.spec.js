import { describe, expect, it } from "vitest";
import { isSafeInternalRedirect } from "@/utils/safeRedirect";

/** A router double that matches every path except the ones listed. */
function routerMatching(unmatched = []) {
  return {
    resolve: (path) => ({
      route: { matched: unmatched.includes(path) ? [] : [{}] },
    }),
  };
}

describe("isSafeInternalRedirect", () => {
  it("honours a relative in-app path with its query", () => {
    expect(
      isSafeInternalRedirect("/bookings/abc?tenant=t", routerMatching())
    ).toBe(true);
  });

  it("refuses anything that is not a string", () => {
    const router = routerMatching();
    expect(isSafeInternalRedirect(undefined, router)).toBe(false);
    expect(isSafeInternalRedirect(null, router)).toBe(false);
    expect(isSafeInternalRedirect(["/bookings"], router)).toBe(false);
  });

  it("refuses the bare root and the empty string", () => {
    const router = routerMatching();
    expect(isSafeInternalRedirect("", router)).toBe(false);
    expect(isSafeInternalRedirect("/", router)).toBe(false);
  });

  it("refuses an absolute or protocol-relative URL", () => {
    const router = routerMatching();
    expect(isSafeInternalRedirect("https://evil.example/", router)).toBe(false);
    expect(isSafeInternalRedirect("//evil.example/bookings", router)).toBe(
      false
    );
    expect(isSafeInternalRedirect("bookings", router)).toBe(false);
  });

  it("refuses a path with a backslash", () => {
    expect(isSafeInternalRedirect("/\\evil.example", routerMatching())).toBe(
      false
    );
  });

  it("refuses a path the router does not know", () => {
    expect(
      isSafeInternalRedirect("/nowhere", routerMatching(["/nowhere"]))
    ).toBe(false);
  });
});
