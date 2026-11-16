import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn() },
}));

import Vuex from "vuex";
import ApiRolesService from "@/services/api/ApiRolesService";
import { mountComponent } from "@tests/unit/support/mount";
import TenantEditCustomerUploads from "@/components/Tenant/Edit/TenantEditCustomerUploads.vue";
import TenantEditBookables from "@/components/Tenant/Edit/TenantEditBookables.vue";
import TenantEditBooking from "@/components/Tenant/Edit/TenantEditBooking.vue";

/** A store whose public instance has cleared customer uploads (or not). */
const instanceStore = (cleared = true) =>
  new Vuex.Store({
    modules: {
      instance: {
        namespaced: true,
        getters: {
          instance: () => ({ customerUploads: { enabled: cleared } }),
        },
      },
    },
  });

const mountTab = (customerUploads, { cleared = true } = {}) =>
  mountComponent(TenantEditCustomerUploads, {
    store: instanceStore(cleared),
    propsData: {
      tenant: {
        id: "t",
        name: "Stadt",
        ...(customerUploads && { customerUploads }),
      },
    },
  });

const ENABLED = {
  enabled: true,
  formats: ["pdf", "jpeg", "png"],
  retentionDays: 30,
  reminderDaysBeforeDeadline: 3,
  notifyOnSubmitted: true,
  notifyOnOverdue: true,
  notifyRoleIds: [],
};

const ROLES = [
  { id: "role-pruefung", name: "Prüfung" },
  { id: "role-leitung", name: "Leitung" },
];

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const lastUpdate = (wrapper) => {
  const updates = wrapper.emitted("update:tenant");
  return updates[updates.length - 1][0];
};

describe("TenantEditCustomerUploads (Nachweise von Buchenden)", () => {
  beforeEach(() => {
    ApiRolesService.getTenantRoles.mockReset();
    ApiRolesService.getTenantRoles.mockResolvedValue({ data: ROLES });
  });

  it("locks the switch and says why while the instance has not cleared customer uploads", () => {
    const wrapper = mountTab(undefined, { cleared: false });

    expect(find(wrapper, "customer-uploads-instance-off").text()).toContain(
      "Die Instanz hat Nachweise von Buchenden nicht freigegeben."
    );
    expect(
      find(wrapper, "customer-uploads-enabled").find("input").attributes()
    ).toHaveProperty("disabled");
  });

  it("lets a tenant switch customer uploads off while the instance has not cleared them", () => {
    const wrapper = mountTab(ENABLED, { cleared: false });

    expect(find(wrapper, "customer-uploads-instance-off").text()).toContain(
      "Bis zur Freigabe nimmt dieser Mandant keine Nachweise an."
    );
    expect(
      find(wrapper, "customer-uploads-enabled").find("input").attributes()
    ).not.toHaveProperty("disabled");
  });

  it("says nothing of the instance once it has cleared customer uploads", () => {
    const wrapper = mountTab();

    expect(find(wrapper, "customer-uploads-instance-off").exists()).toBe(false);
  });

  it("shows only the switch while customer uploads are off", () => {
    const wrapper = mountTab();

    expect(find(wrapper, "customer-uploads-enabled").exists()).toBe(true);
    expect(find(wrapper, "customer-uploads-retention").exists()).toBe(false);
  });

  it("enables them with every default of the spec", async () => {
    const wrapper = mountTab();

    await find(wrapper, "customer-uploads-enabled").trigger("click");

    expect(lastUpdate(wrapper)).toEqual({ customerUploads: ENABLED });
  });

  it("shortens the retention", async () => {
    const wrapper = mountTab(ENABLED);

    await find(wrapper, "customer-uploads-retention").setValue("14");

    expect(lastUpdate(wrapper).customerUploads.retentionDays).toBe(14);
  });

  it("is a section of the tab „Buchungsobjekte“, whose form refuses a retention over 30 days", async () => {
    const wrapper = mountComponent(TenantEditBookables, {
      store: instanceStore(),
      propsData: {
        tenant: {
          id: "t",
          name: "Stadt",
          customerUploads: { ...ENABLED, retentionDays: 31 },
        },
      },
    });

    expect(wrapper.text()).toContain("Nachweise von Buchenden");
    expect(await wrapper.vm.validate()).toBe(false);
    expect(wrapper.text()).toContain("Geben Sie 0 bis 30 Tage an.");
  });

  it("is no longer a section of the tab „Buchung“", () => {
    const wrapper = mountComponent(TenantEditBooking, {
      store: instanceStore(),
      propsData: {
        tenant: { id: "t", name: "Stadt", customerUploads: ENABLED },
      },
    });

    expect(wrapper.text()).not.toContain("Nachweise von Buchenden");
  });

  it("asks no reminder to the admins before the deletion any more", () => {
    const wrapper = mountTab(ENABLED);

    expect(
      wrapper.find("[data-test='customer-uploads-review-reminder']").exists()
    ).toBe(false);
    expect(wrapper.text()).not.toContain("Erinnerung an Admins");
  });

  it("names the deletion deadline as one of sensitive proofs, and where it starts", () => {
    const wrapper = mountTab(ENABLED);

    expect(wrapper.text()).toContain(
      "Löschfrist für besonders schutzwürdige Nachweise"
    );
    expect(wrapper.text()).toContain(
      "Bei Tickets zählt das Ende der Veranstaltung"
    );
  });

  it("drops a format, keeping the order PDF, JPEG, PNG", async () => {
    const wrapper = mountTab(ENABLED);

    await find(wrapper, "customer-uploads-format-jpeg").trigger("click");

    expect(lastUpdate(wrapper).customerUploads.formats).toEqual(["pdf", "png"]);
  });

  it("picks the roles that get the staff's mails, out of the tenant's roles", async () => {
    const wrapper = mountTab(ENABLED);
    await flushPromises();

    expect(ApiRolesService.getTenantRoles).toHaveBeenCalledWith(false, "t");
    const picker = wrapper.findComponent({ name: "v-autocomplete" });
    expect(picker.props("items")).toEqual([
      { text: "Prüfung", value: "role-pruefung" },
      { text: "Leitung", value: "role-leitung" },
    ]);

    picker.vm.$emit("change", ["role-pruefung"]);

    expect(lastUpdate(wrapper).customerUploads.notifyRoleIds).toEqual([
      "role-pruefung",
    ]);
  });

  it("warns that nobody gets the mails without a role", async () => {
    const without = mountTab(ENABLED);
    const withRole = mountTab({ ...ENABLED, notifyRoleIds: ["role-pruefung"] });
    const mailsOff = mountTab({
      ...ENABLED,
      notifyOnSubmitted: false,
      notifyOnOverdue: false,
    });
    await flushPromises();

    expect(find(without, "customer-uploads-notify-roles-missing").text()).toBe(
      "Ohne Rolle erhält niemand diese E-Mails."
    );
    expect(
      find(withRole, "customer-uploads-notify-roles-missing").exists()
    ).toBe(false);
    expect(find(mailsOff, "customer-uploads-notify-roles").exists()).toBe(
      false
    );
  });

  it("switches the mail „Nachweis überfällig“ off on its own", async () => {
    const wrapper = mountTab(ENABLED);

    await find(wrapper, "customer-uploads-notify-overdue").trigger("click");

    expect(lastUpdate(wrapper).customerUploads).toMatchObject({
      notifyOnSubmitted: true,
      notifyOnOverdue: false,
    });
  });
});
