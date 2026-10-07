// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  CURRENT_PASSWORD,
  startBff,
  VALID_ACCESS_TOKEN,
} from "@tests/unit/support/bff";

let bff;

afterEach(async () => {
  await bff?.close();
  bff = null;
});

function changePassword(body, cookie) {
  return fetch(`${bff.url}/auth/resetpassword`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /auth/resetpassword — the own password change", () => {
  it("hands the session on to the backend", async () => {
    bff = await startBff();

    const response = await changePassword(
      { currentPassword: CURRENT_PASSWORD, password: "neu-2" },
      `access-token=${VALID_ACCESS_TOKEN}`
    );

    expect(response.status).toBe(200);
  });

  it("answers the backend's refusal of a wrong current password", async () => {
    bff = await startBff();

    const response = await changePassword(
      { currentPassword: "geraten", password: "neu-2" },
      `access-token=${VALID_ACCESS_TOKEN}`
    );

    expect(response.status).toBe(403);
  });

  it("answers 401 without a session", async () => {
    bff = await startBff();

    const response = await changePassword({
      currentPassword: CURRENT_PASSWORD,
      password: "neu-2",
    });

    expect(response.status).toBe(401);
  });
});
