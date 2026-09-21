import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiTenantService from "@/services/api/ApiTenantService";

describe("ApiTenantService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
  });

  it("reads the readiness check of the named tenant", async () => {
    ApiClient.get.mockResolvedValue({ data: { criteria: [] } });

    const readiness = await ApiTenantService.getReadiness("t-1");

    expect(ApiClient.get).toHaveBeenCalledWith("api/tenants/t-1/readiness");
    expect(readiness).toEqual({ criteria: [] });
  });
});
