import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { register: vi.fn(async () => ({ status: 201 })) },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn(async () => ({ data: [] })) },
}));
vi.mock("@/components/ContactInformation.vue", () => ({
  default: { name: "ContactInformation", render: () => null },
}));

import ApiAuthService from "@/services/api/ApiAuthService";
import Register from "@/views/Auth/Register.vue";

/** The router knows every path except the ones listed. */
function mountRegister(next, unmatched = [], stored = null) {
  const store = new Vuex.Store({
    modules: {
      instance: { namespaced: true, getters: { instance: () => ({}) } },
      authStore: {
        namespaced: true,
        state: { nextUrl: stored },
        getters: { nextUrl: (state) => state.nextUrl },
        mutations: {
          SET_NEXT_URL(state, value) {
            state.nextUrl = value;
          },
        },
        actions: {
          setNextUrl: ({ commit }, value) => commit("SET_NEXT_URL", value),
        },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });

  return mountComponent(Register, {
    store,
    stubs: { RouterLink: true },
    mocks: {
      $router: {
        push: vi.fn(async () => {}),
        resolve: (path) => ({
          route: { matched: unmatched.includes(path) ? [] : [{}] },
        }),
      },
      $route: { query: next ? { next } : {} },
    },
  });
}

async function register(wrapper) {
  await wrapper.find("input[name='firstName']").setValue("Alex");
  await wrapper.find("input[name='lastName']").setValue("Beispiel");
  await wrapper.find("input[name='email']").setValue("alex@example.org");
  await wrapper.find("input[name='new-password']").setValue("geheim-1234");
  await wrapper.find("input[name='confirm-password']").setValue("geheim-1234");
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

/** The return target `ApiAuthService.register` was handed. */
const sentTarget = () => ApiAuthService.register.mock.calls[0][6];

const loginButton = (wrapper) =>
  wrapper
    .findAllComponents({ name: "v-btn" })
    .filter((button) => button.text() === "Konto vorhanden?")
    .at(0);

beforeEach(() => {
  ApiAuthService.register.mockClear();
});

describe("Register — the return target of the signup", () => {
  it("hands the page that asked for the account to the signup", async () => {
    const wrapper = mountRegister("/onboarding");

    await register(wrapper);

    expect(sentTarget()).toBe("/onboarding");
  });

  it("falls back on the target the login stored when the link names none", async () => {
    const wrapper = mountRegister(undefined, [], "/onboarding");

    await register(wrapper);

    expect(sentTarget()).toBe("/onboarding");
  });

  it("hands no off-site target to the signup", async () => {
    const wrapper = mountRegister("https://evil.example/");

    await register(wrapper);

    expect(ApiAuthService.register).toHaveBeenCalledTimes(1);
    expect(sentTarget()).toBeNull();
  });

  it("hands no path the router does not know to the signup", async () => {
    const wrapper = mountRegister("/nowhere", ["/nowhere"]);

    await register(wrapper);

    expect(sentTarget()).toBeNull();
  });
});

describe("Register — back to the login", () => {
  it("keeps the return target for someone who already has an account", async () => {
    const wrapper = mountRegister("/onboarding");
    await flushPromises();

    expect(loginButton(wrapper).props("to")).toEqual({
      name: "login",
      query: { next: "/onboarding" },
    });
  });

  it("opens the plain login when nothing asked for the account", async () => {
    const wrapper = mountRegister();
    await flushPromises();

    expect(loginButton(wrapper).props("to")).toEqual({ name: "login" });
  });
});
