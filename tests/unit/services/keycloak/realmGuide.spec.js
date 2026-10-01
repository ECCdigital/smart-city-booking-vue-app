import { describe, expect, it } from "vitest";
import { buildRealmGuide } from "@/services/keycloak/realmGuide";

/**
 * The Anleitung as data. The tab renders it; the text to copy
 * (ECCdigital/tickets#96) and the result of „Realm prüfen“
 * (ECCdigital/tickets#97) read the same model, so what they rely on is pinned
 * here. Everything the owner sees is pinned through the tab's spec.
 */
const ADMIN = {
  source: "direct",
  addresses: [
    {
      origin: "https://booking.example.de",
      redirectUris: ["https://booking.example.de/admin/login/sso"],
      postLogoutRedirectUris: ["https://booking.example.de/admin/login/sso*"],
    },
  ],
};

function keycloak(overrides = {}) {
  return {
    id: "keycloak",
    serverUrl: "https://sso.example.de",
    realm: "biletado",
    publicClient: "biletado-web",
    privateClient: "biletado-api",
    privateClientSecret: "s3cr3t-value",
    roleMapping: { active: true, roles: [{ keycloakRole: "raum" }] },
    ...overrides,
  };
}

function guide(app, portalUrl = "https://portal.example.de") {
  return buildRealmGuide({
    keycloakApp: app,
    portalUrl,
    mode: "direct",
    admin: ADMIN,
  });
}

describe("buildRealmGuide", () => {
  it("never carries the Client Secret", () => {
    const model = guide(keycloak());

    expect(JSON.stringify(model)).not.toContain("s3cr3t-value");
    expect(model.missing).toEqual([]);
    expect(model.complete).toBe(true);
  });

  it("names the missing values in the order of the form", () => {
    const model = guide({ id: "keycloak", privateClientSecret: " " });

    expect(model.missing).toEqual([
      "serverUrl",
      "realm",
      "webClient",
      "apiClient",
      "clientSecret",
    ]);
    expect(model.complete).toBe(false);
  });

  it("keys the steps in the order of the setup", () => {
    expect(guide(keycloak()).steps.map((step) => step.key)).toEqual([
      "realm",
      "webClient",
      "addresses",
      "audience",
      "apiClient",
      "roles",
      "portal",
    ]);
  });

  it("lists the Adressen per app, the Storefront's from the Portal-URL", () => {
    const addresses = guide(
      keycloak(),
      "https://portal.example.de/x"
    ).addresses;

    expect(
      addresses.map((address) => ({
        app: address.app,
        origin: address.origin.text,
        redirectUris: address.redirectUris.map((uri) => uri.text),
        postLogoutRedirectUris: address.postLogoutRedirectUris.map(
          (uri) => uri.text
        ),
      }))
    ).toEqual([
      {
        app: "adminUi",
        origin: "https://booking.example.de",
        redirectUris: ["https://booking.example.de/admin/login/sso"],
        postLogoutRedirectUris: ["https://booking.example.de/admin/login/sso*"],
      },
      {
        app: "storefront",
        origin: "https://portal.example.de",
        redirectUris: ["https://portal.example.de/api/auth/sso/callback"],
        postLogoutRedirectUris: [
          "https://portal.example.de/api/auth/sso/login*",
        ],
      },
    ]);
  });

  it("drops a trailing slash of the Keycloak-URL from the Issuer", () => {
    const model = guide(keycloak({ serverUrl: " https://sso.example.de/ " }));

    expect(model.values.issuer.text).toBe(
      "https://sso.example.de/realms/biletado"
    );
  });
});
