import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";

import EmailVerify from "@/views/Auth/EmailVerify.vue";

let push;

/** The router knows every path except the ones listed. */
function mountVerify(next, unmatched = []) {
  const store = new Vuex.Store({
    modules: {
      instance: { namespaced: true, getters: { instance: () => ({}) } },
    },
  });

  return mountComponent(EmailVerify, {
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

const toLogin = (wrapper) => wrapper.find("button").trigger("click");

beforeEach(() => {
  push = vi.fn();
});

describe("EmailVerify — on to the login", () => {
  it("carries the signup's return target to the login", async () => {
    const wrapper = mountVerify("/onboarding");

    await toLogin(wrapper);

    expect(push).toHaveBeenCalledWith({
      name: "login",
      query: { next: "/onboarding" },
    });
  });

  it("opens the plain login when the signup named no target", async () => {
    const wrapper = mountVerify();

    await toLogin(wrapper);

    expect(push).toHaveBeenCalledWith({ name: "login" });
  });

  it("drops an off-site target", async () => {
    const wrapper = mountVerify("https://evil.example/");

    await toLogin(wrapper);

    expect(push).toHaveBeenCalledWith({ name: "login" });
  });

  it("drops a path the router does not know", async () => {
    const wrapper = mountVerify("/nowhere", ["/nowhere"]);

    await toLogin(wrapper);

    expect(push).toHaveBeenCalledWith({ name: "login" });
  });
});
