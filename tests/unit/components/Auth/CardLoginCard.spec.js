import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  addressBlacklistedError,
  flushPromises,
} from "@tests/unit/support/api";

const api = vi.hoisted(() => ({
  cardLogin: vi.fn(),
  cardSignup: vi.fn(),
}));

vi.mock("@/services/api/ApiAuthService", () => ({ default: api }));

import CardLoginCard from "@/components/Auth/CardLoginCard.vue";

const cardMethod = {
  id: "library-card",
  publicIdField: {},
  secretField: { label: "PIN" },
};

const addToast = vi.fn();

function mountCard() {
  const store = new Vuex.Store({
    modules: {
      instance: { namespaced: true, getters: { instance: () => ({}) } },
      toasts: { namespaced: true, actions: { add: addToast } },
      user: { namespaced: true, actions: { update: vi.fn() } },
    },
  });
  return mountComponent(CardLoginCard, {
    store,
    propsData: { cardMethod },
    mocks: { $router: { push: vi.fn() } },
  });
}

/** Signs in with a card no account has yet and sends its registration. */
async function registerCard() {
  const wrapper = mountCard();
  const [publicId, secret] = wrapper.findAll("input").wrappers;
  await publicId.setValue("4711");
  await secret.setValue("1234");
  await wrapper.find("form").trigger("submit");
  await flushPromises();
  await wrapper.find("form").trigger("submit");
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  addToast.mockClear();
  api.cardLogin.mockReset();
  api.cardLogin.mockResolvedValue({
    requiresRegistration: true,
    prefill: { email: "alex@example.org" },
  });
  api.cardSignup.mockReset();
});

/**
 * An address on the blacklist: `card/signup`
 * answers `409` with the checkout's refusal and the instance's mail address.
 * The card keeps the message instead of „bereits einem Account zugeordnet“.
 */
describe("CardLoginCard — an address on the blacklist", () => {
  it("keeps the message with the instance's mail address", async () => {
    api.cardSignup.mockRejectedValue(
      addressBlacklistedError("betrieb@example.test")
    );

    const wrapper = await registerCard();

    expect(api.cardSignup).toHaveBeenCalledTimes(1);
    const notice = wrapper.find("[data-test='address-blacklisted']");
    expect(notice.text()).toContain("Registrierung nicht möglich");
    expect(notice.text()).toContain(
      "Mit dieser E-Mail-Adresse ist keine Registrierung möglich."
    );
    expect(notice.find("a").attributes("href")).toBe(
      "mailto:betrieb@example.test"
    );
    expect(wrapper.text()).not.toContain("bereits einem Account zugeordnet");
    expect(addToast).not.toHaveBeenCalled();
  });

  it("names the operator of the offer without a mail address", async () => {
    api.cardSignup.mockRejectedValue(addressBlacklistedError(""));

    const wrapper = await registerCard();

    const notice = wrapper.find("[data-test='address-blacklisted']");
    expect(notice.text()).toContain("an den Betreiber dieses Angebots");
    expect(notice.find("a").exists()).toBe(false);
  });

  it("still names a card or address that has an account", async () => {
    const taken = new Error("Request failed with status code 409");
    taken.response = { status: 409, data: {} };
    api.cardSignup.mockRejectedValue(taken);

    const wrapper = await registerCard();

    expect(wrapper.find("[data-test='address-blacklisted']").exists()).toBe(
      false
    );
    expect(wrapper.text()).toContain("bereits einem Account zugeordnet");
  });
});
