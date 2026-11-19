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
  /**
   * `allowReadAny` is the Reichweite of CONTEXT.md: *any* for the instance
   * owner, the tenant owner and `manageBookings.readAny`, *own* for every
   * other member. It decides only how a 404 on the Buchungsseite is worded.
   */
  describe("allowReadAny", () => {
    it("lets the instance owner and the tenant owner through", () => {
      signIn({ instanceOwner: true });
      expect(BookingPermissionService.allowReadAny()).toBe(true);

      signIn({ tenants: [membership({}, { isOwner: true })] });
      expect(BookingPermissionService.allowReadAny()).toBe(true);
    });

    it("lets readAny through, a member without it not", () => {
      signIn({ tenants: [membership({ readAny: true })] });
      expect(BookingPermissionService.allowReadAny()).toBe(true);

      signIn({ tenants: [membership({ updateAny: true })] });
      expect(BookingPermissionService.allowReadAny()).toBe(false);
    });

    it("returns false without a membership for the current tenant", () => {
      signIn({ tenants: [membership({ readAny: true }, { tenantId: "x" })] });
      expect(BookingPermissionService.allowReadAny()).toBe(false);
    });
  });

  /**
   * The hard delete in the list: whoever may
   * delete every booking (`manageBookings.deleteAny`, the backend's
   * `booking.delete`) may delete it in every state, to take test bookings
   * out; everyone else only where the state allows it.
   */
  describe("allowHardDelete", () => {
    const STATES = [
      "requested",
      "payment_due",
      "confirmed",
      "rejected",
      "cancelled",
      "withdrawn",
    ];

    it.each(STATES)(
      "lets deleteAny, the tenant owner and the instance owner delete a %s booking",
      (status) => {
        const booking = { id: "bk-1", status, assignedUserId: "x" };

        signIn({ tenants: [membership({ deleteAny: true })] });
        expect(BookingPermissionService.allowHardDelete(booking)).toBe(true);

        signIn({ tenants: [membership({}, { isOwner: true })] });
        expect(BookingPermissionService.allowHardDelete(booking)).toBe(true);

        signIn({ instanceOwner: true });
        expect(BookingPermissionService.allowHardDelete(booking)).toBe(true);
      }
    );

    it.each([
      ["requested", true],
      ["rejected", true],
      ["payment_due", false],
      ["confirmed", false],
      ["cancelled", false],
      ["withdrawn", false],
    ])("lets deleteOwn delete an own %s booking: %s", (status, expected) => {
      signIn({ tenants: [membership({ deleteOwn: true })] });
      const own = { id: "bk-1", status, assignedUserId: USER_ID };

      expect(BookingPermissionService.allowHardDelete(own)).toBe(expected);
    });

    it("refuses a member without a delete right", () => {
      signIn({ tenants: [membership({ readAny: true })] });

      expect(
        BookingPermissionService.allowHardDelete({ status: "requested" })
      ).toBe(false);
    });
  });
});
