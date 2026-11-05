import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import TenantEditCustomerUploads from "@/components/Tenant/Edit/TenantEditCustomerUploads.vue";
import TenantEditBooking from "@/components/Tenant/Edit/TenantEditBooking.vue";

const mountTab = (customerUploads) =>
  mountComponent(TenantEditCustomerUploads, {
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
  reviewReminderDaysBeforeDeletion: 3,
  notifyOnSubmitted: true,
  notifyOnOverdue: true,
};

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const lastUpdate = (wrapper) => {
  const updates = wrapper.emitted("update:tenant");
  return updates[updates.length - 1][0];
};

describe("TenantEditCustomerUploads (Nachweise von Buchenden)", () => {
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

  it("is a section of the tab „Buchung“, whose form refuses a retention over 30 days", async () => {
    const wrapper = mountComponent(TenantEditBooking, {
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

  it("sets the reminder to the admins before the deletion", async () => {
    const wrapper = mountTab(ENABLED);

    await find(wrapper, "customer-uploads-review-reminder").setValue("5");

    expect(
      lastUpdate(wrapper).customerUploads.reviewReminderDaysBeforeDeletion
    ).toBe(5);
  });

  it("drops a format, keeping the order PDF, JPEG, PNG", async () => {
    const wrapper = mountTab(ENABLED);

    await find(wrapper, "customer-uploads-format-jpeg").trigger("click");

    expect(lastUpdate(wrapper).customerUploads.formats).toEqual(["pdf", "png"]);
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
