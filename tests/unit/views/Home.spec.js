import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    getTenants: vi.fn(async () => ({ data: [] })),
    getReadiness: vi.fn((tenantId) => readiness(tenantId)),
  },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    isTenantOwner: (tenantId) => ownedTenantIds.includes(tenantId),
    isTenantMember: (tenantId) => memberTenantIds.includes(tenantId),
  },
}));
vi.mock("@/layouts/Admin", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));
vi.mock("@/components/Tenant/PendingApprovals.vue", () => ({
  default: { name: "PendingApprovals", render: () => null },
}));
vi.mock("@/components/Tenant/PendingTenantInvitations.vue", () => ({
  default: { name: "PendingTenantInvitations", render: () => null },
}));

import Home from "@/views/Home.vue";

const TENANT_A = {
  id: "tenant-a",
  name: "Musterstadt",
  contactName: "Erika Muster",
  mail: "info@musterstadt.de",
  location: "Musterstadt",
};
const TENANT_B = { id: "tenant-b", name: "Beispielhausen" };

let tenants;

const VIEW_STORAGE_KEY = "scb.tenant-home.view";

let authorizedInterfaces;
let permissionsLoaded;
let push;
let selected;

let redirect;
let ownedTenantIds;
let memberTenantIds;
// The supervision the sign-in names per membership (`permissions.tenants[]`).
let memberships;
let instanceOwner;
// The readiness answer per tenant; the default is a tenant without offers.
let readiness;

function readinessWithOffers(state) {
  return Promise.resolve({
    checkedAt: "2026-09-22T08:00:00.000Z",
    criteria: [{ key: "offers", state }],
  });
}

function mountHome() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { tenants: () => tenants, currentTenantId: () => null },
        actions: {
          select: (context, tenantId) => {
            selected = tenantId;
          },
          setTenants: vi.fn(),
        },
      },
      user: {
        namespaced: true,
        getters: {
          allowToCreateTenants: () => false,
          // Mirrors the real getter: denied only where the reach is known.
          isDenied: () => (ifce) =>
            permissionsLoaded && !authorizedInterfaces.includes(ifce),
          supervisionLevelOf: () => (tenantId) =>
            memberships.find((m) => m.tenantId === tenantId)
              ?.supervisionLevel ?? null,
          declinedMembership: () => (tenantId) =>
            (!instanceOwner &&
              memberships.find(
                (m) =>
                  m.tenantId === tenantId && m.supervisionLevel === "declined"
              )) ||
            null,
        },
      },
    },
  });

  return mountComponent(Home, {
    store,
    mocks: {
      $router: { push, resolve: () => ({ route: { matched: [{}] } }) },
      $route: { query: redirect ? { redirect } : {} },
    },
  });
}

beforeEach(() => {
  authorizedInterfaces = ["bookings"];
  permissionsLoaded = true;
  push = vi.fn();
  selected = null;
  redirect = null;
  ownedTenantIds = [];
  memberTenantIds = ["tenant-a"];
  readiness = () => readinessWithOffers("missing");
  tenants = [TENANT_A];
  memberships = [];
  instanceOwner = false;
  window.localStorage.removeItem(VIEW_STORAGE_KEY);
});

describe("Home — picking a tenant", () => {
  it("opens the booking list of the picked tenant", async () => {
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(selected).toBe("tenant-a");
    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });

  it("stays on the overview when the membership has no booking reach", async () => {
    authorizedInterfaces = ["rooms"];
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(selected).toBe("tenant-a");
    expect(push).not.toHaveBeenCalled();
  });

  it("follows a redirect the user asked for, reach or not — the router explains the refusal there", async () => {
    redirect = "/coupons";
    authorizedInterfaces = [];
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(push).toHaveBeenCalledWith("/coupons");
  });

  it("keeps opening the booking list while the reach is unknown", async () => {
    permissionsLoaded = false;
    authorizedInterfaces = [];
    const wrapper = mountHome();

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });
});

describe("Home — guided setup", () => {
  it("offers to resume the setup on a tenant the user owns", async () => {
    ownedTenantIds = ["tenant-a"];
    const wrapper = mountHome();

    await wrapper.find("[data-test='resume-onboarding']").trigger("click");

    expect(push).toHaveBeenCalledWith({
      name: "tenant-onboarding",
      query: { tenant: "tenant-a" },
    });
    expect(selected).toBeNull();
  });

  it("offers no setup on a tenant of someone else", () => {
    const wrapper = mountHome();

    expect(wrapper.find("[data-test='resume-onboarding']").exists()).toBe(
      false
    );
  });

  it("offers no setup on an own tenant that already has an offer with the publication wish", async () => {
    ownedTenantIds = ["tenant-a"];
    readiness = () => readinessWithOffers("fulfilled");
    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.find("[data-test='resume-onboarding']").exists()).toBe(
      false
    );
  });

  it("keeps offering the setup while the readiness is unknown or refused", async () => {
    ownedTenantIds = ["tenant-a"];
    readiness = () => Promise.reject(new Error("down"));
    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.find("[data-test='resume-onboarding']").exists()).toBe(true);
  });

  it("asks the readiness of the own tenants only", async () => {
    tenants = [TENANT_A, TENANT_B];
    ownedTenantIds = ["tenant-a"];
    const asked = vi.fn(() => readinessWithOffers("missing"));
    readiness = asked;
    mountHome();
    await flushPromises();

    expect(asked).toHaveBeenCalledTimes(1);
    expect(asked).toHaveBeenCalledWith("tenant-a");
  });
});

describe("Home — grid or list", () => {
  it("opens as the grid of cards", () => {
    const wrapper = mountHome();

    expect(wrapper.find("[data-test='tenant-grid']").exists()).toBe(true);
    expect(wrapper.find("[data-test='tenant-list']").exists()).toBe(false);
  });

  it("switches to hairline rows that carry name and contact", async () => {
    const wrapper = mountHome();

    await wrapper.find("[data-test='view-list']").trigger("click");

    expect(wrapper.find("[data-test='tenant-grid']").exists()).toBe(false);
    const row = wrapper.find("[data-test='tenant-row']");
    expect(row.text()).toContain("Musterstadt");
    expect(row.text()).toContain(
      "Erika Muster · info@musterstadt.de · Musterstadt"
    );
  });

  it("picks the tenant from a row as it does from a card", async () => {
    const wrapper = mountHome();
    await wrapper.find("[data-test='view-list']").trigger("click");

    await wrapper.find("[data-test='tenant-row']").trigger("click");
    await flushPromises();

    expect(selected).toBe("tenant-a");
    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });

  it("offers the setup in a row too, without picking the tenant", async () => {
    ownedTenantIds = ["tenant-a"];
    const wrapper = mountHome();
    await wrapper.find("[data-test='view-list']").trigger("click");

    await wrapper.find("[data-test='resume-onboarding']").trigger("click");

    expect(push).toHaveBeenCalledWith({
      name: "tenant-onboarding",
      query: { tenant: "tenant-a" },
    });
    expect(selected).toBeNull();
  });

  it("keeps the chosen view for the next visit", async () => {
    const wrapper = mountHome();

    await wrapper.find("[data-test='view-list']").trigger("click");
    expect(window.localStorage.getItem(VIEW_STORAGE_KEY)).toBe("list");

    const next = mountHome();
    expect(next.find("[data-test='tenant-list']").exists()).toBe(true);
  });

  it("falls back to the grid on a stored view it does not know", () => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, "table");
    const wrapper = mountHome();

    expect(wrapper.find("[data-test='tenant-grid']").exists()).toBe(true);
  });

  it("names the search miss inside the card", async () => {
    const wrapper = mountHome();

    await wrapper.find("[data-test='tenant-search']").setValue("xyz");

    expect(wrapper.find("[data-test='tenant-empty']").text()).toContain(
      "Kein Mandant passt zur Suche."
    );
  });
});

describe("Home — mine and the rest", () => {
  it("names no group while every tenant is one of mine", () => {
    const wrapper = mountHome();

    expect(wrapper.find("[data-test='tenant-group-mine']").exists()).toBe(true);
    expect(wrapper.find(".tenant-home__group-head").exists()).toBe(false);
    expect(wrapper.find("[data-test='tenant-group-others']").exists()).toBe(
      false
    );
  });

  it("splits an instance owner's view into my tenants and the rest", () => {
    tenants = [TENANT_B, TENANT_A];
    const wrapper = mountHome();

    const mine = wrapper.find("[data-test='tenant-group-mine']");
    const others = wrapper.find("[data-test='tenant-group-others']");
    expect(mine.text()).toContain("Meine Mandanten");
    expect(mine.text()).toContain("Musterstadt");
    expect(mine.text()).not.toContain("Beispielhausen");
    expect(others.text()).toContain("Weitere Mandanten");
    expect(others.text()).toContain("Beispielhausen");
    expect(others.find("[data-test='group-count']").text()).toBe("Ein Mandant");
  });

  it("keeps the headings while a search empties one group", async () => {
    tenants = [TENANT_B, TENANT_A];
    const wrapper = mountHome();

    await wrapper.find("[data-test='tenant-search']").setValue("Beispiel");

    expect(wrapper.find("[data-test='tenant-group-mine']").exists()).toBe(
      false
    );
    const others = wrapper.find("[data-test='tenant-group-others']");
    expect(others.find(".tenant-home__group-head").exists()).toBe(true);
  });
});

describe("Home — a tenant waiting for its approval", () => {
  beforeEach(() => {
    memberships = [{ tenantId: "tenant-a", supervisionLevel: "pending" }];
  });

  it("marks the card „Freigabe ausstehend“ and keeps it open", async () => {
    const wrapper = mountHome();

    const chip = wrapper.find(".tenant-card [data-test='supervision-level']");
    expect(chip.text()).toBe("Freigabe ausstehend");
    expect(chip.classes()).toContain("warning--text");

    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();
    expect(selected).toBe("tenant-a");
  });

  it("marks the row of the list as well", async () => {
    const wrapper = mountHome();
    await wrapper.find("[data-test='view-list']").trigger("click");

    expect(
      wrapper
        .find("[data-test='tenant-row'] [data-test='supervision-level']")
        .text()
    ).toBe("Freigabe ausstehend");
  });

  it("marks no tenant whose level is free or unknown", () => {
    memberships = [{ tenantId: "tenant-a", supervisionLevel: "free" }];
    const wrapper = mountHome();

    expect(wrapper.find("[data-test='supervision-level']").exists()).toBe(
      false
    );
  });
});

describe("Home — a declined tenant", () => {
  const DECLINED = {
    tenantId: "tenant-a",
    supervisionLevel: "declined",
    supervisionChangedAt: "2026-09-24T10:00:00.000Z",
    supervisionReason: "Kein Impressum",
  };

  beforeEach(() => {
    memberships = [DECLINED];
    ownedTenantIds = ["tenant-a"];
  });

  it("names level, time and reason and where the own bookings are", () => {
    const wrapper = mountHome();

    const card = wrapper.find(".tenant-card");
    expect(card.find("[data-test='supervision-level']").text()).toBe(
      "abgewiesen"
    );
    const declined = card.find("[data-test='declined-tenant']");
    expect(declined.text()).toContain("Vom Betreiber abgewiesen am 24.09.26");
    expect(declined.find("[data-test='declined-reason']").text()).toBe(
      "Begründung: „Kein Impressum“"
    );
    expect(declined.text()).toContain(
      "Deine eigenen Buchungen findest du weiter unter „Meine Buchungen“."
    );
  });

  it("writes no reason line when the change came without one", () => {
    memberships = [{ ...DECLINED, supervisionReason: null }];
    const wrapper = mountHome();

    const declined = wrapper.find("[data-test='declined-tenant']");
    expect(declined.exists()).toBe(true);
    expect(declined.find("[data-test='declined-reason']").exists()).toBe(false);
  });

  it("cannot be opened, neither by its button nor by the card", async () => {
    const wrapper = mountHome();

    const open = wrapper.find(".tenant-card__select");
    expect(open.attributes("disabled")).toBe("disabled");
    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();

    expect(selected).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("cannot be opened from the list either", async () => {
    const wrapper = mountHome();
    await wrapper.find("[data-test='view-list']").trigger("click");

    const row = wrapper.find("[data-test='tenant-row']");
    expect(row.attributes("aria-disabled")).toBe("true");
    expect(row.find("[data-test='declined-tenant']").exists()).toBe(true);
    // No chevron promising that it opens.
    expect(row.find(".tenant-row__chevron").exists()).toBe(false);
    await row.trigger("click");
    await flushPromises();

    expect(selected).toBeNull();
  });

  it("offers no setup and asks no readiness of it", async () => {
    const asked = vi.fn(() => readinessWithOffers("missing"));
    readiness = asked;
    const wrapper = mountHome();
    await flushPromises();

    expect(wrapper.find("[data-test='resume-onboarding']").exists()).toBe(
      false
    );
    expect(asked).not.toHaveBeenCalled();
  });

  it("stays open to an instance owner", async () => {
    instanceOwner = true;
    const wrapper = mountHome();

    expect(wrapper.find("[data-test='declined-tenant']").exists()).toBe(false);
    await wrapper.find(".tenant-card").trigger("click");
    await flushPromises();
    expect(selected).toBe("tenant-a");
  });
});
