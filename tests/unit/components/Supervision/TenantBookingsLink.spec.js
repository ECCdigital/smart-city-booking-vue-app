import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

import TenantBookingsLink from "@/components/Supervision/TenantBookingsLink.vue";

let currentTenantId;
const selectTenant = vi.fn();
const addToast = vi.fn();
const push = vi.fn();

function mountLink() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => currentTenantId },
        actions: { select: selectTenant },
      },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
  return mountComponent(TenantBookingsLink, {
    store,
    mocks: { $router: { push } },
    propsData: { tenant: { id: "t-7", name: "Sportverein" } },
    slots: { default: "Buchungen des Mandanten" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentTenantId = "t-1";
});

describe("TenantBookingsLink", () => {
  it("makes the tenant the current one, says so and opens its bookings", async () => {
    const wrapper = mountLink();
    expect(wrapper.text()).toBe("Buchungen des Mandanten");

    await wrapper.trigger("click");
    await flushPromises();

    expect(selectTenant).toHaveBeenCalledWith(expect.anything(), "t-7");
    expect(addToast.mock.calls[0][1].message).toBe(
      "Mandant zu „Sportverein“ gewechselt."
    );
    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });

  it("stays silent when the tenant already is the current one", async () => {
    currentTenantId = "t-7";
    const wrapper = mountLink();

    await wrapper.trigger("click");
    await flushPromises();

    expect(addToast).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });
});
