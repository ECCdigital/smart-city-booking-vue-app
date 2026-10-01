// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startBff, VALID_ACCESS_TOKEN } from "@tests/unit/support/bff";

const PATHS = {
  BFF_PUBLIC_PATH: "/admin/api",
  ADMIN_SPA_BASE_PATH: "/admin",
};

const SESSION = `access-token=${VALID_ACCESS_TOKEN}`;

let bff;

afterEach(async () => {
  await bff?.close();
  bff = null;
});

/** Headers the edge proxy adds for a browser at `origin`. */
function behindEdge(origin) {
  const { protocol, host } = new URL(origin);
  return {
    "X-Forwarded-Proto": protocol.replace(":", ""),
    "X-Forwarded-Host": host,
  };
}

function getAddresses({ origin = "https://booking.example.de", cookie } = {}) {
  return fetch(`${bff.url}/auth/sso/addresses`, {
    headers: { ...behindEdge(origin), ...(cookie ? { Cookie: cookie } : {}) },
  });
}

describe("GET /auth/sso/addresses", () => {
  it("answers 401 without a session", async () => {
    bff = await startBff(PATHS);

    const response = await getAddresses();

    expect(response.status).toBe(401);
  });

  it("answers 401 when the backend rejects the session", async () => {
    bff = await startBff(PATHS);

    const response = await getAddresses({ cookie: "access-token=forged" });

    expect(response.status).toBe(401);
  });

  it("names the Rücksprungadressen of every Adresse on the allowlist", async () => {
    bff = await startBff({
      ...PATHS,
      PUBLIC_ORIGIN: "https://booking.example.de",
      PUBLIC_ORIGINS: "https://booking.system.example.com",
    });

    const response = await getAddresses({ cookie: SESSION });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      allowlist: "active",
      addresses: [
        {
          origin: "https://booking.example.de",
          redirectUris: [
            "https://booking.example.de/admin/api/auth/sso/callback",
          ],
          postLogoutRedirectUris: [
            "https://booking.example.de/admin/login",
            "https://booking.example.de/admin/api/auth/sso/login*",
          ],
        },
        {
          origin: "https://booking.system.example.com",
          redirectUris: [
            "https://booking.system.example.com/admin/api/auth/sso/callback",
          ],
          postLogoutRedirectUris: [
            "https://booking.system.example.com/admin/login",
            "https://booking.system.example.com/admin/api/auth/sso/login*",
          ],
        },
      ],
    });
  });

  it("names only the request's own Adresse when the allowlist is empty", async () => {
    bff = await startBff(PATHS);

    const response = await getAddresses({
      origin: "http://localhost:8080",
      cookie: SESSION,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      allowlist: "empty",
      addresses: [
        {
          origin: "http://localhost:8080",
          redirectUris: ["http://localhost:8080/admin/api/auth/sso/callback"],
          postLogoutRedirectUris: [
            "http://localhost:8080/admin/login",
            "http://localhost:8080/admin/api/auth/sso/login*",
          ],
        },
      ],
    });
  });
});

describe.each([
  [
    "with an allowlist",
    {
      PUBLIC_ORIGIN:
        "https://booking.example.de,https://booking.system.example.com",
    },
    "https://booking.system.example.com",
  ],
  ["with an empty allowlist", {}, "http://localhost:8080"],
])("Rücksprungadressen in use, %s", (_label, allowlist, origin) => {
  beforeEach(async () => {
    bff = await startBff({ ...PATHS, ...allowlist });
  });

  async function listed() {
    const response = await getAddresses({ origin, cookie: SESSION });
    const { addresses } = await response.json();
    return addresses.find((address) => address.origin === origin);
  }

  function queryOf(url, name) {
    return new URL(url).searchParams.get(name);
  }

  it("lists the redirect_uri of the sign-in", async () => {
    const response = await fetch(`${bff.url}/auth/sso/login`, {
      headers: behindEdge(origin),
      redirect: "manual",
    });

    expect(response.status).toBe(302);
    const redirectUri = queryOf(
      response.headers.get("location"),
      "redirect_uri"
    );
    expect((await listed()).redirectUris).toContain(redirectUri);
  });

  it("lists the post_logout_redirect_uri of the sign-out", async () => {
    const response = await fetch(`${bff.url}/auth/logout`, {
      method: "POST",
      headers: {
        ...behindEdge(origin),
        Origin: origin,
        Cookie: `${SESSION}; refresh-token=refresh; auth-type=keycloak`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    const { idpLogoutUrl } = await response.json();
    const postLogoutRedirectUri = queryOf(
      idpLogoutUrl,
      "post_logout_redirect_uri"
    );
    expect((await listed()).postLogoutRedirectUris).toContain(
      postLogoutRedirectUri
    );
  });

  it("lists the post_logout_redirect_uri of „Benutzer wechseln“ under its `*` entry", async () => {
    const response = await fetch(
      `${bff.url}/auth/sso/change-user?redirect=${encodeURIComponent(
        "/admin/"
      )}`,
      { headers: behindEdge(origin), redirect: "manual" }
    );

    expect(response.status).toBe(302);
    const postLogoutRedirectUri = queryOf(
      response.headers.get("location"),
      "post_logout_redirect_uri"
    );
    const matching = (await listed()).postLogoutRedirectUris.filter(
      (entry) =>
        entry.endsWith("*") &&
        postLogoutRedirectUri.startsWith(entry.slice(0, -1))
    );
    expect(matching).toHaveLength(1);
  });
});
