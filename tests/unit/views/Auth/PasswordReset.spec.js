import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { RouterLinkStub } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { forgotPassword: vi.fn(), resetPasswordWithToken: vi.fn() },
}));

import ApiAuthService from "@/services/api/ApiAuthService";
import PasswordReset from "@/views/Auth/PasswordReset.vue";

let toasts;
let push;

function mountReset(query = {}) {
  const store = new Vuex.Store({
    modules: {
      instance: { namespaced: true, getters: { instance: () => ({}) } },
      toasts: {
        namespaced: true,
        actions: { add: (context, toast) => toasts.push(toast) },
      },
    },
  });

  return mountComponent(PasswordReset, {
    store,
    stubs: { RouterLink: RouterLinkStub },
    mocks: { $router: { push }, $route: { query } },
  });
}

async function submit(wrapper) {
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

function linkError(status) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data: "Invalid or expired token" };
  return error;
}

beforeEach(() => {
  toasts = [];
  push = vi.fn();
  ApiAuthService.forgotPassword.mockReset();
  ApiAuthService.resetPasswordWithToken.mockReset();
});

describe("PasswordReset — without a link from the mail", () => {
  it("asks only for the address, not for a new password", () => {
    const wrapper = mountReset();

    expect(wrapper.find("input[name=email]").exists()).toBe(true);
    expect(wrapper.find("input[type=password]").exists()).toBe(false);
  });

  it("requests the mail with the link for the address", async () => {
    ApiAuthService.forgotPassword.mockResolvedValue({ status: 200 });
    const wrapper = mountReset();

    await wrapper.find("input[name=email]").setValue("erika@example.de");
    await submit(wrapper);

    expect(ApiAuthService.forgotPassword).toHaveBeenCalledWith(
      "erika@example.de"
    );
  });

  it("answers the same neutral sentence, whether an account exists or not", async () => {
    ApiAuthService.forgotPassword.mockResolvedValue({ status: 200 });
    const wrapper = mountReset();

    await wrapper.find("input[name=email]").setValue("erika@example.de");
    await submit(wrapper);

    expect(wrapper.text()).toContain(
      "Wenn zu dieser E-Mail-Adresse ein Konto besteht"
    );
    expect(wrapper.find("input[name=email]").exists()).toBe(false);
    expect(toasts).toEqual([]);
  });

  it("sends nothing without a valid address", async () => {
    const wrapper = mountReset();

    await wrapper.find("input[name=email]").setValue("erika");
    await submit(wrapper);

    expect(ApiAuthService.forgotPassword).not.toHaveBeenCalled();
  });

  it("names a failure of the server, and keeps the form", async () => {
    ApiAuthService.forgotPassword.mockRejectedValue(serverError());
    const wrapper = mountReset();

    await wrapper.find("input[name=email]").setValue("erika@example.de");
    await submit(wrapper);

    expect(toasts.map((t) => t.type)).toEqual(["error"]);
    expect(wrapper.find("input[name=email]").exists()).toBe(true);
  });
});

describe("PasswordReset — with the link from the mail", () => {
  const link = { token: "hook-1", id: "erika@example.de" };

  async function fillPasswords(wrapper, password, repeat) {
    await wrapper.find("input[name=new-password]").setValue(password);
    await wrapper.find("input[name=confirm-password]").setValue(repeat);
  }

  it("asks for the new password, not for the address", () => {
    const wrapper = mountReset(link);

    expect(wrapper.find("input[name=new-password]").exists()).toBe(true);
    expect(wrapper.find("input[name=email]").exists()).toBe(false);
    expect(wrapper.text()).toContain("erika@example.de");
  });

  it("sets the new password with token and address from the link, then opens the login", async () => {
    ApiAuthService.resetPasswordWithToken.mockResolvedValue({ status: 200 });
    const wrapper = mountReset(link);

    await fillPasswords(wrapper, "neu-2", "neu-2");
    await submit(wrapper);

    expect(ApiAuthService.resetPasswordWithToken).toHaveBeenCalledWith({
      token: "hook-1",
      id: "erika@example.de",
      password: "neu-2",
    });
    expect(toasts).toEqual([
      expect.objectContaining({ type: "success", title: "Passwort geändert" }),
    ]);
    expect(push).toHaveBeenCalledWith({ name: "login" });
  });

  it("sends nothing when the passwords differ", async () => {
    const wrapper = mountReset(link);

    await fillPasswords(wrapper, "neu-2", "neu-3");
    await submit(wrapper);

    expect(ApiAuthService.resetPasswordWithToken).not.toHaveBeenCalled();
    expect(toasts.map((t) => t.title)).toEqual([
      "Passwörter stimmen nicht überein",
    ]);
  });

  it.each([400, 410])(
    "says that the link no longer holds when the backend answers %i",
    async (status) => {
      ApiAuthService.resetPasswordWithToken.mockRejectedValue(
        linkError(status)
      );
      const wrapper = mountReset(link);

      await fillPasswords(wrapper, "neu-2", "neu-2");
      await submit(wrapper);

      expect(toasts).toEqual([
        expect.objectContaining({ type: "error", title: "Link ungültig" }),
      ]);
      expect(push).not.toHaveBeenCalled();
    }
  );

  it("asks for the address when the link lacks the address", () => {
    const wrapper = mountReset({ token: "hook-1" });

    expect(wrapper.find("input[name=email]").exists()).toBe(true);
    expect(wrapper.find("input[name=new-password]").exists()).toBe(false);
  });
});
