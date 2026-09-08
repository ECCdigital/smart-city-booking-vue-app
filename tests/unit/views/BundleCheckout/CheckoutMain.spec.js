import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutMain from "@/views/BundleCheckout/CheckoutMain.vue";
import ApiCheckoutService from "@/services/api/ApiCheckoutService";

vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { getCheckoutPermissions: vi.fn() },
}));

/**
 * The public checkout, so the bar is: never make booking impossible for a
 * customer who may book, and never crash the flow. `getCheckoutPermissions`
 * decides two flags from the status of a failed request.
 *
 * Since 4.3.x a bookable outside the caller's reach answers 404 instead of
 * 403, so 404 has to reach the "no permission" step the same way - the
 * customer is prevented from booking either way, and the step is what tells
 * them why. `init` awaits this method, so an error without a response used to
 * abort the whole init chain and leave the checkout loading forever.
 */
async function permissionsWith(error) {
  const context = {
    tenant: "t1",
    leadItem: { bookableId: "b1" },
    preventBooking: false,
    loginRequired: false,
    bookingPermission: true,
  };

  ApiCheckoutService.getCheckoutPermissions.mockRejectedValueOnce(error);
  await CheckoutMain.methods.getCheckoutPermissions.call(context);

  return context;
}

describe("CheckoutMain.getCheckoutPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("leaves booking open when the permission check passes", async () => {
    const context = {
      tenant: "t1",
      leadItem: { bookableId: "b1" },
      preventBooking: true,
      loginRequired: false,
      bookingPermission: true,
    };
    ApiCheckoutService.getCheckoutPermissions.mockResolvedValueOnce({});

    await CheckoutMain.methods.getCheckoutPermissions.call(context);

    expect(context.preventBooking).toBe(false);
    expect(context.bookingPermission).toBe(true);
  });

  it("reads a 403 as a missing booking permission", async () => {
    const context = await permissionsWith({ response: { status: 403 } });
    expect(context.bookingPermission).toBe(false);
    expect(context.preventBooking).toBe(true);
  });

  it("reads a 404 as a missing booking permission too", async () => {
    const context = await permissionsWith({ response: { status: 404 } });
    expect(context.bookingPermission).toBe(false);
    expect(context.preventBooking).toBe(true);
  });

  it("still asks for a login on a 401", async () => {
    const context = await permissionsWith({ response: { status: 401 } });
    expect(context.loginRequired).toBe(true);
    expect(context.bookingPermission).toBe(true);
  });

  it("does not claim a permission problem on any other status", async () => {
    const context = await permissionsWith({ response: { status: 500 } });
    expect(context.bookingPermission).toBe(true);
    expect(context.loginRequired).toBe(false);
  });

  it("survives an error without a response instead of aborting init", async () => {
    const context = await permissionsWith(new Error("Network Error"));

    expect(context.preventBooking).toBe(true);
    expect(context.loginRequired).toBe(false);
    expect(context.bookingPermission).toBe(true);
  });
});
