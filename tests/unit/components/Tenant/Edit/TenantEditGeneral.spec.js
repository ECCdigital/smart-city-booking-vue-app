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
