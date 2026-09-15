import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

const api = vi.hoisted(() => ({
  getPendingSsoUser: vi.fn(async () => ({ email: "a@b.de", name: "A B" })),
  ssoLogin: vi.fn(async () => ({ user: {}, permissions: {} })),
  startSsoLogin: vi.fn(),
}));

vi.mock("@/services/api/ApiAuthService", () => ({ default: api }));
vi.mock("@/services/auth/authMode", () => ({ isBffAuthMode: () => true }));
vi.mock("@/services/KeycloakService", () => ({ default: {} }));

import KeycloakCard from "@/components/Auth/KeycloakCard.vue";

let push;
let nextUrl;
let setNextUrl;

/**
 * Mounts the card on the BFF confirm step (the IdP has answered, the user is
 * known). The router knows every path except the ones listed.
 */
function mountCard(unmatched = []) {
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
          route: { matched: unmatched.includes(path) ? [] : [{}] },
        }),
      },
      $route: { query: { flow: "confirm", ticket: "ticket-1" } },
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
  push = vi.fn();
  nextUrl = null;
  setNextUrl = vi.fn();
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

    await click(wrapper, "zurück");

    expect(push).toHaveBeenCalledWith("/bookings/abc?tenant=t");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });

  it("goes back to the login when nothing asked for it", async () => {
    const wrapper = mountCard();

    await click(wrapper, "zurück");

    expect(push).toHaveBeenCalledWith({ name: "login" });
  });

  it("refuses an off-site target and goes back to the login instead", async () => {
    nextUrl = "//evil.example/";
    const wrapper = mountCard();

    await click(wrapper, "zurück");

    expect(push).toHaveBeenCalledWith({ name: "login" });
    expect(push).not.toHaveBeenCalledWith("//evil.example/");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });
});
