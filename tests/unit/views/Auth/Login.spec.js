import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: {
    getCardAuthMethods: vi.fn(async () => []),
    me: vi.fn(),
  },
}));
vi.mock("@/services/auth/authMode", () => ({ isBffAuthMode: () => false }));
vi.mock("@/components/ContactInformation.vue", () => ({
  default: { name: "ContactInformation", render: () => null },
}));
vi.mock("@/components/Auth/LoginCard.vue", () => ({
  default: {
    name: "LoginCard",
    render(h) {
      return h("button", {
        attrs: { "data-test": "sign-in" },
        on: { click: () => this.$emit("success") },
      });
    },
  },
}));

import Login from "@/views/Auth/Login.vue";

let push;
let nextUrl;
let setNextUrl;

/** The router knows every path except the ones listed. */
function mountLogin(next, unmatched = []) {
  const store = new Vuex.Store({
    modules: {
      instance: { namespaced: true, getters: { instance: () => ({}) } },
      authStore: {
        namespaced: true,
        state: { nextUrl: null },
        getters: { nextUrl: () => nextUrl },
        actions: {
          setNextUrl: (context, value) => {
            setNextUrl(value);
            nextUrl = value;
          },
        },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
      user: { namespaced: true, actions: { update: vi.fn() } },
      tenants: { namespaced: true, actions: { update: vi.fn() } },
    },
  });

  return mountComponent(Login, {
    store,
    mocks: {
      $router: {
        push,
        resolve: (path) => ({
          route: { matched: unmatched.includes(path) ? [] : [{}] },
        }),
      },
      $route: { query: next ? { next } : {} },
    },
  });
}

async function signIn(wrapper) {
  await flushPromises();
  await wrapper.find("[data-test='sign-in']").trigger("click");
  await flushPromises();
}

beforeEach(() => {
  push = vi.fn();
  nextUrl = null;
  setNextUrl = vi.fn();
});

describe("Login — where sign-in leads", () => {
  it("returns to the page that asked for the login, query included", async () => {
    const wrapper = mountLogin("/bookings/abc?tenant=t");

    await signIn(wrapper);

    expect(push).toHaveBeenCalledWith("/bookings/abc?tenant=t");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });

  it("opens the dashboard when nothing asked for the login", async () => {
    const wrapper = mountLogin(undefined);

    await signIn(wrapper);

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
  });

  it("refuses an off-site target and opens the dashboard instead", async () => {
    const wrapper = mountLogin("https://evil.example/");

    await signIn(wrapper);

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
    expect(push).not.toHaveBeenCalledWith("https://evil.example/");
    expect(setNextUrl).toHaveBeenLastCalledWith(null);
  });

  it("refuses a path the router does not know", async () => {
    const wrapper = mountLogin("/nowhere", ["/nowhere"]);

    await signIn(wrapper);

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
    expect(push).not.toHaveBeenCalledWith("/nowhere");
  });
});
