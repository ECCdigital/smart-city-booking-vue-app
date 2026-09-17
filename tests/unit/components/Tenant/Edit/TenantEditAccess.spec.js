import { describe, expect, it, vi } from "vitest";
import TenantEditAccess from "@/components/Tenant/Edit/TenantEditAccess.vue";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { testConnection: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowAuditExport: () => false },
}));

/** A Nuki application saved before the customer service existed. */
function storedApps() {
  return {
    nuki: {
      type: "access",
      id: "nuki",
      title: "Nuki",
      apiToken: "",
      apiBaseUrl: "https://api.nuki.io",
      active: true,
    },
  };
}

/** The panels are collapsed; Vuetify renders their content once opened. */
async function mountAccess(apps = storedApps()) {
  const wrapper = mountComponent(TenantEditAccess, {
    propsData: { tenant: { id: "t1" }, apps },
  });

  const headers = wrapper.findAll(".v-expansion-panel-header").wrappers;
  for (const header of headers) {
    await header.trigger("click");
  }
  await wrapper.vm.$nextTick();

  return wrapper;
}

function nukiPanel(wrapper) {
  return wrapper.findAll(".v-expansion-panel").at(0);
}

/**
 * Nuki gets the same customer-service form as the bike boxes, so that the
 * storefront can name a contact below the open button of a door. A stored
 * application from before the field existed has to read as an empty contact
 * rather than break the form.
 */
describe("TenantEditAccess customer service for Nuki", () => {
  it("shows the form for Nuki but not for Salto KS", async () => {
    const wrapper = await mountAccess();

    expect(nukiPanel(wrapper).text()).toContain("Kundenservice");
    expect(wrapper.findAll(".v-expansion-panel").at(1).text()).not.toContain(
      "Kundenservice"
    );
  });

  it("fills an empty contact into a stored Nuki app and emits the edit", async () => {
    const wrapper = await mountAccess();

    expect(wrapper.vm.localApps.nuki.customerService).toEqual({
      name: "",
      email: "",
      phone: "",
    });

    await nukiPanel(wrapper).find("input[type='tel']").setValue("030 1234");

    const emitted = wrapper.emitted("update:apps");
    expect(emitted.at(-1)[0].nuki.customerService).toEqual({
      name: "",
      email: "",
      phone: "030 1234",
    });
  });

  it("carries a saved contact into the form and out again", async () => {
    const apps = storedApps();
    apps.nuki.customerService = {
      name: "Hausmeisterei",
      email: "tuer@example.com",
      phone: "",
    };
    const wrapper = await mountAccess(apps);

    const emailInput = nukiPanel(wrapper).findAll("input[type='email']").at(0);
    expect(emailInput.element.value).toBe("tuer@example.com");

    await nukiPanel(wrapper).find("input[type='tel']").setValue("030 1234");

    const emitted = wrapper.emitted("update:apps");
    expect(emitted.at(-1)[0].nuki.customerService).toEqual({
      name: "Hausmeisterei",
      email: "tuer@example.com",
      phone: "030 1234",
    });
  });
});
