import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditPermissions from "@/components/Bookable/Edit/BookableEditPermissions.vue";

vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantUsers: vi.fn().mockResolvedValue({ data: [] }) },
}));

const store = () =>
  new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t1" },
      },
    },
  });

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const discountsShown = (overrides, saved) =>
  mountEditing(BookableEditPermissions, {
    bookable: bookable(overrides),
    saved: saved && bookable(saved),
    expertMode: false,
    store: store(),
    stubs: { UserRoleSelector: true, BookingDiscountEditor: true },
  })
    .wrapper.find("#be-section-permissions-discounts")
    .exists();

const DISCOUNTS = {
  bookingDiscounts: {
    users: [{ userId: "u1", discountPercent: 100 }],
    roles: [],
  },
};

// Serienbuchung and Stornierung are areas of their own now, framed by the
// tab (BookableEditTab.spec.js).
describe("BookableEditPermissions - Preisnachlass without expert mode", () => {
  it("leaves it out unused", () => {
    expect(discountsShown({})).toBe(false);
  });

  it("shows it while set", () => {
    expect(discountsShown(DISCOUNTS)).toBe(true);
  });

  it("keeps it while the stored bookable uses it", () => {
    expect(discountsShown({}, DISCOUNTS)).toBe(true);
  });

  it("leaves Serienbuchung and Stornierung to their own areas", () => {
    const { wrapper } = mountEditing(BookableEditPermissions, {
      bookable: bookable(),
      store: store(),
      stubs: { UserRoleSelector: true, BookingDiscountEditor: true },
    });

    expect(wrapper.text()).not.toContain("Serienbuchung");
    expect(wrapper.text()).not.toContain("stornieren");
  });
});
