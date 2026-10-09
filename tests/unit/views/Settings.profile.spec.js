import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

// `user.js` reaches back into the store root for the current tenant, which
// makes the module circular; the double breaks the cycle for the spec.
vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
// The sign-in is written through to the local storage, as the app reloads it
// from there.
vi.mock("@/services/PersistenceService", () => ({
  default: {
    getFromLocalStorage: vi.fn(() => null),
    writeToLocalStorage: vi.fn(),
    removeFromLocalStorage: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiUsersService", () => ({
  default: { updateMe: vi.fn() },
}));
// The layout's profile menu reads the signed-in user's first name, as the
// navbar does (`Navbar.vue`): it breaks when the store loses the user.
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      const user = this.$store.getters["user/getUser"];
      return h("div", [
        h("span", { class: "profile-name" }, user.firstName),
        h("div", this.$slots.default),
      ]);
    },
  },
}));

import Settings from "@/views/Settings.vue";
import userModule from "@/store/modules/user";
import ApiUsersService from "@/services/api/ApiUsersService";
import PersistenceService from "@/services/PersistenceService";

const PERMISSIONS = {
  instanceOwner: false,
  tenants: [{ tenantId: "tenant-1", adminInterfaces: ["bookings"] }],
};

const ME = {
  id: "erika@example.org",
  firstName: "Erika",
  lastName: "Muster",
  company: "ECC",
  vatId: "",
  phone: "0123",
  address: "Hauptstraße 1",
  zipCode: "12345",
  city: "Musterstadt",
};

function createStore() {
  return new Vuex.Store({
    modules: {
      user: {
        ...userModule,
        state: () => ({
          data: { user: { ...ME }, permissions: PERMISSIONS },
        }),
      },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant-1" },
      },
      loading: {
        namespaced: true,
        getters: { isLoading: () => false },
        actions: { start: vi.fn(), stop: vi.fn() },
      },
      toasts: {
        namespaced: true,
        actions: { add: vi.fn() },
      },
    },
  });
}

function buttonLabelled(wrapper, label) {
  return wrapper
    .findAll("button")
    .filter((button) => button.text().includes(label)).wrappers[0];
}

/** Opens the panel headed `header` and saves `value` in its field `label`. */
async function saveField(wrapper, header, label, value) {
  await buttonLabelled(wrapper, header).trigger("click");
  await wrapper.vm.$nextTick();
  const field = wrapper
    .findAll(".v-text-field")
    .filter((f) => f.find("label").text() === label).wrappers[0];
  await field.find("input").setValue(value);
  // A panel renders its content once opened, so only this panel saves here.
  await buttonLabelled(wrapper, "Änderungen speichern").trigger("click");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * `PUT /api/user` answers with the bare user, while the store holds the
 * sign-in (`{ user, permissions }`, as `/me` answers). Saving used to put
 * the bare user in its place: the store lost the user and the permissions,
 * and everything reading the signed-in user threw
 * `Cannot read properties of undefined (reading 'firstName')`.
 */
describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiUsersService.updateMe.mockImplementation((user) =>
      Promise.resolve({ data: { ...user } })
    );
    vi.spyOn(console, "error");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["Vor- und Nachname ändern", "Vorname", "firstName", "Erik"],
    ["Firma ändern", "Firma", "company", "ECC Digital"],
    [
      "Umsatzsteuer-ID ändern",
      "Umsatzsteuer-ID (optional)",
      "vatId",
      "DE123456789",
    ],
    ["Telefonnummer ändern", "Telefonnummer", "phone", "0456"],
    [
      "Straße und Hausnummer ändern",
      "Straße und Hausnummer",
      "address",
      "Nebenstraße 2",
    ],
    ["Postleitzahl ändern", "Postleitzahl", "zipCode", "54321"],
    ["Wohnort ändern", "Wohnort", "city", "Neustadt"],
  ])(
    "saving „%s“ keeps the signed-in user and logs no error",
    async (header, label, key, value) => {
      const store = createStore();
      // `date` is registered globally in `main.js`.
      const wrapper = mountComponent(Settings, {
        store,
        filters: { date: (value) => value },
      });
      await wrapper.vm.$nextTick();

      await saveField(wrapper, header, label, value);

      expect(ApiUsersService.updateMe).toHaveBeenCalledTimes(1);
      expect(store.getters["user/getUser"]).toMatchObject({ [key]: value });
      expect(store.state.user.data.permissions).toEqual(PERMISSIONS);
      expect(PersistenceService.writeToLocalStorage).toHaveBeenLastCalledWith(
        "user",
        store.state.user.data
      );
      expect(wrapper.find(".profile-name").exists()).toBe(true);
      expect(console.error).not.toHaveBeenCalled();
    }
  );
});
