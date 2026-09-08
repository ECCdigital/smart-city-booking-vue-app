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
vi.mock("@/services/api/ApiCouponService", () => ({
  default: { getCoupons: vi.fn() },
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
vi.mock("@/components/Coupon/CouponEdit.vue", () => ({
  default: {
    name: "CouponEdit",
    props: ["coupon", "open"],
    render: () => null,
  },
}));
vi.mock("@/components/Coupon/CouponDeleteConformationDialog.vue", () => ({
  default: {
    name: "CouponDeleteConformationDialog",
    props: ["toDelete", "open"],
    render: () => null,
  },
}));

import Coupons from "@/views/Coupons.vue";
import ApiCouponService from "@/services/api/ApiCouponService";

const FORBIDDEN_NOTICE = "Sie haben keinen Zugriff auf Rabattcodes.";

async function mountCoupons() {
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
    },
  });
  const wrapper = mountComponent(Coupons, { store });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * `GET /coupons` answers a signed-in user without reach with 403 from 4.3.x
 * on. The screen used to swallow it into `console.log` and show an empty
 * table, which claims "no discount codes exist" where the truth is "you may
 * not see them". A 403 now says so; an empty but permitted list still reads as
 * an ordinary empty table.
 */
describe("Coupons", () => {
  it("names the denial instead of showing an empty table", async () => {
    ApiCouponService.getCoupons.mockRejectedValue(forbiddenError());
    const wrapper = await mountCoupons();
    expect(wrapper.text()).toContain(FORBIDDEN_NOTICE);
  });

  it("drops the table, so the screen does not also claim there is no data", async () => {
    ApiCouponService.getCoupons.mockRejectedValue(forbiddenError());
    const wrapper = await mountCoupons();
    expect(wrapper.findComponent({ name: "v-data-table" }).exists()).toBe(
      false
    );
  });

  it("keeps the table for an empty but permitted list", async () => {
    ApiCouponService.getCoupons.mockResolvedValue({ data: [] });
    const wrapper = await mountCoupons();
    expect(wrapper.findComponent({ name: "v-data-table" }).exists()).toBe(true);
  });

  it("says nothing when the list is empty but permitted", async () => {
    ApiCouponService.getCoupons.mockResolvedValue({ data: [] });
    const wrapper = await mountCoupons();
    expect(wrapper.text()).not.toContain(FORBIDDEN_NOTICE);
  });

  it("says nothing when coupons come back", async () => {
    ApiCouponService.getCoupons.mockResolvedValue({
      data: [{ id: "c1", description: "Ten off" }],
    });
    const wrapper = await mountCoupons();
    expect(wrapper.text()).not.toContain(FORBIDDEN_NOTICE);
  });
});
