import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantUsers: vi.fn() },
}));
vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn() },
}));

import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";
import TenantEditWorkflow from "@/components/Tenant/Edit/TenantEditWorkflow.vue";
import TenantEditWorkflowStatusDialog from "@/components/Tenant/TenantEditWorkflowStatusDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";

const TENANT = { id: "tenant-a" };

function workflowWithRecipients(sendTo) {
  return {
    active: true,
    states: [
      {
        id: "s1",
        name: "Eingegangen",
        tasks: [],
        actions: [
          { type: "email", receiverType: "user", sendTo, bookingStatus: [] },
        ],
      },
    ],
    eventStateMapping: {},
  };
}

function mountWorkflow(workflow) {
  return mountComponent(TenantEditWorkflow, {
    propsData: { tenant: TENANT, workflow },
  });
}

async function flush(wrapper) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

/** The action summary lives in the collapsed panel body; open it like a user. */
async function openFirstStatus(wrapper) {
  await wrapper.find(".v-expansion-panel-header").trigger("click");
  await flush(wrapper);
}

beforeEach(() => {
  ApiRolesService.getTenantRoles.mockResolvedValue({ data: [] });
  ApiTenantService.getTenantUsers.mockResolvedValue({
    users: [{ userId: "anna@example.org" }],
    userDetails: [
      { id: "anna@example.org", firstName: "Anna", lastName: "Admin" },
    ],
  });
});

describe("TenantEditWorkflow", () => {
  it("reads the recipient list from the tenant's members", async () => {
    const wrapper = mountWorkflow(workflowWithRecipients([]));
    await flush(wrapper);

    expect(ApiTenantService.getTenantUsers).toHaveBeenCalledWith("tenant-a");
  });

  it("names a recipient that is a member of this tenant", async () => {
    const wrapper = mountWorkflow(workflowWithRecipients(["anna@example.org"]));
    await flush(wrapper);
    await openFirstStatus(wrapper);

    expect(wrapper.text()).toContain("Anna Admin");
  });

  it("keeps an unresolvable recipient when the status dialog saves", async () => {
    const workflow = workflowWithRecipients(["ghost@example.org"]);
    const wrapper = mountWorkflow(workflow);
    await flush(wrapper);

    await wrapper.find(".mdi-pencil").trigger("click");
    await flush(wrapper);

    const dialog = wrapper.findComponent(TenantEditWorkflowStatusDialog);
    const input = dialog.findComponent({ name: "v-combobox" }).find("input");
    await input.trigger("focus");
    await input.trigger("click");
    await flush(wrapper);
    await dialog
      .findAll(".v-list-item")
      .wrappers.find((item) => item.text() === "Anna Admin")
      .trigger("click");
    await flush(wrapper);

    await dialog
      .findAll("button")
      .wrappers.find((b) => b.text() === "Übernehmen")
      .trigger("click");
    await flush(wrapper);

    const [emitted] = wrapper.emitted("update:workflow").at(-1);
    expect(emitted.states[0].actions[0].sendTo).toEqual([
      "ghost@example.org",
      "anna@example.org",
    ]);
  });

  it("does not call a recipient unknown when the member list could not be read", async () => {
    ApiTenantService.getTenantUsers.mockRejectedValue(new Error("403"));
    const wrapper = mountWorkflow(workflowWithRecipients(["anna@example.org"]));
    await flush(wrapper);
    await openFirstStatus(wrapper);

    expect(wrapper.text()).toContain("anna@example.org");
    expect(wrapper.text()).not.toContain("Unbekannter Empfänger");
    expect(wrapper.text()).toContain("konnten nicht geladen werden");
  });

  it("marks a recipient outside this tenant as unknown instead of hiding it", async () => {
    const wrapper = mountWorkflow(
      workflowWithRecipients(["ghost@example.org"])
    );
    await flush(wrapper);
    await openFirstStatus(wrapper);

    expect(wrapper.text()).toContain("ghost@example.org");
    expect(wrapper.text()).toContain("Unbekannter Empfänger");
  });
});
