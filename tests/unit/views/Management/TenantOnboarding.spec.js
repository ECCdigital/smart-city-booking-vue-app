import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenants: vi.fn(),
    getTenant: vi.fn(),
    createTenant: vi.fn(),
  },
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

import ApiTenantService from "@/services/api/ApiTenantService";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import ApiAuthService from "@/services/api/ApiAuthService";
import TenantOnboarding from "@/views/Management/TenantOnboarding.vue";

const tenantOf = (supervisionLevel) => ({
  id: "t-1",
  name: "Verein",
  contactName: "Alex Beispiel",
  mail: "alex@example.org",
  supervisionLevel,
});

let instanceOwner;
let push;
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
    mocks: { $router: { push }, $route: { query } },
  });
}

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

async function fillTenant(wrapper, { name = "Verein" } = {}) {
  await find(wrapper, "tenant-name").find("input").setValue(name);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
  instanceOwner = false;
  push = vi.fn();
  selected = null;
  nextUrl = null;

  ApiInstanceService.getPublicInstance.mockResolvedValue({
    tenantInitialSupervisionLevel: "free",
  });
  ApiTenantService.getTenant.mockResolvedValue({ data: tenantOf("free") });
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

  it("creates the tenant, selects it and leads into the flow of its first bookable", async () => {
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
    expect(push).toHaveBeenCalledWith({
      name: "room-edit",
      query: { onboarding: "1" },
    });
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
    ["pending", "Freigabe ausstehend"],
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
      tenantInitialSupervisionLevel: "pending",
    });
    const wrapper = mountWizard();
    await flushPromises();

    expect(find(wrapper, "supervision-notice").exists()).toBe(false);
  });
});

describe("TenantOnboarding — a created tenant", () => {
  it("shows the tenant as created and leads on to its first bookable", async () => {
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    expect(selected).toBe("t-1");
    expect(find(wrapper, "tenant-name").find("input").element.value).toBe(
      "Verein"
    );
    await find(wrapper, "tenant-step").trigger("submit");

    expect(ApiTenantService.createTenant).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({
      name: "room-edit",
      query: { onboarding: "1" },
    });
  });

  it.each([
    ["supervised", "beaufsichtigt"],
    ["pending", "Freigabe ausstehend"],
  ])("keeps the level %s in view", async (level, name) => {
    ApiTenantService.getTenant.mockResolvedValue({ data: tenantOf(level) });
    const wrapper = mountWizard({ tenant: "t-1" });
    await flushPromises();

    expect(find(wrapper, "supervision-notice").text()).toContain(name);
  });

  it("leaves to the administration", async () => {
    const wrapper = mountWizard();
    await flushPromises();

    await find(wrapper, "exit").trigger("click");

    expect(push).toHaveBeenCalledWith({ name: "dashboard" });
  });

  it("says so when the tenant cannot be loaded", async () => {
    ApiTenantService.getTenant.mockRejectedValue(new Error("gone"));
    const wrapper = mountWizard({ tenant: "t-404" });
    await flushPromises();

    expect(find(wrapper, "load-failed").exists()).toBe(true);
  });
});
