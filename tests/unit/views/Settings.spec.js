import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import ApiAuthService from "@/services/api/ApiAuthService";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { changePassword: vi.fn() },
}));
vi.mock("@/services/api/ApiUsersService", () => ({
  default: { updateMe: vi.fn() },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

import Settings from "@/views/Settings.vue";

let toasts;

function mountSettings() {
  const store = new Vuex.Store({
    modules: {
      loading: {
        namespaced: true,
        getters: { isLoading: () => () => false },
        actions: { start: vi.fn(), stop: vi.fn() },
      },
      user: {
        namespaced: true,
        getters: {
          isAuthorized: () => () => true,
          getUser: () => ({
            id: "erika@example.de",
            firstName: "Erika",
            lastName: "Muster",
            authType: "local",
          }),
        },
        actions: { update: vi.fn() },
      },
      toasts: {
        namespaced: true,
        actions: { add: (context, toast) => toasts.push(toast) },
      },
    },
  });
  return mountComponent(Settings, { store });
}

/** Opens the panel „Passwort ändern“ and fills its fields. */
async function fillPasswordForm(wrapper, { current, password, repeat }) {
  const header = wrapper
    .findAll(".v-expansion-panel-header")
    .filter((h) => h.text().includes("Passwort ändern"))
    .at(0);
  await header.trigger("click");
  await flushPromises();
  await wrapper.find("#current-password").setValue(current);
  await wrapper.find("#new-password").setValue(password);
  await wrapper.find("#confirm-password").setValue(repeat);
}

async function submit(wrapper) {
  const button = wrapper
    .findAll(".v-btn")
    .filter((b) => b.text() === "Passwort ändern")
    .at(0);
  await button.trigger("click");
  await flushPromises();
}

beforeEach(() => {
  toasts = [];
  ApiAuthService.changePassword.mockReset();
});

describe("Settings — the own password change", () => {
  it("asks for the current password and sends it with the new one", async () => {
    ApiAuthService.changePassword.mockResolvedValue({ status: 200 });
    const wrapper = mountSettings();

    await fillPasswordForm(wrapper, {
      current: "bisher-1",
      password: "neu-2",
      repeat: "neu-2",
    });
    await submit(wrapper);

    expect(ApiAuthService.changePassword).toHaveBeenCalledWith(
      "bisher-1",
      "neu-2"
    );
    expect(toasts.map((t) => t.type)).toEqual(["success"]);
  });

  it("sends nothing without the current password", async () => {
    const wrapper = mountSettings();

    await fillPasswordForm(wrapper, {
      current: "",
      password: "neu-2",
      repeat: "neu-2",
    });
    await submit(wrapper);

    expect(ApiAuthService.changePassword).not.toHaveBeenCalled();
  });

  it("says that the current password is wrong when the backend refuses it", async () => {
    const error = new Error("Request failed with status code 403");
    error.response = { status: 403, data: "Current password is wrong" };
    ApiAuthService.changePassword.mockRejectedValue(error);
    const wrapper = mountSettings();

    await fillPasswordForm(wrapper, {
      current: "geraten",
      password: "neu-2",
      repeat: "neu-2",
    });
    await submit(wrapper);

    expect(toasts).toEqual([
      expect.objectContaining({
        type: "error",
        title: "Bisheriges Passwort falsch",
      }),
    ]);
  });
});
