import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

const { userState } = vi.hoisted(() => ({
  userState: {
    data: { user: { id: "u1" }, permissions: { instanceOwner: true } },
  },
}));

vi.mock("@/store/modules/user", () => ({ default: { state: userState } }));
vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: {
    getBookables: vi.fn(),
    publicBookableCountCheck: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiTagsService", () => ({
  default: { getTags: vi.fn() },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));
vi.mock("@/components/commons/Search.vue", () => ({
  default: {
    name: "Search",
    props: ["items", "value"],
    render(h) {
      return h("div", { class: "search-stub" });
    },
  },
}));
vi.mock("@/components/Bookable/BookableCard.vue", () => ({
  default: {
    name: "BookableCard",
    props: ["item", "editRoute", "fromRoute"],
    render(h) {
      return h("div", { class: "bookable-card-stub" });
    },
  },
}));

import Rooms from "@/views/Bookables/Rooms/Rooms.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiTagsService from "@/services/api/ApiTagsService";

const FORBIDDEN_NOTICE = "Sie haben keinen Zugriff auf Buchungsobjekte.";

async function mountRooms() {
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant-1" },
      },
      loading: {
        namespaced: true,
        getters: { isLoading: () => false },
        actions: { start: vi.fn(), stop: vi.fn() },
      },
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(Rooms, {
    store,
    mocks: { $router: { currentRoute: { name: "rooms" } } },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * Stands for the four bookable list screens (rooms, resources, locations,
 * tickets), which share this fetch-and-swallow shape. A 403 used to land in
 * `console.log` and leave an empty grid behind, which says "there are no
 * rooms" where the truth is "you may not see them".
 */
describe("Rooms", () => {
  it("names the denial instead of showing an empty grid", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    ApiBookablesService.publicBookableCountCheck.mockResolvedValue(true);
    ApiTagsService.getTags.mockResolvedValue({ data: [] });

    const wrapper = await mountRooms();
    expect(wrapper.text()).toContain(FORBIDDEN_NOTICE);
  });

  it("says nothing when the list is empty but permitted", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    ApiBookablesService.publicBookableCountCheck.mockResolvedValue(true);
    ApiTagsService.getTags.mockResolvedValue({ data: [] });

    const wrapper = await mountRooms();
    expect(wrapper.text()).not.toContain(FORBIDDEN_NOTICE);
  });

  it("clears the notice once a later fetch succeeds", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    ApiBookablesService.publicBookableCountCheck.mockResolvedValue(true);
    ApiTagsService.getTags.mockResolvedValue({ data: [] });

    const wrapper = await mountRooms();
    expect(wrapper.text()).toContain(FORBIDDEN_NOTICE);

    ApiBookablesService.getBookables.mockResolvedValue({
      data: [{ id: "r1", type: "room", title: "Room" }],
    });
    wrapper.vm.fetchRooms();
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain(FORBIDDEN_NOTICE);
  });
});
