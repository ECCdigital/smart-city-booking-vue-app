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
