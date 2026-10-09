import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiRolesService from "@/services/api/ApiRolesService";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "t1" } },
}));

/**
 * Creating is a POST since ticket 12 of the backend's authorization map;
 * the PUT carries `update` alone and answers 404 to a role it does not hold.
 */
describe("ApiRolesService", () => {
  beforeEach(() => {
    global.ApiClient = {
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    delete global.ApiClient;
  });

  it("creates a role without an id over POST", async () => {
    await ApiRolesService.submitRole({ name: "Neu" });

    expect(global.ApiClient.post).toHaveBeenCalledWith("api/t1/roles", {
      name: "Neu",
    });
    expect(global.ApiClient.put).not.toHaveBeenCalled();
  });

  it("updates a role with an id over PUT", async () => {
    await ApiRolesService.submitRole({ id: "r1", name: "Alt" });

    expect(global.ApiClient.put).toHaveBeenCalledWith("api/t1/roles", {
      id: "r1",
      name: "Alt",
    });
    expect(global.ApiClient.post).not.toHaveBeenCalled();
  });

  it("reads the tenant's roles as the public projection when asked", async () => {
    await ApiRolesService.getTenantRoles(true);

    expect(global.ApiClient.get).toHaveBeenCalledWith(
      "api/t1/roles?public=true"
    );
  });

  it("reads the roles of another tenant than the current one", async () => {
    await ApiRolesService.getTenantRoles(true, "t2");

    expect(global.ApiClient.get).toHaveBeenCalledWith(
      "api/t2/roles?public=true"
    );
  });
});
