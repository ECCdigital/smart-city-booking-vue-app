import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { allowUpdate: vi.fn() },
}));

import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import SupervisionPendingBanner from "@/components/Supervision/SupervisionPendingBanner.vue";

const BAND_TEXT =
  "Freigabe ausstehend. Der Betreiber prüft den Mandanten ‚SV Blau-Weiß‘. " +
  "Du kannst Angebote vollständig vorbereiten; öffentlich wird nichts, bis " +
  "der Betreiber freigegeben hat. Du erhältst eine Mail.";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

let push;

/**
 * `membershipLevel` is what the sign-in names for the current tenant
 * (`permissions.tenants[]`), `adminLevel` what the admin DTO of the tenant
 * says (`tenants/currentSupervisionLevel`) - the only source for an instance
 * owner without a membership.
 */
function mountBanner({ membershipLevel = null, adminLevel = null } = {}) {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        state: { level: membershipLevel },
        getters: {
          supervisionLevelOf: (state) => (tenantId) =>
            tenantId === "tenant-a" ? state.level : null,
        },
        mutations: {
          RELOADED(state, level) {
            state.level = level;
          },
        },
      },
      tenants: {
        namespaced: true,
        getters: {
          currentTenantId: () => "tenant-a",
          currentTenant: () => ({ id: "tenant-a", name: "SV Blau-Weiß" }),
          currentSupervisionLevel: () => adminLevel,
        },
      },
    },
  });
  const wrapper = mountComponent(SupervisionPendingBanner, {
    store,
    mocks: { $router: { push } },
  });
  return { wrapper, store };
}

beforeEach(() => {
  push = vi.fn();
  TenantPermissionService.allowUpdate.mockReturnValue(true);
});

describe("SupervisionPendingBanner", () => {
  it("tells a waiting tenant that it may prepare and the operator approves", () => {
    const { wrapper } = mountBanner({ membershipLevel: "pending" });

    const band = find(wrapper, "supervision-pending-banner");
    expect(band.exists()).toBe(true);
    expect(find(wrapper, "pending-banner-text").text()).toBe(BAND_TEXT);
    // Not dismissible: it stays while the tenant waits.
    expect(band.find(".v-alert__dismissible").exists()).toBe(false);
  });

  it("shows nothing at any other level or while the level is unknown", () => {
    for (const level of ["free", "supervised", "declined", "blocked", null]) {
      const { wrapper } = mountBanner({ membershipLevel: level });

      expect(find(wrapper, "supervision-pending-banner").exists()).toBe(false);
    }
  });

  it("shows the band to an instance owner editing a waiting tenant, from the tenant's own level", () => {
    const { wrapper } = mountBanner({ adminLevel: "pending" });

    expect(find(wrapper, "supervision-pending-banner").exists()).toBe(true);
  });

  it("disappears once the reloaded permissions name another level", async () => {
    const { wrapper, store } = mountBanner({
      membershipLevel: "pending",
      adminLevel: "pending",
    });

    store.commit("user/RELOADED", "supervised");
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "supervision-pending-banner").exists()).toBe(false);
  });

  it("continues the setup with a new bookable in the guided flow", async () => {
    const { wrapper } = mountBanner({ membershipLevel: "pending" });

    const resume = find(wrapper, "pending-banner-resume");
    expect(resume.text()).toBe("Einrichtung fortsetzen");
    await resume.trigger("click");

    expect(push).toHaveBeenCalledWith({ name: "room-edit" });
  });

  it("offers the setup only to who may edit the tenant", () => {
    TenantPermissionService.allowUpdate.mockReturnValue(false);
    const { wrapper } = mountBanner({ membershipLevel: "pending" });

    expect(find(wrapper, "supervision-pending-banner").exists()).toBe(true);
    expect(find(wrapper, "pending-banner-resume").exists()).toBe(false);
  });
});
