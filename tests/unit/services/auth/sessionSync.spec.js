import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { clearTokens: vi.fn() },
}));
vi.mock("@/store/index", () => ({
  default: { dispatch: vi.fn(async () => {}) },
}));

let replace;

/** Puts the tab on the given in-app URL before the session ends. */
function locatedAt(pathname, search = "") {
  replace = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { pathname, search, replace },
  });
}

/**
 * `endAdminSession` debounces itself for two seconds, so every test gets a
 * fresh module instance.
 */
async function endAdminSession(options) {
  vi.resetModules();
  const sessionSync = await import("@/services/auth/sessionSync");
  return sessionSync.endAdminSession(options);
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("endAdminSession — where the login sends the user afterwards", () => {
  it("returns to the page the session ended on, query included", async () => {
    locatedAt("/bookings/abc", "?tenant=t");

    await endAdminSession({ redirect: true });

    expect(replace).toHaveBeenCalledWith(
      "/login?next=%2Fbookings%2Fabc%3Ftenant%3Dt"
    );
  });

  it("returns to a page without a query as it is", async () => {
    locatedAt("/bookings");

    await endAdminSession({ redirect: true });

    expect(replace).toHaveBeenCalledWith("/login?next=%2Fbookings");
  });

  it("prefers the page the caller names over the address bar", async () => {
    // Inside a navigation guard the address bar still shows the route the
    // user came from; the middleware hands over where they were going.
    locatedAt("/bookings");

    await endAdminSession({ redirect: true, next: "/bookings/abc?tenant=t" });

    expect(replace).toHaveBeenCalledWith(
      "/login?next=%2Fbookings%2Fabc%3Ftenant%3Dt"
    );
  });

  it("stays put on the login page itself", async () => {
    locatedAt("/login", "?next=%2Fbookings");

    await endAdminSession({ redirect: true });

    expect(replace).not.toHaveBeenCalled();
  });

  it("stays put on another public auth path", async () => {
    locatedAt("/auth/invitation/xyz");

    await endAdminSession({ redirect: true });

    expect(replace).not.toHaveBeenCalled();
  });

  it("does not redirect when asked not to", async () => {
    locatedAt("/bookings/abc", "?tenant=t");

    await endAdminSession({ redirect: false });

    expect(replace).not.toHaveBeenCalled();
  });
});
