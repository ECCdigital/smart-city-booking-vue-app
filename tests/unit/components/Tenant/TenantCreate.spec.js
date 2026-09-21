import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { createTenant: vi.fn() },
}));
// The start level notice has a spec of its own (TenantCreateInitialLevel).
vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getPublicInstance: vi.fn().mockResolvedValue({}) },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { isInstanceOwner: () => true },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import TenantCreate from "@/components/Tenant/TenantCreate.vue";

const USER = {
  id: "alex@example.org",
  firstName: "Alex",
  lastName: "Beispiel",
};

async function openDialog() {
  const store = new Vuex.Store({
    modules: {
      user: { namespaced: true, getters: { getUser: () => USER } },
      tenants: { namespaced: true, getters: { currentTenantId: () => "t-0" } },
    },
  });
  const wrapper = mountComponent(TenantCreate, {
    store,
    propsData: { open: false },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
}

const find = (wrapper, name) => wrapper.find(`[data-test="${name}"]`);
const input = (wrapper, name) => find(wrapper, name).find("input");

async function save(wrapper) {
  await find(wrapper, "tenant-create-submit").trigger("click");
  await flushPromises();
}

const refused = (status, data = {}, headers = {}) => ({
  response: { status, data, headers },
});

describe("TenantCreate — required contact", () => {
  beforeEach(() => {
    ApiTenantService.createTenant.mockReset();
    ApiTenantService.createTenant.mockResolvedValue({ status: 201 });
  });

  it("prefills the contact from the user account and keeps it editable", async () => {
    const wrapper = await openDialog();

    expect(input(wrapper, "tenant-create-contact-name").element.value).toBe(
      "Alex Beispiel"
    );
    expect(input(wrapper, "tenant-create-mail").element.value).toBe(
      "alex@example.org"
    );

    await input(wrapper, "tenant-create-name").setValue("Verein");
    await input(wrapper, "tenant-create-mail").setValue(
      "kontakt@verein.example"
    );
    await save(wrapper);

    expect(ApiTenantService.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Verein",
        contactName: "Alex Beispiel",
        mail: "kontakt@verein.example",
      })
    );
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it.each([
    ["tenant-create-name", "   "],
    ["tenant-create-contact-name", ""],
    ["tenant-create-mail", ""],
    ["tenant-create-mail", "alex@example"],
    ["tenant-create-mail", "a lex@example.org"],
  ])("creates nothing with %s set to '%s'", async (field, value) => {
    const wrapper = await openDialog();
    await input(wrapper, "tenant-create-name").setValue("Verein");
    await input(wrapper, field).setValue(value);

    await save(wrapper);

    expect(ApiTenantService.createTenant).not.toHaveBeenCalled();
  });

  it("starts empty again when it is reopened", async () => {
    const wrapper = await openDialog();
    await input(wrapper, "tenant-create-name").setValue("Verein");
    ApiTenantService.createTenant.mockRejectedValue(refused(500));
    await save(wrapper);

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();

    expect(input(wrapper, "tenant-create-name").element.value).toBe("");
    expect(find(wrapper, "tenant-create-error").exists()).toBe(false);
  });
});

describe("TenantCreate — a refused creation", () => {
  beforeEach(() => {
    ApiTenantService.createTenant.mockReset();
  });

  async function refuse(error) {
    ApiTenantService.createTenant.mockRejectedValue(error);
    const wrapper = await openDialog();
    await input(wrapper, "tenant-create-name").setValue("Verein");
    await save(wrapper);
    return wrapper;
  }

  it("shows when a new attempt is possible after the creation limit", async () => {
    const wrapper = await refuse(
      refused(429, { code: "too_many_requests" }, { "retry-after": "7200" })
    );

    expect(find(wrapper, "tenant-create-error").text()).toContain("2 Std.");
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("points to the verification when the account's mail is unproven", async () => {
    const wrapper = await refuse(
      refused(403, {
        code: "email_verification_required",
        params: { method: "email" },
      })
    );

    expect(find(wrapper, "tenant-create-error").text()).toContain(
      "Bestätigungs-E-Mail"
    );
  });

  it("says so when the instance's tenant maximum is reached", async () => {
    const wrapper = await refuse(refused(409, { code: "max_tenants_reached" }));

    expect(find(wrapper, "tenant-create-error").text()).toContain(
      "maximale Anzahl"
    );
  });

  it("marks the field the backend named", async () => {
    const wrapper = await refuse(
      refused(400, { code: "invalid_mail", params: { field: "mail" } })
    );

    expect(find(wrapper, "tenant-create-error").text()).toContain("Angaben");
    // The dialog content is detached into the `data-app` container.
    expect(document.body.textContent).toContain(
      "Muss gültige E-Mail-Adresse sein."
    );
  });
});
