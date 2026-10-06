import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantUsers: vi.fn() },
}));
vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn() },
}));

import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";
import TenantEditWorkflowStatusDialog from "@/components/Tenant/TenantEditWorkflowStatusDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";

const TENANT_ID = "tenant-a";

function emailStatus(sendTo) {
  return {
    id: "s1",
    name: "Eingegangen",
    tasks: [],
    actions: [
      { type: "email", receiverType: "user", sendTo, bookingStatus: [] },
    ],
  };
}

function mountDialog(states) {
  return mountComponent(TenantEditWorkflowStatusDialog, {
    propsData: { open: true, states, tenantId: TENANT_ID },
  });
}

async function flush(wrapper) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

function button(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((candidate) => candidate.text() === label);
}

function userPicker(wrapper) {
  return wrapper.findComponent({ name: "v-combobox" });
}

/**
 * `v-dialog` detaches its content, so the wrapper element itself stays empty -
 * the chips are reachable through the component tree, not through its DOM.
 */
function recipientChips(wrapper) {
  return wrapper.findAll(".v-chip").wrappers.map((chip) => chip.text());
}

/** Opens the recipient dropdown and picks the entry with that label. */
async function pickRecipient(wrapper, label) {
  const input = userPicker(wrapper).find("input");
  await input.trigger("focus");
  await input.trigger("click");
  await flush(wrapper);

  await wrapper
    .findAll(".v-list-item")
    .wrappers.find((item) => item.text() === label)
    .trigger("click");
  await flush(wrapper);
}

beforeEach(() => {
  ApiRolesService.getTenantRoles.mockResolvedValue({ data: [] });
  ApiTenantService.getTenantUsers.mockResolvedValue({
    users: [{ userId: "anna@example.org" }, { userId: "bernd@example.org" }],
    userDetails: [
      { id: "anna@example.org", firstName: "Anna", lastName: "Admin" },
      { id: "bernd@example.org", firstName: "Bernd", lastName: "Bucher" },
    ],
  });
});

describe("TenantEditWorkflowStatusDialog", () => {
  it("offers only the members of this tenant as recipients", async () => {
    const wrapper = mountDialog(emailStatus([]));
    await flush(wrapper);

    expect(ApiTenantService.getTenantUsers).toHaveBeenCalledWith(TENANT_ID);
    expect(
      userPicker(wrapper)
        .props("items")
        .map((item) => [item.userId, item.label])
    ).toEqual([
      ["anna@example.org", "Anna Admin"],
      ["bernd@example.org", "Bernd Bucher"],
    ]);
  });

  it("says so when the member list cannot be read, instead of calling every recipient unknown", async () => {
    ApiTenantService.getTenantUsers.mockRejectedValue(new Error("403"));
    const wrapper = mountDialog(emailStatus(["anna@example.org"]));
    await flush(wrapper);

    expect(userPicker(wrapper).props("items")).toEqual([]);
    expect(wrapper.find(".v-alert--dense").text()).toContain(
      "konnten nicht geladen werden"
    );
    expect(recipientChips(wrapper)).toEqual(["anna@example.org"]);
  });

  it("labels a stored recipient outside this tenant as unknown", async () => {
    const wrapper = mountDialog(emailStatus(["ghost@example.org"]));
    await flush(wrapper);

    expect(recipientChips(wrapper)).toEqual([
      "ghost@example.org (Unbekannter Empfänger)",
    ]);
  });

  it("names a stored recipient that is a member of this tenant", async () => {
    const wrapper = mountDialog(emailStatus(["anna@example.org"]));
    await flush(wrapper);

    expect(recipientChips(wrapper)).toEqual(["Anna Admin"]);
  });

  it("carries an unresolvable recipient through a save unchanged", async () => {
    const wrapper = mountDialog(emailStatus(["ghost@example.org"]));
    await flush(wrapper);

    // Picking a member from the narrowed list must not drop the id that is no
    // longer resolvable - only the admin removing the chip may do that.
    await pickRecipient(wrapper, "Anna Admin");

    await button(wrapper, "Übernehmen").trigger("click");

    const [saved] = wrapper.emitted("save").at(-1);
    expect(saved.actions[0].sendTo).toEqual([
      "ghost@example.org",
      "anna@example.org",
    ]);
  });

  it("drops a recipient the admin removes from the chip", async () => {
    const wrapper = mountDialog(
      emailStatus(["ghost@example.org", "anna@example.org"])
    );
    await flush(wrapper);

    await wrapper.findAll(".v-chip__close").at(0).trigger("click");
    await button(wrapper, "Übernehmen").trigger("click");

    const [saved] = wrapper.emitted("save").at(-1);
    expect(saved.actions[0].sendTo).toEqual(["anna@example.org"]);
  });
});
