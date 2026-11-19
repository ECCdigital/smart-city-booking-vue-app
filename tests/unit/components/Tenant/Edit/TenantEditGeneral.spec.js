import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import TenantEditGeneral from "@/components/Tenant/Edit/TenantEditGeneral.vue";

const mountGeneral = (tenant) =>
  mountComponent(TenantEditGeneral, { propsData: { tenant } });

describe("TenantEditGeneral — the required contact is not retroactive", () => {
  it("lets a tenant from before the required contact be saved", async () => {
    const wrapper = mountGeneral({ id: "t-old", name: "Altverein" });

    expect(await wrapper.vm.validate()).toBe(true);
  });

  it("still requires the name", async () => {
    const wrapper = mountGeneral({ id: "t-old", name: "" });

    expect(await wrapper.vm.validate()).toBe(false);
  });
});

describe("TenantEditGeneral — the short description", () => {
  // Vuetify puts `data-test` on the textarea itself.
  const textarea = (wrapper) =>
    wrapper.find('[data-test="tenant-description"]');
  const counter = (wrapper) => wrapper.find(".v-counter");

  it("is optional", async () => {
    const wrapper = mountGeneral({ id: "t", name: "Verein" });

    expect(await wrapper.vm.validate()).toBe(true);
  });

  it("shows the stored text with a counter up to 300 characters", () => {
    const wrapper = mountGeneral({
      id: "t",
      name: "Verein",
      description: "Sport im Quartier.",
    });

    expect(textarea(wrapper).element.value).toBe("Sport im Quartier.");
    expect(counter(wrapper).text()).toBe("18 / 300");
  });

  it("refuses more than 300 characters", async () => {
    const wrapper = mountGeneral({
      id: "t",
      name: "Verein",
      description: "x".repeat(301),
    });

    expect(await wrapper.vm.validate()).toBe(false);
  });
});
