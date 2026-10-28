import { describe, it, expect, vi } from "vitest";
import Vuex from "vuex";
import UserEdit from "@/components/User/UserEdit.vue";
import ApiUsersService from "@/services/api/ApiUsersService";
import { mountComponent } from "@tests/unit/support/mount";
import { dialogButton } from "@tests/unit/support/dialog";
import { flushPromises, serverError } from "@tests/unit/support/api";

const SETTINGS_TAB = 3;

function mountDialog(user) {
  const addToast = vi.fn();
  const store = new Vuex.Store({
    modules: {
      loading: { namespaced: true, actions: { start() {}, stop() {} } },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  const wrapper = mountComponent(UserEdit, {
    propsData: { open: true, user },
    store,
  });
  return { wrapper, addToast };
}

/** A person as `GET /api/users` lists them, here without a name. */
function unverifiedUser(fields = {}) {
  return {
    id: "person@example.org",
    created: Date.now(),
    isVerified: false,
    isSuspended: false,
    authType: "local",
    ...fields,
  };
}

async function tickVerified(wrapper) {
  wrapper.vm.activeTab = SETTINGS_TAB;
  await flushPromises();
  const box = Array.from(
    document.querySelectorAll(".v-dialog--active input[type=checkbox]")
  ).find((el) => el.closest(".v-input")?.textContent.includes("Verifiziert"));
  box.click();
  await flushPromises();
}

describe("UserEdit", () => {
  // ECCdigital/tickets#654: a person without a name could be ticked as
  // verified, but „Speichern“ stayed locked without saying why.
  it.each([
    ["without a name", {}],
    ["with blank names", { firstName: " ", lastName: "" }],
  ])("saves the verification of a person %s", async (_, names) => {
    const submit = vi
      .spyOn(ApiUsersService, "submitUser")
      .mockResolvedValue({ status: 200 });
    const { wrapper } = mountDialog(unverifiedUser(names));
    await tickVerified(wrapper);

    const save = dialogButton("Speichern");
    expect(save.disabled).toBe(false);
    save.click();
    await flushPromises();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({ isVerified: true });
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("tells a failed save and keeps the dialog open", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(ApiUsersService, "submitUser").mockRejectedValue(serverError());
    const { wrapper, addToast } = mountDialog(
      unverifiedUser({ firstName: "Tina", lastName: "Weber" })
    );
    await tickVerified(wrapper);

    dialogButton("Speichern").click();
    await flushPromises();

    expect(addToast).toHaveBeenCalledTimes(1);
    expect(addToast.mock.calls[0][1]).toMatchObject({
      type: "error",
      title: "Fehler beim Speichern",
    });
    expect(wrapper.emitted("close")).toBeUndefined();
  });
});
