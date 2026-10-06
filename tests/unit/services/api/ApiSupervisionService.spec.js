import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiSupervisionService from "@/services/api/ApiSupervisionService";

const PAGE = { items: [], total: 0, page: 1, pageSize: 50 };

describe("ApiSupervisionService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
    ApiClient.put.mockReset();
  });

  it("sets the level of the named tenant and answers the effective level", async () => {
    const answer = {
      supervisionLevel: "pending",
      supervisionChangedAt: "2026-09-21T08:30:00.000Z",
    };
    ApiClient.put.mockResolvedValue({ data: answer });

    const result = await ApiSupervisionService.setTenantLevel("t-1", {
      level: "pending",
      reason: "Missbrauch",
    });

    expect(ApiClient.put).toHaveBeenCalledWith("api/tenants/t-1/supervision", {
      level: "pending",
      reason: "Missbrauch",
    });
    expect(result).toEqual(answer);
  });

  it("reads one page of a tenant's history", async () => {
    ApiClient.get.mockResolvedValue({ data: PAGE });

    const result = await ApiSupervisionService.getTenantHistory("t-1", {
      page: 2,
      pageSize: 10,
    });

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/tenants/t-1/supervision/history",
      { params: { page: 2, pageSize: 10 } }
    );
    expect(result).toEqual(PAGE);
  });

  it("reads one page of the instance-wide history with its filters", async () => {
    ApiClient.get.mockResolvedValue({ data: PAGE });

    const result = await ApiSupervisionService.getInstanceHistory({
      tenantId: "t-2",
      page: 1,
    });

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/instances/supervision/history",
      { params: { tenantId: "t-2", page: 1 } }
    );
    expect(result).toEqual(PAGE);
  });
});
