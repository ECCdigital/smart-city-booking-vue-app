import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DirectAuthTransport from "@/services/auth/DirectAuthTransport";
import keycloakService from "@/services/KeycloakService";

vi.mock("@/services/KeycloakService", () => ({
  default: { getValidToken: vi.fn() },
}));

const originalLocation = window.location;
let navigations;

/** Puts the tab on the given in-app URL and records where it is sent. */
function locatedAt(pathname, search = "") {
  navigations = [];
  const location = {
    pathname,
    search,
    replace: (url) => navigations.push(url),
  };
  Object.defineProperty(location, "href", {
    get: () => `${pathname}${search}`,
    set: (url) => {
      navigations.push(url);
    },
  });
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: location,
  });
}

function unauthorized(url) {
  const error = new Error("Request failed with status code 401");
  error.config = { url, headers: {} };
  error.response = { status: 401, data: {} };
  return error;
}

/** Signed in with local tokens whose renewal fails. */
function localSessionWithDeadRefresh() {
  const transport = new DirectAuthTransport();
  transport.bindClient(vi.fn());
  transport.setTokens("expired-access", "expired-refresh");
  vi.spyOn(transport, "refresh").mockRejectedValue(new Error("refresh 401"));
  return transport;
}

/** Signed in through keycloak-js whose renewal fails. */
function keycloakSessionWithDeadRefresh() {
  const transport = new DirectAuthTransport();
  transport.bindClient(vi.fn());
  transport.setKeycloakAuth();
  keycloakService.getValidToken.mockRejectedValue(new Error("refresh failed"));
  return transport;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

/**
 * Direct mode ends a session whose renewal failed as BFF mode does
 * (ECCdigital/tickets#110): a public path such as the checkout only drops the
 * session and carries on anonymously, an internal page goes to the login with
 * itself as `next`, so the person lands back there after signing in.
 */
describe.each([
  ["local tokens", localSessionWithDeadRefresh],
  ["Keycloak", keycloakSessionWithDeadRefresh],
])(
  "DirectAuthTransport.onResponseError after a failed renewal (%s)",
  (_, signedIn) => {
    it("sends an internal page to the login with itself as next", async () => {
      locatedAt("/bookings/abc", "?tenant=t");
      const transport = signedIn();

      await expect(
        transport.onResponseError(unauthorized("api/t/bookings"))
      ).rejects.toThrow();

      expect(navigations).toEqual([
        "/login?next=%2Fbookings%2Fabc%3Ftenant%3Dt",
      ]);
      expect(transport.getAuthType()).toBeNull();
      expect(localStorage.getItem("authType")).toBeNull();
    });

    it("stays on the public checkout and drops the session", async () => {
      locatedAt("/checkout", "?id=room-1&tenant=t");
      const transport = signedIn();

      await expect(
        transport.onResponseError(unauthorized("auth/me"))
      ).rejects.toThrow();

      expect(navigations).toEqual([]);
      expect(transport.isAuthenticated()).toBe(false);
      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(localStorage.getItem("refreshToken")).toBeNull();
      expect(localStorage.getItem("authType")).toBeNull();
    });
  }
);
