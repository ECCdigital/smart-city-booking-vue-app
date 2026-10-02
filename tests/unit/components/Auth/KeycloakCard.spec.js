import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

const api = vi.hoisted(() => ({
  getPendingSsoUser: vi.fn(async () => ({ email: "a@b.de", name: "A B" })),
  ssoLogin: vi.fn(async () => ({ user: {}, permissions: {} })),
  startSsoLogin: vi.fn(),
  changeSsoUser: vi.fn(),
}));
const mode = vi.hoisted(() => ({ bff: true }));
/** keycloak-js after the identity provider has answered (direct transport). */
const keycloak = vi.hoisted(() => ({
  setConfig: vi.fn(),
  login: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
  getValidToken: vi.fn(async () => "kc-token"),
  isAuthenticated: true,
  tokenParsed: { email: "a@b.de", given_name: "A", family_name: "B" },
}));

/** The BFF has led back from the identity provider; the user is known. */
const CONFIRM_STEP = { flow: "confirm", ticket: "ticket-1" };

/** The admin UI is served under a base path, as in production. */
const BASE = "/admin";

vi.mock("@/services/api/ApiAuthService", () => ({ default: api }));
vi.mock("@/services/auth/authMode", () => ({ isBffAuthMode: () => mode.bff }));
vi.mock("@/services/KeycloakService", () => ({ default: keycloak }));

import KeycloakCard from "@/components/Auth/KeycloakCard.vue";

let push;
let nextUrl;
let setNextUrl;

/**
 * Mounts the card on the BFF confirm step (the IdP has answered, the user is
 * known). The router knows every path except the ones listed.
 */
function mountCard(unmatched = [], query = CONFIRM_STEP) {
  const store = new Vuex.Store({
    modules: {
      instance: {
        namespaced: true,
        getters: { instance: () => ({ applications: [{ id: "keycloak" }] }) },
      },
      authStore: {
        namespaced: true,
        actions: {
          getNextUrl: () => nextUrl,
          setNextUrl: (context, value) => {
            setNextUrl(value);
            nextUrl = value;
          },
        },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
      user: { namespaced: true, actions: { update: vi.fn() } },
    },
  });

  return mountComponent(KeycloakCard, {
    store,
    mocks: {
      $router: {
        push,
        resolve: (path) => ({
          href: `${BASE}${path}`,
          route: { matched: unmatched.includes(path) ? [] : [{}] },
        }),
      },
      $route: { query },
    },
  });
}

function buttonLabelled(wrapper, label) {
  return wrapper
    .findAll("button")
    .filter((b) => b.text() === label)
    .at(0);
}

async function click(wrapper, label) {
  await flushPromises();
  await buttonLabelled(wrapper, label).trigger("click");
  await flushPromises();
}

beforeEach(() => {
  vi.stubEnv("BASE_URL", `${BASE}/`);
  push = vi.fn();
  nextUrl = null;
  setNextUrl = vi.fn();
  mode.bff = true;
  api.startSsoLogin.mockClear();
  api.ssoLogin.mockClear();
  api.changeSsoUser.mockClear();
  keycloak.login.mockClear();
  keycloak.logout.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("KeycloakCard — the return target on the way to the identity provider", () => {
  it("hands the page that asked for the login to the BFF", async () => {
    nextUrl = "/onboarding";
    mountCard([], {});
    await flushPromises();

    expect(api.startSsoLogin).toHaveBeenCalledWith("/admin/onboarding");
  });

  it("hands the BFF no off-site target", async () => {
    nextUrl = "https://evil.example/";
    mountCard([], {});
    await flushPromises();

    expect(api.startSsoLogin).toHaveBeenCalledTimes(1);
    expect(api.startSsoLogin).not.toHaveBeenCalledWith("https://evil.example/");
  });

  it("hands the BFF no path the router does not know", async () => {
    nextUrl = "/nowhere";
    mountCard(["/nowhere"], {});
    await flushPromises();

    expect(api.startSsoLogin).toHaveBeenCalledTimes(1);
    expect(api.startSsoLogin).not.toHaveBeenCalledWith("/nowhere");
  });
});

describe("KeycloakCard — where sign-in leads when the BFF hands the target back", () => {
  it("stays in the admin UI", async () => {
    const location = { href: "" };
    vi.stubGlobal("location", location);
    nextUrl = "/dashboard";
    mountCard([], {});
    await flushPromises();
    const [handedToBff] = api.startSsoLogin.mock.calls[0];
    api.ssoLogin.mockResolvedValueOnce({
      user: {},
      permissions: {},
      redirect: handedToBff,
    });
    const wrapper = mountCard();

    await click(wrapper, "Anmelden");

    expect(location.href).toBe("/admin/dashboard");
  });
});

describe("KeycloakCard — the return target when the user is switched", () => {
  it("hands the BFF the page that asked for the login", async () => {
    nextUrl = "/bookings";
    const wrapper = mountCard();

    await click(wrapper, "Benutzer wechseln");

    expect(api.changeSsoUser).toHaveBeenCalledWith(
      "/admin/bookings",
      "ticket-1"
    );
  });

  it("hands the BFF the start page when nothing asked for the login", async () => {
    const wrapper = mountCard();

    await click(wrapper, "Benutzer wechseln");

    expect(api.changeSsoUser).toHaveBeenCalledWith("/admin/", "ticket-1");
  });

  it("hands the BFF no off-site target", async () => {
    nextUrl = "https://evil.example/";
    const wrapper = mountCard();

    await click(wrapper, "Benutzer wechseln");

    expect(api.changeSsoUser).toHaveBeenCalledWith("/admin/", "ticket-1");
  });
});

describe("KeycloakCard — where sign-in leads on the direct transport", () => {
  it("returns to the page that asked for the login", async () => {
    mode.bff = false;
    nextUrl = "/onboarding";
    const wrapper = mountCard([], {});

    await click(wrapper, "Anmelden");

    expect(api.ssoLogin).toHaveBeenCalledWith("kc-token");
    expect(push).toHaveBeenCalledWith("/onboarding");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });

  it("refuses an off-site target and opens the dashboard instead", async () => {
    mode.bff = false;
    nextUrl = "https://evil.example/";
    const wrapper = mountCard([], {});

    await click(wrapper, "Anmelden");

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
  });
});

describe("KeycloakCard — the Rücksprungadressen on the direct transport", () => {
  /** The card is opened again with whatever the address bar carries. */
  function openedAt(href) {
    vi.stubGlobal("location", { origin: "https://booking.example.de", href });
  }

  it("signs in to the SSO sign-in page, never to the current address", async () => {
    mode.bff = false;
    openedAt("https://booking.example.de/admin/login/sso?code=c&state=s");
    mountCard([], {});
    await flushPromises();

    expect(keycloak.login).toHaveBeenCalledWith(
      "https://booking.example.de/admin/login/sso"
    );
  });

  it("switches the user over the SSO sign-in page, never the current address", async () => {
    mode.bff = false;
    openedAt("https://booking.example.de/admin/login/sso?code=c&state=s");
    const wrapper = mountCard([], {});

    await click(wrapper, "Benutzer wechseln");

    expect(keycloak.logout).toHaveBeenCalledTimes(1);
    expect(keycloak.logout).toHaveBeenCalledWith(
      "https://booking.example.de/admin/login/sso"
    );
  });
});

describe("KeycloakCard — where sign-in leads", () => {
  it("returns to the page that asked for the login, query included", async () => {
    nextUrl = "/bookings/abc?tenant=t";
    const wrapper = mountCard();

    await click(wrapper, "Anmelden");

    expect(push).toHaveBeenCalledWith("/bookings/abc?tenant=t");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });

  it("opens the dashboard when nothing asked for the login", async () => {
    const wrapper = mountCard();

    await click(wrapper, "Anmelden");

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
  });

  it("refuses an off-site target and opens the dashboard instead", async () => {
    nextUrl = "https://evil.example/";
    const wrapper = mountCard();

    await click(wrapper, "Anmelden");

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
    expect(push).not.toHaveBeenCalledWith("https://evil.example/");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });

  it("refuses a path the router does not know", async () => {
    nextUrl = "/nowhere";
    const wrapper = mountCard(["/nowhere"]);

    await click(wrapper, "Anmelden");

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
    expect(push).not.toHaveBeenCalledWith("/nowhere");
  });
});

describe("KeycloakCard — where the back button leads", () => {
  it("returns to the page that asked for the login", async () => {
    nextUrl = "/bookings/abc?tenant=t";
    const wrapper = mountCard();

    await click(wrapper, "Zurück");

    expect(push).toHaveBeenCalledWith("/bookings/abc?tenant=t");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });

  it("goes back to the login when nothing asked for it", async () => {
    const wrapper = mountCard();

    await click(wrapper, "Zurück");

    expect(push).toHaveBeenCalledWith({ name: "login" });
  });

  it("refuses an off-site target and goes back to the login instead", async () => {
    nextUrl = "//evil.example/";
    const wrapper = mountCard();

    await click(wrapper, "Zurück");

    expect(push).toHaveBeenCalledWith({ name: "login" });
    expect(push).not.toHaveBeenCalledWith("//evil.example/");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });
});
