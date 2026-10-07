import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";

import Welcome from "@/views/Auth/Welcome.vue";

/**
 * After the registration the backend answers every address alike and mails
 * only an address that is not verified yet (ECCdigital/tickets#259): a new
 * one, or one registered without a verification. The page says so.
 */
describe("Welcome — the answer of the registration", () => {
  it("names the mail for an address that is not verified yet", () => {
    const store = new Vuex.Store({
      modules: {
        instance: { namespaced: true, getters: { instance: () => ({}) } },
      },
    });
    const wrapper = mountComponent(Welcome, {
      store,
      mocks: { $router: { push: vi.fn() } },
    });

    expect(wrapper.text()).toContain(
      "Falls die Adresse noch nicht bestätigt ist"
    );
  });
});
