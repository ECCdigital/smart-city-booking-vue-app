import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import InstanceEditOwners from "@/components/Instance/Edit/InstanceEditOwners.vue";

function mountTab(ownerUserIds) {
  return mountComponent(InstanceEditOwners, {
    propsData: { instance: { id: "instance", ownerUserIds } },
  });
}

const missing = (wrapper) => wrapper.find("[data-test='owners-missing']");

async function removeOwner(wrapper, index = 0) {
  await wrapper
    .findAll("[data-test='remove-owner']")
    .at(index)
    .trigger("click");
  await wrapper.vm.$nextTick();
}

describe("InstanceEditOwners last admin", () => {
  it("says nothing while the instance has an admin", async () => {
    const wrapper = mountTab(["admin", "other"]);

    await removeOwner(wrapper);

    expect(missing(wrapper).exists()).toBe(false);
    expect(await wrapper.vm.validate()).toBe(true);
  });

  it("names the missing admin once the last one is removed and keeps the save back", async () => {
    const wrapper = mountTab(["admin"]);

    await removeOwner(wrapper);

    expect(await wrapper.vm.validate()).toBe(false);
    expect(missing(wrapper).text()).toBe(
      "Die Instanz braucht mindestens einen Admin. Fügen Sie einen Admin hinzu."
    );
  });
});
