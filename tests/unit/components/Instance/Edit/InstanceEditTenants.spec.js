import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import InstanceEditTenants from "@/components/Instance/Edit/InstanceEditTenants.vue";

function instance(overrides = {}) {
  return {
    id: "instance",
    allowAllUsersToCreateTenant: false,
    allowedUsersToCreateTenant: [],
    ...overrides,
  };
}

function mountTab(propsData = {}) {
  return mountComponent(InstanceEditTenants, {
    propsData: { instance: instance(), ...propsData },
  });
}

function levelGroup(wrapper) {
  return wrapper.find("[data-test='initial-level']");
}

function checkedLevel(wrapper) {
  return levelGroup(wrapper).find("input:checked").element?.value;
}

async function settle(wrapper) {
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

describe("InstanceEditTenants Startstufe", () => {
  it("offers the three start levels, never declined, and explains what the start level touches", () => {
    const wrapper = mountTab();
    const group = levelGroup(wrapper);

    expect(
      group.findAll("input[type=radio]").wrappers.map((i) => i.element.value)
    ).toEqual(["free", "supervised", "pending"]);
    expect(group.text()).toContain("Startstufe");
    expect(group.text()).toContain("frei");
    expect(group.text()).toContain("beaufsichtigt");
    expect(group.text()).toContain("Freigabe ausstehend");
    expect(group.text()).toContain("bis Sie sie freigeben");
    expect(group.text()).not.toContain("abgewiesen");

    const hint = wrapper.find("[data-test='initial-level-hint']").text();
    expect(hint).toContain("Freigabeliste");
    expect(hint).toContain("Instanz-Owner");
    expect(hint).toContain("bestehende Mandanten");
    expect(hint).toContain("manuell");
  });

  it("reads an instance without the field as frei", () => {
    const wrapper = mountTab();

    expect(checkedLevel(wrapper)).toBe("free");
  });

  it("shows the stored start level", () => {
    const wrapper = mountTab({
      instance: instance({ tenantInitialSupervisionLevel: "pending" }),
    });

    expect(checkedLevel(wrapper)).toBe("pending");
  });

  it("never reads a stored start level it does not know as frei", async () => {
    const wrapper = mountTab({
      instance: instance({ tenantInitialSupervisionLevel: "locked" }),
    });

    expect(checkedLevel(wrapper)).toBeUndefined();

    // Any other change of the tab hands the stored level on untouched.
    await wrapper.find("input[role='switch']").trigger("click");
    await settle(wrapper);

    const emitted = wrapper.emitted("update:instance");
    expect(emitted.at(-1)[0].tenantInitialSupervisionLevel).toBe("locked");
  });

  it("emits the chosen start level with the instance", async () => {
    const wrapper = mountTab();

    await levelGroup(wrapper).find("input[value=supervised]").trigger("click");
    await settle(wrapper);

    const emitted = wrapper.emitted("update:instance");
    expect(emitted.at(-1)[0].tenantInitialSupervisionLevel).toBe("supervised");
  });

  it("shows a refusal of the start level at the field until it is changed", async () => {
    const wrapper = mountTab();

    wrapper.vm.showApiErrors([
      {
        field: "tenantInitialSupervisionLevel",
        code: "invalid_supervision_level",
      },
      { field: "copyright", code: "too_long" },
    ]);
    await settle(wrapper);

    const messages = levelGroup(wrapper).findAll(".v-messages__message");
    expect(messages.length).toBe(1);
    expect(messages.at(0).text()).toBe(
      "Als Startstufe sind nur frei, beaufsichtigt oder Freigabe ausstehend zulässig."
    );

    await levelGroup(wrapper).find("input[value=pending]").trigger("click");
    await settle(wrapper);

    expect(levelGroup(wrapper).find(".v-messages__message").exists()).toBe(
      false
    );
  });
});
