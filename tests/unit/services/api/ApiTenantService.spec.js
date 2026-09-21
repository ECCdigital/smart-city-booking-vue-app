import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/ApiClientService", () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import ApiClient from "@/services/api/ApiClientService";
import ApiTenantService from "@/services/api/ApiTenantService";
import Tenant from "@/entities/tenant";

describe("ApiTenantService", () => {
  beforeEach(() => {
    ApiClient.get.mockReset();
    ApiClient.post.mockReset();
  });

  it("lists the tenants without a level filter by default", () => {
    ApiTenantService.getTenants();

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/tenants?publicTenants=false"
    );
  });

  it("narrows the tenant list to one supervision level", () => {
    ApiTenantService.getTenants(false, { supervisionLevel: "blocked" });

    expect(ApiClient.get).toHaveBeenCalledWith(
      "api/tenants?publicTenants=false&supervisionLevel=blocked"
    );
  });

  it("never sends the supervision level with a tenant write", () => {
    const tenant = {
      id: "t-1",
      name: "Sportverein",
      supervisionLevel: "blocked",
      supervisionChangedAt: "2026-09-21T08:30:00.000Z",
    };

    ApiTenantService.submitTenant(tenant);
    ApiTenantService.createTenant(tenant);

    const written = { id: "t-1", name: "Sportverein" };
    expect(ApiClient.put).toHaveBeenCalledWith("api/tenants", written);
    expect(ApiClient.post).toHaveBeenCalledWith("api/tenants", written);
  });

  it("reads the readiness check of the named tenant", async () => {
    ApiClient.get.mockResolvedValue({ data: { criteria: [] } });

    const readiness = await ApiTenantService.getReadiness("t-1");

    expect(ApiClient.get).toHaveBeenCalledWith("api/tenants/t-1/readiness");
    expect(readiness).toEqual({ criteria: [] });
  });

  it("creates a tenant without the fields the server decides", async () => {
    ApiClient.post.mockResolvedValue({ status: 201 });

    await ApiTenantService.createTenant(
      new Tenant({
        name: "Turnhalle e. V.",
        contactName: "Erika Muster",
        mail: "erika@example.org",
        ownerUserIds: ["someone@example.org"],
        supervisionLevel: "free",
        supervisionChangedAt: "2026-01-01T00:00:00.000Z",
        review: { status: "approved" },
      })
    );

    const [path, body] = ApiClient.post.mock.calls[0];
    expect(path).toBe("api/tenants");
    expect(body).toMatchObject({
      name: "Turnhalle e. V.",
      contactName: "Erika Muster",
      mail: "erika@example.org",
    });
    [
      "ownerUserIds",
      "users",
      "supervisionLevel",
      "supervisionChangedAt",
      "review",
    ].forEach((field) => expect(body).not.toHaveProperty(field));
  });
});
