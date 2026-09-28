import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiCouponService from "@/services/api/ApiCouponService";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "t1" } },
}));

/**
 * The id of a coupon is the discount code the user types, so the service
 * offers a create and an update of its own instead of reading the id.
 */
describe("ApiCouponService", () => {
  beforeEach(() => {
    global.ApiClient = {
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("creates over POST at the current tenant", async () => {
    await ApiCouponService.createCoupon(undefined, {
      id: "SOMMER",
      discount: 10,
    });

    expect(global.ApiClient.post).toHaveBeenCalledWith("api/t1/coupons", {
      id: "SOMMER",
      discount: 10,
    });
  });

  it("updates over PUT at the tenant named", async () => {
    await ApiCouponService.submitCoupon("t2", { id: "SOMMER", discount: 20 });

    expect(global.ApiClient.put).toHaveBeenCalledWith("api/t2/coupons", {
      id: "SOMMER",
      discount: 20,
    });
  });
});
