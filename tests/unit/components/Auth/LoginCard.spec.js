import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiAuthService", () => ({ default: {} }));

import LoginCard from "@/components/Auth/LoginCard.vue";

function mountCard(query = {}) {
  const store = new Vuex.Store({
    modules: {
      authStore: { namespaced: true, actions: { setNextUrl: vi.fn() } },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
      user: { namespaced: true, actions: { update: vi.fn() } },
    },
  });

  return mountComponent(LoginCard, {
    store,
    stubs: { RouterLink: true },
    mocks: {
      $router: { push: vi.fn() },
      $route: { query, fullPath: "/login" },
    },
  });
}

const registerButton = (wrapper) =>
  wrapper
    .findAllComponents({ name: "v-btn" })
    .filter((button) => button.text() === "Konto erstellen")
    .at(0);

describe("LoginCard — the way to the registration", () => {
  it("hands the page that asked for the login on to the registration", () => {
    const wrapper = mountCard({ next: "/onboarding" });

    expect(registerButton(wrapper).props("to")).toEqual({
      name: "register",
      query: { next: "/onboarding" },
    });
  });

  it("opens the plain registration when nothing asked for the login", () => {
    const wrapper = mountCard();

    expect(registerButton(wrapper).props("to")).toEqual({ name: "register" });
  });
});
