import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { allowUpdate: () => true },
}));

import FormLayout from "@/layouts/Form.vue";

let level;

/** The event editor's layout - a page of the current tenant, too. */
function mountLayout() {
  const store = new Vuex.Store({
    modules: {
      events: {
        namespaced: true,
        state: { form: { id: null } },
        actions: { clearForm: vi.fn() },
      },
      user: {
        namespaced: true,
        getters: { supervisionLevelOf: () => () => level },
      },
      tenants: {
        namespaced: true,
        getters: {
          currentTenantId: () => "tenant-a",
          currentTenant: () => ({ id: "tenant-a", name: "SV Blau-Weiß" }),
          currentSupervisionLevel: () => null,
        },
      },
    },
  });
  return mountComponent(FormLayout, { store, mocks: { $router: {} } });
}

const banner = (wrapper) =>
  wrapper.find("[data-test='supervision-pending-banner']");

beforeEach(() => {
  level = "pending";
});

describe("FormLayout — the band of a waiting tenant", () => {
  it("stands under the title of the event editor", () => {
    const wrapper = mountLayout();

    expect(banner(wrapper).exists()).toBe(true);
    expect(
      wrapper
        .find("h1")
        .element.compareDocumentPosition(banner(wrapper).element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("is not there once the tenant is approved", () => {
    level = "supervised";
    const wrapper = mountLayout();

    expect(banner(wrapper).exists()).toBe(false);
  });
});
