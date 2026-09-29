import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

/**
 * The tenant selector of the navigation (`Navbar.vue`) - a spec of its own
 * beside the rest of the navbar, so that the two grow without colliding.
 */
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn(async () => ({ data: tenants })) },
}));
vi.mock("@/services/api/ApiAuthService", () => ({ default: {} }));
vi.mock("@/services/api/ApiClientService", () => ({ default: {} }));
vi.mock("@/services/KeycloakService", () => ({ default: {} }));
vi.mock("@/components/NotificationDisplay", () => ({
  default: { name: "NotificationDisplay", render: () => null },
}));

import Navbar from "@/components/Navbar.vue";

const OPEN = { id: "tenant-a", name: "Volkshochschule" };
const DECLINED = { id: "tenant-b", name: "Makerspace Nord" };

let tenants;
let currentTenantId;
let declinedIds;
let selected;

function mountNavbar() {
  const store = new Vuex.Store({
    modules: {
      user: {
        namespaced: true,
        getters: {
          getUser: () => ({ firstName: "Petra" }),
          isAuthorized: () => () => false,
          declinedMembership: () => (tenantId) =>
            declinedIds.includes(tenantId)
              ? { tenantId, supervisionLevel: "declined" }
              : null,
        },
        actions: { delete: vi.fn() },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => currentTenantId },
        actions: {
          select: (context, tenantId) => {
            selected.push(tenantId);
          },
        },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  return mountComponent(Navbar, { store, stubs: ["router-link"] });
}

async function openSelector(wrapper) {
  await flushPromises();
  await wrapper.find("#nav .v-select__slot").trigger("click");
  await wrapper.vm.$nextTick();
  return [...document.querySelectorAll(".v-menu__content .v-list-item")];
}

const entryOf = (entries, name) =>
  entries.find((entry) => entry.textContent.includes(name));

beforeEach(() => {
  tenants = [OPEN, DECLINED];
  currentTenantId = "tenant-a";
  declinedIds = ["tenant-b"];
  selected = [];
});

describe("Navbar — tenant selector", () => {
  it("greys out a declined tenant with the chip „abgewiesen“ instead of hiding it", async () => {
    const wrapper = mountNavbar();

    const entries = await openSelector(wrapper);
    const declined = entryOf(entries, "Makerspace Nord");

    expect(declined).toBeDefined();
    expect(declined.classList).toContain("v-list-item--disabled");
    expect(declined.textContent).toContain("abgewiesen");
    const open = entryOf(entries, "Volkshochschule");
    expect(open.classList).not.toContain("v-list-item--disabled");
    expect(open.textContent).not.toContain("abgewiesen");
  });

  it("selects nothing on a click on the declined tenant", async () => {
    const wrapper = mountNavbar();

    const entries = await openSelector(wrapper);
    entryOf(entries, "Makerspace Nord").click();
    await flushPromises();

    expect(selected).toEqual([]);
  });

  it("keeps a declined tenant selectable where the membership is not closed", async () => {
    // The getter hands an instance owner no declined membership.
    declinedIds = [];
    const wrapper = mountNavbar();

    const entries = await openSelector(wrapper);
    const declined = entryOf(entries, "Makerspace Nord");
    expect(declined.classList).not.toContain("v-list-item--disabled");

    declined.click();
    await flushPromises();
    expect(selected).toEqual(["tenant-b"]);
  });

  it("still picks the only tenant of a user without a selection", async () => {
    tenants = [OPEN];
    currentTenantId = null;
    mountNavbar();
    await flushPromises();

    expect(selected).toEqual(["tenant-a"]);
  });

  it("never picks an only tenant that is declined", async () => {
    tenants = [DECLINED];
    currentTenantId = null;
    mountNavbar();
    await flushPromises();

    expect(selected).toEqual([]);
  });
});
