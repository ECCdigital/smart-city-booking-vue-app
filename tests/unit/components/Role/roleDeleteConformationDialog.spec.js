import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";

vi.mock("@/services/api/ApiRolesService", () => ({
  default: { deleteRole: vi.fn() },
}));

import RoleDeleteDialog from "@/components/Role/roleDeleteConformationDialog.vue";
import ApiRolesService from "@/services/api/ApiRolesService";

const ROLE = { id: "role1", name: "Kasse" };
const IN_USE =
  "Die Rolle wird noch verwendet (Mitgliedschaften: 2, offene Einladungen: 1). Weisen Sie den Mitgliedern eine andere Rolle zu oder ziehen Sie die Einladungen zurück.";

function store() {
  return new Vuex.Store({
    modules: {
      tenants: { namespaced: true, getters: { currentTenantId: () => "t1" } },
    },
  });
}

/** `v-dialog` detaches its content, so the card is read through the tree. */
function card(wrapper) {
  return wrapper.findComponent({ name: "v-card" });
}

async function clickButton(wrapper, text) {
  const button = card(wrapper)
    .findAll("button")
    .wrappers.find((candidate) => candidate.text().includes(text));
  await button.trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

async function openDialog() {
  const wrapper = mountComponent(RoleDeleteDialog, {
    store: store(),
    propsData: { open: false, toDelete: ROLE },
  });
  await wrapper.setProps({ open: true });
  return wrapper;
}

describe("roleDeleteConformationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays open and names both counts when the role is still in use", async () => {
    ApiRolesService.deleteRole.mockRejectedValue(
      lifecycleError(409, "role_in_use", {
        roleId: "role1",
        memberships: 2,
        invitations: 1,
      })
    );
    const wrapper = await openDialog();

    await clickButton(wrapper, "Löschen");

    expect(wrapper.emitted("close")).toBeUndefined();
    expect(card(wrapper).text()).toContain(IN_USE);
  });

  it("closes after a successful delete", async () => {
    ApiRolesService.deleteRole.mockResolvedValue({});
    const wrapper = await openDialog();

    await clickButton(wrapper, "Löschen");

    expect(ApiRolesService.deleteRole).toHaveBeenCalledWith(ROLE);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("stays open with a general message when the delete fails otherwise", async () => {
    ApiRolesService.deleteRole.mockRejectedValue(serverError(500));
    const wrapper = await openDialog();

    await clickButton(wrapper, "Löschen");

    expect(wrapper.emitted("close")).toBeUndefined();
    expect(card(wrapper).text()).toContain(
      "Die Rolle konnte nicht gelöscht werden."
    );
  });

  it("shows no earlier refusal after closing and opening again", async () => {
    ApiRolesService.deleteRole.mockRejectedValue(
      lifecycleError(409, "role_in_use", { memberships: 2, invitations: 1 })
    );
    const wrapper = await openDialog();
    await clickButton(wrapper, "Löschen");

    await clickButton(wrapper, "Abbrechen");
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(card(wrapper).text()).not.toContain(IN_USE);
  });
});
