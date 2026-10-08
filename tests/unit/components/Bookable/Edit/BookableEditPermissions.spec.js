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

const sections = (overrides, saved) => {
  const { wrapper } = mountEditing(BookableEditPermissions, {
    bookable: bookable(overrides),
    saved: saved && bookable(saved),
    expertMode: false,
    store: store(),
    stubs: { UserRoleSelector: true, BookingDiscountEditor: true },
  });
  return {
    discounts: wrapper.find("#be-section-permissions-discounts").exists(),
    cancellation: wrapper.find("#be-section-permissions-cancellation").exists(),
  };
};

const DISCOUNTS = {
  bookingDiscounts: {
    users: [{ userId: "u1", discountPercent: 100 }],
    roles: [],
  },
};
const ADMINS_CANCEL = { cancellationPolicy: { userCancellable: false } };

describe("BookableEditPermissions - expert options without expert mode", () => {
  it("leaves out Preisnachlass and Stornierung unused", () => {
    expect(sections({})).toEqual({ discounts: false, cancellation: false });
  });

  it("shows Preisnachlass while set, on its own", () => {
    expect(sections(DISCOUNTS)).toEqual({
      discounts: true,
      cancellation: false,
    });
  });

  it("shows Stornierung while only admins cancel, on its own", () => {
    expect(sections(ADMINS_CANCEL)).toEqual({
      discounts: false,
      cancellation: true,
    });
  });

  it("keeps both while the stored bookable uses them", () => {
    expect(sections({}, { ...DISCOUNTS, ...ADMINS_CANCEL })).toEqual({
      discounts: true,
      cancellation: true,
    });
  });
});
