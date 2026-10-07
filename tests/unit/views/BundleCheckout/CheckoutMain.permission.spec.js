import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";
import ApiAuthService from "@/services/api/ApiAuthService";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import CheckoutMain from "@/views/BundleCheckout/CheckoutMain.vue";

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { me: vi.fn(), logout: vi.fn() },
}));
vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { getCheckoutPermissions: vi.fn(), validateCheckoutItem: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getPublicBookable: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenantActivePaymentApps: vi.fn(async () => ({ data: [] })),
    getTenant: vi.fn(async () => ({ data: { id: "t1" } })),
  },
}));
vi.mock("@/services/api/ApiCouponService", () => ({ default: {} }));
vi.mock("@/services/api/ApiRolesService", () => ({ default: {} }));
vi.mock("@/components/Auth/LoginCard.vue", () => ({
  default: { name: "LoginCard", render: (h) => h("div", "LoginCard") },
}));
vi.mock("@/views/BundleCheckout/CheckoutQuickSummary.vue", () => ({
  default: { name: "CheckoutQuickSummary", render: (h) => h("div") },
}));
vi.mock("@/views/BundleCheckout/CheckoutContactDetails.vue", () => ({
  default: {
    name: "CheckoutContactDetails",
    render: (h) => h("div", "Kontaktdaten-Formular"),
  },
}));

/**
 * ECCdigital/tickets#111: a permission check that passes after one that was
 * refused. The customer opens the checkout of a restricted bookable with an
 * account that may not book it (403), clicks „Mit einem anderen Konto
 * anmelden“ and signs in with one that may. The second check passes, yet the
 * checkout kept the refusal: the stepper showed „Berechtigung“ as an error
 * and step 1 still said the offer was not bookable.
 */
const FIRST = { id: "petra@example.org", firstName: "Petra" };
const SECOND = { id: "jonas@example.org", firstName: "Jonas" };

const NOT_BOOKABLE = "Dieses Angebot ist für Sie nicht buchbar";

const BOOKABLE = {
  id: "b1",
  title: "Werkstatt",
  requiresLogin: false,
  permittedRoles: ["role-werkstatt"],
  priceType: "per-item",
};

function createStore() {
  return new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { data: { user: FIRST } },
        getters: { getUser: (state) => state.data?.user },
        actions: { delete: vi.fn() },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenant: () => ({ id: "t1" }) },
        actions: { update: vi.fn() },
      },
      instance: {
        namespaced: true,
        getters: { instance: () => ({ applications: [] }) },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
}

async function mountCheckout() {
  const wrapper = mountComponent(CheckoutMain, {
    store: createStore(),
    mocks: {
      $route: { query: { tenant: "t1", id: "b1" } },
      $router: { push: vi.fn() },
    },
  });
  await flushPromises();
  return wrapper;
}

/** „Mit einem anderen Konto anmelden“ on the step „Berechtigung“. */
async function signInAnew(wrapper) {
  const button = wrapper
    .findAll("button")
    .filter((b) => b.text().includes("Mit einem anderen Konto anmelden"))
    .at(0);
  await button.trigger("click");
}

function stepperHeader(wrapper) {
  const header = wrapper.find(".v-stepper__header");
  return header.exists() ? header.text() : "";
}

describe("CheckoutMain — a permission check that passes after a refusal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });
    ApiCheckoutService.validateCheckoutItem.mockResolvedValue({
      status: 200,
      data: {},
    });
    ApiAuthService.logout.mockResolvedValue({ status: 200 });
  });

  async function refusedThenSignedInAnew(refusal) {
    ApiAuthService.me
      .mockResolvedValueOnce({ data: { user: FIRST } })
      .mockResolvedValue({ data: { user: SECOND } });
    ApiCheckoutService.getCheckoutPermissions
      .mockRejectedValueOnce(refusal)
      .mockResolvedValue({});

    const wrapper = await mountCheckout();
    expect(wrapper.text()).toContain(NOT_BOOKABLE);

    await signInAnew(wrapper);
    await flushPromises();

    expect(ApiCheckoutService.getCheckoutPermissions).toHaveBeenCalledTimes(2);
    return wrapper;
  }

  it("drops „Berechtigung“ from the stepper after a 403", async () => {
    const wrapper = await refusedThenSignedInAnew(forbiddenError());

    expect(stepperHeader(wrapper)).toContain("Kontaktdaten");
    expect(stepperHeader(wrapper)).not.toContain("Berechtigung");
    expect(wrapper.text()).not.toContain(NOT_BOOKABLE);
  });

  it("drops it after a 404 too, which 4.3.x answers for a bookable out of reach", async () => {
    const notFound = new Error("Request failed with status code 404");
    notFound.response = { status: 404, data: {} };

    const wrapper = await refusedThenSignedInAnew(notFound);

    expect(stepperHeader(wrapper)).not.toContain("Berechtigung");
    expect(wrapper.text()).not.toContain(NOT_BOOKABLE);
  });

  it("keeps the refusal while the check keeps refusing", async () => {
    ApiAuthService.me.mockResolvedValue({ data: { user: FIRST } });
    ApiCheckoutService.getCheckoutPermissions.mockRejectedValue(
      forbiddenError()
    );

    const wrapper = await mountCheckout();
    await signInAnew(wrapper);
    await flushPromises();

    expect(wrapper.text()).toContain(NOT_BOOKABLE);
  });
});

/**
 * ECCdigital/tickets#260: the public bookable no longer carries the list of
 * permitted persons (`permittedUsers`). Whether a person may book is the
 * backend's decision - the permission check and the booking itself - not
 * the checkout's reading of that list.
 */
describe("CheckoutMain — the permission is the backend's, not the list of permitted persons", () => {
  const NAMED_PERSONS_ONLY = {
    ...BOOKABLE,
    permittedRoles: [],
  };

  function unauthorized() {
    const error = new Error("Request failed with status code 401");
    error.response = { status: 401, data: {} };
    return error;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    ApiCheckoutService.validateCheckoutItem.mockResolvedValue({
      status: 200,
      data: {},
    });
  });

  it("asks no login of a signed-in person the check lets through, even if an older backend still names the persons", async () => {
    ApiAuthService.me.mockResolvedValue({ data: { user: SECOND } });
    ApiCheckoutService.getCheckoutPermissions.mockResolvedValue({});
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: { ...NAMED_PERSONS_ONLY, permittedUsers: [SECOND.id] },
    });

    const wrapper = await mountCheckout();

    expect(stepperHeader(wrapper)).toContain("Kontaktdaten");
    expect(stepperHeader(wrapper)).not.toContain("Anmeldung");
    expect(wrapper.text()).toContain("Kontaktdaten-Formular");
  });

  it("asks the anonymous for a login when the check answers 401, without the list", async () => {
    ApiAuthService.me.mockRejectedValue(unauthorized());
    ApiCheckoutService.getCheckoutPermissions.mockRejectedValue(unauthorized());
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: NAMED_PERSONS_ONLY,
    });

    const wrapper = await mountCheckout();

    expect(wrapper.text()).toContain("Anmeldung erforderlich");
    expect(wrapper.text()).not.toContain("Kontaktdaten-Formular");
  });

  it("refuses a signed-in person the check refuses, without the list", async () => {
    ApiAuthService.me.mockResolvedValue({ data: { user: FIRST } });
    ApiCheckoutService.getCheckoutPermissions.mockRejectedValue(
      forbiddenError()
    );
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: NAMED_PERSONS_ONLY,
    });

    const wrapper = await mountCheckout();

    expect(wrapper.text()).toContain(NOT_BOOKABLE);
    expect(wrapper.text()).not.toContain("Kontaktdaten-Formular");
  });

  it("still asks a login for a bookable restricted to roles", async () => {
    ApiAuthService.me.mockResolvedValue({ data: { user: SECOND } });
    ApiCheckoutService.getCheckoutPermissions.mockResolvedValue({});
    ApiBookablesService.getPublicBookable.mockResolvedValue({
      data: BOOKABLE,
    });

    const wrapper = await mountCheckout();

    expect(stepperHeader(wrapper)).toContain("Anmeldung");
  });
});
