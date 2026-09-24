import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenants: vi.fn(),
    getTenant: vi.fn(),
    createTenant: vi.fn(),
    getReadiness: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn(), createOrUpdateBookable: vi.fn() },
}));
vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getPublicInstance: vi.fn() },
}));
vi.mock("@/services/api/ApiAuthService", () => ({
  default: { resendVerification: vi.fn() },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { isInstanceOwner: () => instanceOwner },
}));
vi.mock("@/layouts/Admin", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", [this.$slots["page-header"], this.$slots.default]);
    },
  },
}));
vi.mock("@/components/Tiptap.vue", () => ({
  default: { name: "Tiptap", props: ["value"], render: () => null },
}));
vi.mock("@/components/Media/MediaReferenceList.vue", () => ({
  default: { name: "MediaReferenceList", props: ["value"], render: () => null },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiAuthService from "@/services/api/ApiAuthService";
import Bookable from "@/entities/bookable";
import TenantOnboarding from "@/views/Management/TenantOnboarding.vue";
import OnboardingOfferStep from "@/components/Tenant/Onboarding/OnboardingOfferStep.vue";

const READINESS = {
  checkedAt: "2026-09-21T08:00:00.000Z",
  criteria: [
    { key: "contact", state: "fulfilled", hint: "Kontakt ok.", offers: [] },
    {
      key: "payment",
      state: "missing",
      hint: "Zahlungsweg fehlt.",
      offers: [{ offerType: "bookable", offerId: "b-1", title: "Saal" }],
    },
  ],
};

const tenantOf = (supervisionLevel) => ({
  id: "t-1",
  name: "Verein",
  contactName: "Alex Beispiel",
  mail: "alex@example.org",
  supervisionLevel,
});

const storedBookable = (overrides = {}) =>
  new Bookable({
    id: "b-1",
    tenantId: "t-1",
    type: "room",
    title: "Saal",
    amount: 1,
    ...overrides,
  }).toPlain();

let instanceOwner;
let push;
let replace;
let selected;
let nextUrl;

function mountWizard(query = {}) {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        getters: {
          getUser: () => ({
            id: "alex@example.org",
            firstName: "Alex",
            lastName: "Beispiel",
          }),
        },
      },
      authStore: {
        namespaced: true,
        actions: {
          setNextUrl: (context, value) => {
            nextUrl = value;
          },
        },
      },
      tenants: {
        namespaced: true,
        actions: {
          select: (context, tenantId) => {
            selected = tenantId;
          },
          setTenants: vi.fn(),
        },
      },
    },
  });

  return mountComponent(TenantOnboarding, {
    store,
    stubs: { RouterLink: true },
    mocks: { $router: { push, replace }, $route: { query } },
  });
}

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

async function fillTenant(wrapper, { name = "Verein" } = {}) {
  await find(wrapper, "tenant-name").find("input").setValue(name);
}

/** Fills the bookable step through the form the step edits. */
async function fillOffer(wrapper, values) {
  const step = wrapper.findComponent(OnboardingOfferStep);
  Object.assign(step.vm.form, values);
  await wrapper.vm.$nextTick();
}

beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
  instanceOwner = false;
  push = vi.fn();
  replace = vi.fn();
  selected = null;
  nextUrl = null;

  ApiInstanceService.getPublicInstance.mockResolvedValue({
    tenantInitialSupervisionLevel: "free",
  });
  ApiTenantService.getReadiness.mockResolvedValue(READINESS);
  ApiTenantService.getTenant.mockResolvedValue({ data: tenantOf("free") });
  ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
  ApiBookablesService.createOrUpdateBookable.mockImplementation(
    async (bookable) => ({ data: { ...bookable, id: bookable.id || "b-1" } })
  );
});

describe("TenantOnboarding — creating the tenant", () => {
  it("prefills the contact from the user account and requires the name", async () => {
    const wrapper = mountWizard();
    await flushPromises();

    expect(
      find(wrapper, "tenant-contact-name").find("input").element.value
    ).toBe("Alex Beispiel");
    expect(find(wrapper, "tenant-mail").find("input").element.value).toBe(
      "alex@example.org"
    );

    await find(wrapper, "tenant-step").trigger("submit");
    await flushPromises();

    expect(ApiTenantService.createTenant).not.toHaveBeenCalled();
  });

  it("refuses a formally invalid mail address", async () => {
    const wrapper = mountWizard();
    await flushPromises();
    await fillTenant(wrapper);
    await find(wrapper, "tenant-mail").find("input").setValue("alex@");

    await find(wrapper, "tenant-step").trigger("submit");
    await flushPromises();

    expect(ApiTenantService.createTenant).not.toHaveBeenCalled();
  });

  it("creates the tenant, selects it and continues at the first bookable", async () => {
    ApiTenantService.getTenants
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: "t-1", name: "Verein" }] });
    const wrapper = mountWizard();
    await flushPromises();
    await fillTenant(wrapper);

    await find(wrapper, "tenant-step").trigger("submit");
    await flushPromises();

    expect(ApiTenantService.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Verein",
        contactName: "Alex Beispiel",
        mail: "alex@example.org",
      })
    );
    expect(selected).toBe("t-1");
    expect(replace).toHaveBeenCalledWith({ query: { tenant: "t-1" } });
    expect(find(wrapper, "offer-step").exists()).toBe(true);
  });

  it("shows when a new attempt is possible after the creation limit", async () => {
    ApiTenantService.getTenants.mockResolvedValue({ data: [] });
    ApiTenantService.createTenant.mockRejectedValue({
      response: {
        status: 429,
        data: { code: "too_many_requests" },
        headers: { "retry-after": "7200" },
      },
    });
    const wrapper = mountWizard();
    await flushPromises();
    await fillTenant(wrapper);

    await find(wrapper, "tenant-step").trigger("submit");
    await flushPromises();

    expect(find(wrapper, "tenant-error").text()).toContain("2 Std.");
    expect(find(wrapper, "tenant-step").exists()).toBe(true);
  });

  it("points to the verification when the account's mail is unproven", async () => {
    ApiTenantService.getTenants.mockResolvedValue({ data: [] });
    ApiTenantService.createTenant.mockRejectedValue({
      response: {
        status: 403,
        data: {
          code: "email_verification_required",
          params: { method: "identity_provider" },
        },
      },
    });
    const wrapper = mountWizard();
    await flushPromises();
    await fillTenant(wrapper);

    await find(wrapper, "tenant-step").trigger("submit");
    await flushPromises();

    expect(find(wrapper, "tenant-error").text()).toContain("Anmeldedienst");
  });
});

describe("TenantOnboarding — the way to the missing verification proof", () => {
  /** Submits the creation the backend refuses for want of a proof. */
  async function refusedCreation(params) {
    ApiTenantService.getTenants.mockResolvedValue({ data: [] });
    ApiTenantService.createTenant.mockRejectedValue({
      response: {
        status: 403,
        data: { code: "email_verification_required", params },
      },
    });
    const wrapper = mountWizard();
    await flushPromises();
    await fillTenant(wrapper);
    await find(wrapper, "tenant-step").trigger("submit");
    await flushPromises();
    return wrapper;
  }

  it("sends a local account its verification mail again, leading back here", async () => {
    ApiAuthService.resendVerification.mockResolvedValue({ status: 202 });
    const wrapper = await refusedCreation({ method: "email", provider: null });

    expect(find(wrapper, "verification-sso").exists()).toBe(false);
    await find(wrapper, "verification-resend").trigger("click");
    await flushPromises();

    expect(ApiAuthService.resendVerification).toHaveBeenCalledWith(
      "alex@example.org",
      "/onboarding"
    );
    expect(find(wrapper, "verification-sent").exists()).toBe(true);
  });

  it("says so when the verification mail could not be requested", async () => {
    ApiAuthService.resendVerification.mockRejectedValue(new Error("500"));
    const wrapper = await refusedCreation({ method: "email", provider: null });

    await find(wrapper, "verification-resend").trigger("click");
    await flushPromises();

    expect(find(wrapper, "verification-sent").exists()).toBe(false);
    expect(find(wrapper, "verification-failed").text()).toContain(
      "konnte nicht angefordert werden"
    );
  });

  it("names the wait when the verification mails hit their limit", async () => {
    ApiAuthService.resendVerification.mockRejectedValue({
      response: { status: 429, data: {}, headers: { "retry-after": "600" } },
    });
    const wrapper = await refusedCreation({ method: "email", provider: null });

    await find(wrapper, "verification-resend").trigger("click");
    await flushPromises();

    expect(find(wrapper, "verification-failed").text()).toContain(
      "in 10 Min. möglich"
    );
  });

  it("asks to try later when the limit names no wait", async () => {
    ApiAuthService.resendVerification.mockRejectedValue({
      response: { status: 429, data: {}, headers: {} },
    });
    const wrapper = await refusedCreation({ method: "email", provider: null });

    await find(wrapper, "verification-resend").trigger("click");
    await flushPromises();

    const text = find(wrapper, "verification-failed").text();
    expect(text).toContain("zu viele Versuche");
    expect(text).toContain("später erneut");
  });

  it("leads an SSO account to a new sign-in at its identity provider, and back here", async () => {
    const wrapper = await refusedCreation({
      method: "identity_provider",
      provider: "keycloak",
    });

    expect(find(wrapper, "verification-resend").exists()).toBe(false);
    await find(wrapper, "verification-sso").trigger("click");
    await flushPromises();

    expect(nextUrl).toBe("/onboarding");
    expect(push).toHaveBeenCalledWith({ name: "sso" });
    expect(ApiAuthService.resendVerification).not.toHaveBeenCalled();
  });

  it("offers neither way for another refusal", async () => {
    ApiTenantService.getTenants.mockResolvedValue({ data: [] });
    ApiTenantService.createTenant.mockRejectedValue({
      response: { status: 409, data: { code: "max_tenants_reached" } },
    });
    const wrapper = mountWizard();
    await flushPromises();
    await fillTenant(wrapper);
    await find(wrapper, "tenant-step").trigger("submit");
    await flushPromises();

    expect(find(wrapper, "verification-resend").exists()).toBe(false);
    expect(find(wrapper, "verification-sso").exists()).toBe(false);
  });
});

describe("TenantOnboarding — supervision level before the creation", () => {
  it("shows no supervision text at the initial level free", async () => {
    const wrapper = mountWizard();
    await flushPromises();

    expect(find(wrapper, "supervision-notice").exists()).toBe(false);
  });

  it.each([
    ["supervised", "beaufsichtigt"],
    ["blocked", "gesperrt"],
  ])("announces the initial level %s", async (level, name) => {
    ApiInstanceService.getPublicInstance.mockResolvedValue({
      tenantInitialSupervisionLevel: level,
    });
    const wrapper = mountWizard();
    await flushPromises();

    expect(find(wrapper, "supervision-notice").text()).toContain(name);
  });

  it("starts the instance owner's tenant free, whatever the initial level", async () => {
    instanceOwner = true;
    ApiInstanceService.getPublicInstance.mockResolvedValue({
      tenantInitialSupervisionLevel: "blocked",
    });
    const wrapper = mountWizard();
    await flushPromises();

    expect(find(wrapper, "supervision-notice").exists()).toBe(false);
  });
});

describe("TenantOnboarding — the first bookable", () => {
  it("shows the changeable defaults and preselects neither price nor availability", async () => {
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    const form = wrapper.findComponent(OnboardingOfferStep).vm.form;
    expect(form).toMatchObject({
      schedule: "period",
      amount: 1,
      confirmation: "manual",
      priceChoice: null,
      availability: null,
    });
  });

  it("saves nothing without type, title and the two deliberate choices", async () => {
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    await find(wrapper, "offer-step").trigger("submit");
    await flushPromises();

    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
    expect(find(wrapper, "offer-step").text()).toContain("Pflichtfeld");
    expect(find(wrapper, "offer-step").text()).toContain(
      "Bitte ausdrücklich wählen."
    );
  });

  it("leads a paid offer to price fields and the payment hint", async () => {
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();
    expect(find(wrapper, "offer-paid-fields").exists()).toBe(false);

    await fillOffer(wrapper, { priceChoice: "paid" });

    expect(find(wrapper, "offer-paid-fields").exists()).toBe(true);
    expect(find(wrapper, "offer-payment-hint").exists()).toBe(true);
  });

  it("saves the draft unpublished and continues at the optional setup", async () => {
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();
    await fillOffer(wrapper, {
      type: "room",
      title: "Saal",
      priceChoice: "paid",
      price: "15",
      availability: "always",
    });

    await find(wrapper, "offer-step").trigger("submit");
    await flushPromises();

    const [saved, tenantId] =
      ApiBookablesService.createOrUpdateBookable.mock.calls[0];
    expect(tenantId).toBe("t-1");
    expect(saved).toMatchObject({
      type: "room",
      title: "Saal",
      isPublic: false,
      amount: 1,
      autoCommitBooking: false,
      isScheduleRelated: true,
    });
    expect(saved.priceCategories[0].priceEur).toBe(15);
    expect(find(wrapper, "setup-step").exists()).toBe(true);
    // Paid: the payment form is offered; legal texts always are.
    expect(find(wrapper, "setup-payment").exists()).toBe(true);
    expect(find(wrapper, "setup-legal").exists()).toBe(true);
  });
});

describe("TenantOnboarding — closing by supervision level", () => {
  async function reachOverview(level) {
    ApiTenantService.getTenant.mockResolvedValue({ data: tenantOf(level) });
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();
    await fillOffer(wrapper, {
      type: "room",
      title: "Saal",
      priceChoice: "paid",
      price: 15,
      availability: "always",
    });
    await find(wrapper, "offer-step").trigger("submit");
    await flushPromises();
    await find(wrapper, "setup-continue").trigger("click");
    await flushPromises();
    return wrapper;
  }

  it.each([
    ["free", "Veröffentlichen", "Veröffentlicht"],
    ["supervised", "Zur Prüfung einreichen", "Zur Prüfung eingereicht"],
    ["blocked", "Veröffentlichung vormerken", "Veröffentlichung vorgemerkt"],
  ])(
    "%s: „%s“ stores the publication wish",
    async (level, action, doneTitle) => {
      const wrapper = await reachOverview(level);

      expect(find(wrapper, "overview-complete").text()).toBe(action);

      await find(wrapper, "overview-complete").trigger("click");
      await flushPromises();

      const saved = ApiBookablesService.createOrUpdateBookable.mock.calls[1][0];
      expect(saved).toMatchObject({ id: "b-1", isPublic: true });
      expect(find(wrapper, "overview-done-title").text()).toBe(doneTitle);
      expect(find(wrapper, "overview-complete").exists()).toBe(false);
    }
  );

  it("free: neither level nor approval texts, before or after publishing", async () => {
    const wrapper = await reachOverview("free");
    expect(find(wrapper, "supervision-notice").exists()).toBe(false);

    await find(wrapper, "overview-complete").trigger("click");
    await flushPromises();

    expect(find(wrapper, "supervision-notice").exists()).toBe(false);
    expect(find(wrapper, "overview-done-text").exists()).toBe(false);
  });

  it.each(["supervised", "blocked"])(
    "%s: the level accompanies the wizard",
    async (level) => {
      const wrapper = await reachOverview(level);

      expect(find(wrapper, "supervision-notice").exists()).toBe(true);
    }
  );

  it("shows the readiness check as information: a missing payment setup does not block", async () => {
    const wrapper = await reachOverview("supervised");

    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-1");
    expect(find(wrapper, "readiness-payment").text()).toContain("Offen");
    expect(
      find(wrapper, "overview-complete").attributes("disabled")
    ).toBeUndefined();
  });

  it("keeps the closing action usable when the readiness check fails to load", async () => {
    ApiTenantService.getReadiness.mockRejectedValue(new Error("offline"));
    const wrapper = await reachOverview("free");

    expect(
      find(wrapper, "overview-complete").attributes("disabled")
    ).toBeUndefined();
  });
});

describe("TenantOnboarding — leaving and resuming", () => {
  it("leaves to the administration without storing progress", async () => {
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    await find(wrapper, "exit").trigger("click");

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
  });

  it("resumes with the current data, price and availability as stored", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        storedBookable({
          title: "Saal (bearbeitet)",
          priceCategories: [{ priceEur: 15 }],
        }),
      ],
    });
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    const step = wrapper.findComponent(OnboardingOfferStep);
    expect(step.vm.form.title).toBe("Saal (bearbeitet)");
    expect(step.vm.form.price).toBe(15);
    expect(step.vm.form.priceChoice).toBe("paid");
    expect(step.vm.form.availability).toBe("always");
  });

  it("saves an unlimited amount as 0", async () => {
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();
    await fillOffer(wrapper, {
      type: "room",
      title: "Saal",
      priceChoice: "free",
      availability: "always",
    });

    await find(wrapper, "offer-amount-toggle-unlimited").trigger("click");
    expect(find(wrapper, "offer-amount-unlimited").exists()).toBe(true);
    await find(wrapper, "offer-step").trigger("submit");
    await flushPromises();

    const saved = ApiBookablesService.createOrUpdateBookable.mock.calls[0][0];
    expect(saved.amount).toBe(0);
  });

  it("leaves the tickets of an event to the regular administration", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        storedBookable({ id: "b-0", type: "ticket", eventId: "e-1" }),
        storedBookable({ title: "Saal" }),
      ],
    });
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    expect(wrapper.findComponent(OnboardingOfferStep).vm.form.title).toBe(
      "Saal"
    );
  });

  it("returns from the legal or payment form to the step it left", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [storedBookable()],
    });

    const wrapper = mountWizard({
      tenant: "t-1",
      bookable: "b-1",
      step: "overview",
    });
    await flushPromises();

    expect(find(wrapper, "overview-step").exists()).toBe(true);
    expect(find(wrapper, "overview-complete").attributes("disabled")).toBe(
      undefined
    );
  });

  it("resumes at the bookable when no return step is named", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [storedBookable()],
    });

    const wrapper = mountWizard({ tenant: "t-1", bookable: "b-1" });
    await flushPromises();

    expect(find(wrapper, "offer-step").exists()).toBe(true);
  });

  it("shows a published first bookable as done", async () => {
    ApiTenantService.getTenant.mockResolvedValue({
      data: tenantOf("supervised"),
    });
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [storedBookable({ isPublic: true })],
    });
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    await find(wrapper, "wizard-step-overview").trigger("click");
    await flushPromises();

    expect(find(wrapper, "overview-done-title").text()).toBe(
      "Zur Prüfung eingereicht"
    );
  });

  it("says so when the tenant cannot be loaded", async () => {
    ApiTenantService.getTenant.mockRejectedValue(new Error("gone"));
    const wrapper = mountWizard({ tenant: "t-404" });
    await flushPromises();

    expect(find(wrapper, "load-failed").exists()).toBe(true);
  });
});
