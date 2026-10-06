import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { RouterLinkStub } from "@vue/test-utils";
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

const addToast = vi.fn();
const push = vi.fn(async () => {});

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
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });

  return mountComponent(Register, {
    store,
    stubs: { RouterLink: RouterLinkStub },
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

const loginLink = (wrapper) =>
  wrapper
    .findAllComponents(RouterLinkStub)
    .filter((link) => link.text() === "Anmelden")
    .at(0);

/** The toast the view showed last. */
const lastToast = () => addToast.mock.calls.at(-1)[1];

const refused = (status, data = {}, headers = {}) => ({
  response: { status, data, headers },
});

beforeEach(() => {
  ApiAuthService.register.mockReset();
  ApiAuthService.register.mockResolvedValue({ status: 201 });
  addToast.mockClear();
  push.mockClear();
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

    expect(loginLink(wrapper).props("to")).toEqual({
      name: "login",
      query: { next: "/onboarding" },
    });
  });

  it("opens the plain login when nothing asked for the account", async () => {
    const wrapper = mountRegister();
    await flushPromises();

    expect(loginLink(wrapper).props("to")).toEqual({ name: "login" });
  });
});

describe("Register — account-neutral answers", () => {
  it("promises a mail only for an address that is not registered yet", async () => {
    const wrapper = mountRegister();

    await register(wrapper);

    expect(push).toHaveBeenCalledWith("/welcome/");
    expect(lastToast().type).toBe("success");
    expect(lastToast().message).toContain(
      "Falls die Adresse noch nicht registriert ist"
    );
  });

  it("tells nothing about the address when a signup is refused", async () => {
    const messages = [];
    for (const status of [401, 409, 500]) {
      ApiAuthService.register.mockRejectedValueOnce(refused(status));
      await register(mountRegister());
      messages.push(lastToast().message);
    }

    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toContain("Registrierung fehlgeschlagen");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("Register — the signup limit", () => {
  it("names the wait of the Retry-After header", async () => {
    ApiAuthService.register.mockRejectedValue(
      refused(429, {}, { "retry-after": "1800" })
    );

    await register(mountRegister());

    expect(lastToast().type).toBe("error");
    expect(lastToast().message).toContain("in 30 Min. möglich");
    expect(push).not.toHaveBeenCalled();
  });

  it("names the wait of the envelope when the header is missing", async () => {
    ApiAuthService.register.mockRejectedValue(
      refused(429, {
        code: "too_many_requests",
        params: { retryAfterSeconds: 120 },
      })
    );

    await register(mountRegister());

    expect(lastToast().message).toContain("in 2 Min. möglich");
  });

  it("asks to try later when the answer names no wait", async () => {
    ApiAuthService.register.mockRejectedValue(refused(429));

    await register(mountRegister());

    expect(lastToast().message).toContain("später erneut");
    expect(lastToast().message).not.toContain("{wait}");
  });
});
