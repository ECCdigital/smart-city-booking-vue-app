import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import CheckoutContactDetails from "@/views/BundleCheckout/CheckoutContactDetails.vue";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { logout: vi.fn() },
}));
vi.mock("@/components/Auth/LoginCard.vue", () => ({
  default: { name: "LoginCard", render: (h) => h("div", "LoginCard") },
}));

/**
 * ECCdigital/tickets#260: the public bookable no longer carries the list of
 * permitted persons (`permittedUsers`). The contact step reads a bookable as
 * restricted by its roles alone; a restriction to named persons is the
 * backend's to decide, at the permission check and at the booking.
 */
const LOGIN_HINT = "Sie können dieses Angebot nur buchen, wenn Sie angemeldet";
const SIGNED_IN = {
  id: "petra@example.org",
  firstName: "Petra",
  lastName: "Muster",
};

function mountStep(bookable, user = null) {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { data: user ? { user } : null },
        getters: { getUser: (state) => state.data?.user },
        actions: { delete: vi.fn() },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenant: () => ({ id: "t1" }) },
      },
      instance: {
        namespaced: true,
        getters: { instance: () => ({ applications: [] }) },
      },
    },
  });
  return mountComponent(CheckoutContactDetails, {
    store,
    propsData: {
      me: user,
      leadItem: {
        bookable: {
          id: "b1",
          title: "Werkstatt",
          attachments: [],
          requiredFields: [],
          ...bookable,
        },
      },
      contactDetails: {
        name: null,
        company: null,
        isBusiness: null,
        mail: null,
        phone: null,
        street: null,
        zipCode: null,
        location: null,
        comment: null,
      },
    },
  });
}

function guestButton(wrapper) {
  return wrapper
    .findAll("button")
    .filter((button) => button.text().includes("Als Gast fortfahren"));
}

describe("CheckoutContactDetails — restricted bookables", () => {
  it("asks a guest to sign in for a bookable restricted to roles", () => {
    const wrapper = mountStep({ permittedRoles: ["role-werkstatt"] });

    expect(wrapper.text()).toContain(LOGIN_HINT);
  });

  it("offers no switch to a guest for a bookable restricted to roles", () => {
    const wrapper = mountStep(
      { permittedRoles: ["role-werkstatt"] },
      SIGNED_IN
    );

    expect(guestButton(wrapper).length).toBe(0);
  });

  it("does not read a list of permitted persons an older backend still sends", () => {
    const wrapper = mountStep({
      permittedRoles: [],
      permittedUsers: ["jonas@example.org"],
    });

    expect(wrapper.text()).not.toContain(LOGIN_HINT);
  });

  it("reads a bookable without restricting roles as open", () => {
    const wrapper = mountStep({ permittedRoles: [] }, SIGNED_IN);

    expect(wrapper.text()).not.toContain(LOGIN_HINT);
    expect(guestButton(wrapper).length).toBe(1);
  });
});

/** Private or business booking: the checkbox at the end of the contact data. */
describe("CheckoutContactDetails — Geschäftliche Buchung", () => {
  function businessBox(wrapper) {
    return wrapper.find(".checkout-contact-details__business input");
  }

  it("follows the company until the booker sets it", async () => {
    const wrapper = mountStep({});
    expect(businessBox(wrapper).element.checked).toBe(false);

    wrapper.props("contactDetails").company = "ACME";
    await wrapper.vm.$nextTick();
    expect(businessBox(wrapper).element.checked).toBe(true);
    expect(wrapper.props("contactDetails").isBusiness).toBeNull();
  });

  it("keeps the booker's choice over the company", async () => {
    const wrapper = mountStep({});

    await businessBox(wrapper).trigger("click");
    expect(wrapper.props("contactDetails").isBusiness).toBe(true);

    wrapper.props("contactDetails").company = "";
    await wrapper.vm.$nextTick();
    expect(businessBox(wrapper).element.checked).toBe(true);
  });

  it("explains the choice in a tooltip on a help icon", () => {
    const wrapper = mountStep({});
    expect(wrapper.text()).toContain("Geschäftliche Buchung");
    expect(wrapper.find('[aria-label^="Für ein Unternehmen"]').exists()).toBe(
      true
    );
  });
});
