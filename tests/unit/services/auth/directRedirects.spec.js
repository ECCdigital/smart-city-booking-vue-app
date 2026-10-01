import { afterEach, describe, expect, it, vi } from "vitest";
import { directRedirects } from "@/services/auth/directRedirects";

/**
 * The Rücksprungadressen of the admin UI in direct mode. Sign-in, silent
 * check, sign-out and „Benutzer wechseln“ hand them to Keycloak, and the guide
 * in the tab „Single Sign-On“ lists them for the realm, so both read the same.
 */
const ORIGIN = "https://booking.example.de";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("directRedirects", () => {
  it("builds every Rücksprungadresse under the base path", () => {
    expect(directRedirects(ORIGIN, "/admin/")).toEqual({
      login: "https://booking.example.de/admin/login/sso",
      silentCheck: "https://booking.example.de/admin/silent-check-sso.html",
      logout: "https://booking.example.de/admin/",
      switchUser: "https://booking.example.de/admin/login/sso",
      keycloak: {
        origin: "https://booking.example.de",
        redirectUris: [
          "https://booking.example.de/admin/login/sso",
          "https://booking.example.de/admin/silent-check-sso.html",
        ],
        postLogoutRedirectUris: [
          "https://booking.example.de/admin/",
          "https://booking.example.de/admin/login/sso*",
        ],
      },
    });
  });

  it("builds them at the root when the admin UI has no base path", () => {
    expect(directRedirects(ORIGIN, "/").keycloak).toEqual({
      origin: "https://booking.example.de",
      redirectUris: [
        "https://booking.example.de/login/sso",
        "https://booking.example.de/silent-check-sso.html",
      ],
      postLogoutRedirectUris: [
        "https://booking.example.de/",
        "https://booking.example.de/login/sso*",
      ],
    });
  });

  it("takes the base path of the running app when none is given", () => {
    vi.stubEnv("BASE_URL", "/admin/");

    expect(directRedirects(ORIGIN).login).toBe(
      "https://booking.example.de/admin/login/sso"
    );
  });
});
