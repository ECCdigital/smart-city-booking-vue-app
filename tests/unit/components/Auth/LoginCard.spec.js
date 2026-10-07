import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { RouterLinkStub } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { login: vi.fn(), resendVerification: vi.fn() },
}));

import ApiAuthService from "@/services/api/ApiAuthService";
import LoginCard from "@/components/Auth/LoginCard.vue";

const addToast = vi.fn();

function mountCard(query = {}, fullPath = "/login") {
  const store = new Vuex.Store({
    modules: {
      authStore: { namespaced: true, actions: { setNextUrl: vi.fn() } },
      toasts: { namespaced: true, actions: { add: addToast } },
      user: { namespaced: true, actions: { update: vi.fn() } },
    },
  });

  return mountComponent(LoginCard, {
    store,
    stubs: { RouterLink: RouterLinkStub },
    mocks: {
      $router: { push: vi.fn() },
      $route: { query, fullPath },
    },
  });
}

const registerLink = (wrapper) =>
  wrapper
    .findAllComponents(RouterLinkStub)
    .filter((link) => link.text() === "Hier registrieren")
    .at(0);

describe("LoginCard — the way to the registration", () => {
  it("hands the page that asked for the login on to the registration", () => {
    const wrapper = mountCard({ next: "/onboarding" });

    expect(registerLink(wrapper).props("to")).toEqual({
      name: "register",
      query: { next: "/onboarding" },
    });
  });

  it("opens the plain registration when nothing asked for the login", () => {
    const wrapper = mountCard();

    expect(registerLink(wrapper).props("to")).toEqual({ name: "register" });
  });
});

const refused = (status, data = {}, headers = {}) => ({
  response: { status, data, headers },
});
const notVerified = refused(403, { message: "User is not verified" });

const find = (wrapper, name) => wrapper.find(`[data-test="${name}"]`);

async function signIn(wrapper, id = "alex@example.org") {
  await wrapper.find("input[name='email']").setValue(id);
  await wrapper.find("input[name='password']").setValue("geheim-1234");
  await wrapper.vm.signin();
  await flushPromises();
}

async function resend(wrapper) {
  await find(wrapper, "verification-resend").trigger("click");
  await flushPromises();
}

beforeEach(() => {
  ApiAuthService.login.mockReset();
  ApiAuthService.resendVerification.mockReset();
  ApiAuthService.resendVerification.mockResolvedValue({ status: 202 });
  addToast.mockClear();
});

describe("LoginCard — an account that is not verified yet", () => {
  it("offers the verification mail again when the login refuses for it", async () => {
    ApiAuthService.login.mockRejectedValue(notVerified);
    const wrapper = mountCard();

    await signIn(wrapper);

    expect(find(wrapper, "verification-required").exists()).toBe(true);
    expect(find(wrapper, "verification-resend").text()).toBe(
      "Bestätigungs-E-Mail erneut senden"
    );
  });

  it("reads the refusal the BFF wraps as well", async () => {
    ApiAuthService.login.mockRejectedValue(
      refused(403, {
        success: false,
        message: "User is not verified",
        data: { message: "User is not verified" },
      })
    );
    const wrapper = mountCard();

    await signIn(wrapper);

    expect(find(wrapper, "verification-resend").exists()).toBe(true);
  });

  it("offers nothing for every other refusal", async () => {
    const wrapper = mountCard();
    for (const error of [
      refused(401, { message: "Invalid password" }),
      refused(404, { message: "User not found" }),
      refused(403, { message: "User is suspended" }),
      new Error("offline"),
    ]) {
      ApiAuthService.login.mockRejectedValueOnce(error);
      await signIn(wrapper);
      expect(find(wrapper, "verification-required").exists()).toBe(false);
    }
  });

  it("answers an unknown account like a wrong password", async () => {
    // Backend 4.3.1 refuses an unknown account, a wrong password and an SSO
    // account alike (ECCdigital/tickets#259).
    ApiAuthService.login.mockRejectedValueOnce(
      refused(401, { message: "Invalid email or password" })
    );
    const wrapper = mountCard();

    await signIn(wrapper);

    const toast = addToast.mock.calls.at(-1)[1];
    expect(toast.type).toBe("error");
    expect(toast.title).toBe("Falsche E-Mail/Passwort");
    expect(find(wrapper, "verification-required").exists()).toBe(false);
  });

  it("withdraws the offer with the next sign-in", async () => {
    ApiAuthService.login.mockRejectedValueOnce(notVerified);
    const wrapper = mountCard();
    await signIn(wrapper);

    ApiAuthService.login.mockRejectedValueOnce(refused(401));
    await signIn(wrapper);

    expect(find(wrapper, "verification-required").exists()).toBe(false);
  });

  it("sends the mail to the refused address and keeps the return target", async () => {
    ApiAuthService.login.mockRejectedValue(notVerified);
    const wrapper = mountCard({ next: "/onboarding" });
    await signIn(wrapper);
    await wrapper.find("input[name='email']").setValue("other@example.org");

    await resend(wrapper);

    expect(ApiAuthService.resendVerification).toHaveBeenCalledWith(
      "alex@example.org",
      "/onboarding"
    );
    expect(find(wrapper, "verification-sent").text()).toContain(
      "Falls Ihr Nutzerkonto noch nicht bestätigt ist"
    );
    expect(find(wrapper, "verification-resend").exists()).toBe(false);
  });

  it("leads back to the checkout the login is part of", async () => {
    ApiAuthService.login.mockRejectedValue(notVerified);
    const wrapper = mountCard({}, "/checkout?id=1");
    await signIn(wrapper);

    await resend(wrapper);

    expect(ApiAuthService.resendVerification).toHaveBeenCalledWith(
      "alex@example.org",
      "/checkout?id=1"
    );
  });

  it("names the wait of a hit limit", async () => {
    ApiAuthService.login.mockRejectedValue(notVerified);
    ApiAuthService.resendVerification.mockRejectedValue(
      refused(429, {}, { "retry-after": "90" })
    );
    const wrapper = mountCard();
    await signIn(wrapper);

    await resend(wrapper);

    expect(find(wrapper, "verification-failed").text()).toContain(
      "in 2 Min. möglich"
    );
    expect(find(wrapper, "verification-sent").exists()).toBe(false);
    expect(find(wrapper, "verification-resend").exists()).toBe(true);
  });

  it("asks to try later when the limit names no wait", async () => {
    ApiAuthService.login.mockRejectedValue(notVerified);
    ApiAuthService.resendVerification.mockRejectedValue(refused(429));
    const wrapper = mountCard();
    await signIn(wrapper);

    await resend(wrapper);

    expect(find(wrapper, "verification-failed").text()).toContain(
      "Bitte versuchen Sie es später erneut"
    );
  });

  it("says so when the mail could not be requested", async () => {
    ApiAuthService.login.mockRejectedValue(notVerified);
    ApiAuthService.resendVerification.mockRejectedValue(new Error("500"));
    const wrapper = mountCard();
    await signIn(wrapper);

    await resend(wrapper);

    expect(find(wrapper, "verification-failed").text()).toContain(
      "konnte nicht angefordert werden"
    );
  });
});
