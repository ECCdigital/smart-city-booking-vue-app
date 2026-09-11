import { beforeEach, describe, expect, it, vi } from "vitest";

const userState = { data: null };
const storeState = { currentTenantId: null };

vi.mock("@/store/modules/user", () => ({
  default: { state: userState },
}));

vi.mock("@/store", () => ({
  default: {
    getters: {
      get "tenants/currentTenantId"() {
        return storeState.currentTenantId;
      },
    },
  },
}));

const BookingPermissionService = (
  await import("@/services/permissions/BookingPermissionService")
).default;

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";

function signIn({ instanceOwner = false, tenants = [] } = {}) {
  userState.data = {
    user: { id: USER_ID },
    permissions: { instanceOwner, tenants },
  };
}

function membership(manageBookings = {}, overrides = {}) {
  return { tenantId: TENANT_ID, isOwner: false, manageBookings, ...overrides };
}

/**
 * `allowReprint` mirrors the backend's `booking.reprint` right (its
 * authorization table: own → signed in, any → `manageBookings.updateAny`):
 * whoever placed the booking may reissue its receipts, and so may anyone
 * who may edit every booking of the tenant (spec E8).
 */
describe("BookingPermissionService", () => {
  beforeEach(() => {
    userState.data = null;
    storeState.currentTenantId = TENANT_ID;
  });

  describe("allowReprint", () => {
    const own = { id: "bk-1", assignedUserId: USER_ID };
    const foreign = { id: "bk-2", assignedUserId: "someone-else" };

    it("lets the instance owner and the tenant owner through", () => {
      signIn({ instanceOwner: true });
      expect(BookingPermissionService.allowReprint(foreign)).toBe(true);

      signIn({ tenants: [membership({}, { isOwner: true })] });
      expect(BookingPermissionService.allowReprint(foreign)).toBe(true);
    });

    it("lets the booking's own user through without any role", () => {
      signIn({ tenants: [membership({})] });
      expect(BookingPermissionService.allowReprint(own)).toBe(true);
      expect(BookingPermissionService.allowReprint(foreign)).toBe(false);
    });

    it("lets updateAny through on a foreign booking, updateOwn not", () => {
      signIn({ tenants: [membership({ updateAny: true })] });
      expect(BookingPermissionService.allowReprint(foreign)).toBe(true);

      signIn({ tenants: [membership({ updateOwn: true })] });
      expect(BookingPermissionService.allowReprint(foreign)).toBe(false);
    });

    it("returns false without a membership for the current tenant", () => {
      signIn({ tenants: [membership({ updateAny: true }, { tenantId: "x" })] });
      expect(BookingPermissionService.allowReprint(own)).toBe(false);
    });
  });

  /**
   * `allowRead` mirrors the backend's read right: whoever placed the booking
   * may open it, and so may anyone with `manageBookings.readAny`.
   */
  describe("allowRead", () => {
    const own = { id: "bk-1", assignedUserId: USER_ID };
    const foreign = { id: "bk-2", assignedUserId: "someone-else" };

    it("lets the instance owner and the tenant owner through", () => {
      signIn({ instanceOwner: true });
      expect(BookingPermissionService.allowRead(foreign)).toBe(true);

      signIn({ tenants: [membership({}, { isOwner: true })] });
      expect(BookingPermissionService.allowRead(foreign)).toBe(true);
    });

    it("lets the booking's own user through without any role", () => {
      signIn({ tenants: [membership({})] });
      expect(BookingPermissionService.allowRead(own)).toBe(true);
      expect(BookingPermissionService.allowRead(foreign)).toBe(false);
    });

    it("lets readAny through on a foreign booking, updateOwn not", () => {
      signIn({ tenants: [membership({ readAny: true })] });
      expect(BookingPermissionService.allowRead(foreign)).toBe(true);

      signIn({ tenants: [membership({ updateOwn: true })] });
      expect(BookingPermissionService.allowRead(foreign)).toBe(false);
    });

    it("returns false without a membership for the current tenant", () => {
      signIn({ tenants: [membership({ readAny: true }, { tenantId: "x" })] });
      expect(BookingPermissionService.allowRead(own)).toBe(false);
    });
  });
});
