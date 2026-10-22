// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { BLACKLISTED_SSO_TOKEN, startBff } from "@tests/unit/support/bff";

let bff;

afterEach(async () => {
  await bff?.close();
  bff = null;
});

/**
 * An address on the blacklist (ECCdigital/tickets#628): the BFF hands the
 * backend's refusal of the SSO signup on whole, so the card can show the
 * message with the instance's mail address.
 */
describe("POST /auth/sso/register — an address on the blacklist", () => {
  it("answers the backend's refusal with its reason and mail address", async () => {
    bff = await startBff();

    const response = await fetch(`${bff.url}/auth/sso/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `kc-pending-token=${BLACKLISTED_SSO_TOKEN}`,
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      success: false,
      error: "checkout.address_blacklisted",
      params: { mailAddress: "betrieb@example.test" },
    });
  });
});
