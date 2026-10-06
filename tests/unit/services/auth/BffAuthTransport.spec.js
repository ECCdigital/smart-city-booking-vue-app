import { describe, expect, it, vi } from "vitest";
import BffAuthTransport from "@/services/auth/BffAuthTransport";
import { CSRF_FAILED_STATUS } from "@/services/api/apiErrorMessage";

/**
 * The transport owns the 401 refresh dance and hands every other status
 * straight back to the caller. The BFF's stale-CSRF answer is the only status
 * the BFF invents on its own, so it has to survive that path untouched — a
 * transport that swallowed it, retried it or read it as a dead session would
 * hide the message the UI shows for it.
 *
 * Only the BFF transport is pinned here: in direct mode the BFF is not in the
 * request path, so its CSRF guard never answers.
 */
function csrfError() {
  const error = new Error("Request failed with status code 419");
  error.config = { url: "api/tenants" };
  error.response = {
    status: CSRF_FAILED_STATUS,
    data: { success: false, message: "CSRF check failed" },
  };
  return error;
}

describe("BffAuthTransport.onResponseError", () => {
  it("rejects a CSRF failure unchanged, without retrying it", async () => {
    const transport = new BffAuthTransport();
    const client = vi.fn();
    transport.bindClient(client);
    const refresh = vi.spyOn(transport, "refresh");

    const error = csrfError();
    await expect(transport.onResponseError(error)).rejects.toBe(error);
    expect(error.response.status).toBe(CSRF_FAILED_STATUS);
    expect(client).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("leaves the session marker alone on a CSRF failure", async () => {
    const transport = new BffAuthTransport();
    transport.bindClient(vi.fn());
    transport.markSession();

    await expect(transport.onResponseError(csrfError())).rejects.toThrow();
    expect(transport.isAuthenticated()).toBe(true);
  });
});

function unauthorized(url) {
  const error = new Error("Request failed with status code 401");
  error.config = { url };
  error.response = { status: 401, data: { success: false } };
  return error;
}

/**
 * The BFF names its Adressen only with a session and does not refresh an
 * expired access cookie itself, so the transport refreshes once and asks
 * again, as for any call through the BFF. Its other SSO routes keep their
 * own handling.
 */
describe("BffAuthTransport.onResponseError for the BFF's Adressen", () => {
  it("refreshes once and asks again after a 401", async () => {
    const transport = new BffAuthTransport();
    const answer = { data: { allowlist: "empty", addresses: [] } };
    const client = vi.fn().mockResolvedValue(answer);
    transport.bindClient(client);
    const refresh = vi.spyOn(transport, "refresh").mockResolvedValue(true);

    await expect(
      transport.onResponseError(unauthorized("auth/sso/addresses"))
    ).resolves.toBe(answer);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(client).toHaveBeenCalledTimes(1);
    expect(client.mock.calls[0][0].url).toBe("auth/sso/addresses");
  });

  it("leaves a 401 of the other SSO routes unrefreshed", async () => {
    const transport = new BffAuthTransport();
    const client = vi.fn();
    transport.bindClient(client);
    const refresh = vi.spyOn(transport, "refresh");

    const error = unauthorized("auth/sso/pending-user");
    await expect(transport.onResponseError(error)).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
    expect(client).not.toHaveBeenCalled();
  });
});

describe("BffAuthTransport.getSsoAddresses", () => {
  it("asks the BFF for its Adressen and gives up after a while", async () => {
    const transport = new BffAuthTransport();
    const answer = { allowlist: "active", addresses: [] };
    const get = vi.fn().mockResolvedValue({ status: 200, data: answer });
    transport.bindClient({ get });

    await expect(transport.getSsoAddresses()).resolves.toEqual(answer);
    expect(get).toHaveBeenCalledWith(
      "auth/sso/addresses",
      expect.objectContaining({ timeout: expect.any(Number) })
    );
  });

  it("takes an answer without Adressen for none, e.g. the SPA from a misconfigured proxy", async () => {
    const transport = new BffAuthTransport();
    transport.bindClient({
      get: vi.fn().mockResolvedValue({ status: 200, data: "<!doctype html>" }),
    });

    await expect(transport.getSsoAddresses()).rejects.toThrow();
  });
});
