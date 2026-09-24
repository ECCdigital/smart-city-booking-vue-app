import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/tenantDeclined", () => ({
  handleTenantDeclined: vi.fn(),
}));

/**
 * The client is built once per auth mode (`VUE_APP_AUTH_MODE` is read when
 * the transport is created), so every case loads it anew.
 */
async function clientIn(mode) {
  vi.stubEnv("VUE_APP_AUTH_MODE", mode);
  vi.resetModules();
  const { default: client } = await import("@/services/api/ApiClientService");
  const { handleTenantDeclined } = await import(
    "@/services/api/tenantDeclined"
  );
  return { client, handleTenantDeclined };
}

/** The network, answering the request with `error`'s response. */
function refusing(error) {
  return (config) => Promise.reject(Object.assign(error, { config }));
}

function tenantDeclined() {
  const error = forbiddenError("tenant_declined");
  error.response.data.params = { tenantId: "tenant-b" };
  return error;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(["direct", "bff"])("ApiClientService (%s)", (mode) => {
  it("tells the declined-tenant fallback of a refused request and still rejects the caller with it", async () => {
    const { client, handleTenantDeclined } = await clientIn(mode);
    const error = tenantDeclined();
    expect(client.transport.mode).toBe(mode);

    await expect(
      client.get("api/tenant-b/bookables", { adapter: refusing(error) })
    ).rejects.toBe(error);
    expect(handleTenantDeclined).toHaveBeenCalledWith(error);
    expect(error.response.data.code).toBe("tenant_declined");
  });

  it("does not bother the fallback with an answer", async () => {
    const { client, handleTenantDeclined } = await clientIn(mode);

    const response = await client.get("api/tenant-b/bookables", {
      adapter: (config) =>
        Promise.resolve({ data: [], status: 200, headers: {}, config }),
    });

    expect(response.status).toBe(200);
    expect(handleTenantDeclined).not.toHaveBeenCalled();
  });
});
