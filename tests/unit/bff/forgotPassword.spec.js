// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { RESET_TOKEN, startBff } from "@tests/unit/support/bff";

let bff;

afterEach(async () => {
  await bff?.close();
  bff = null;
});

function post(path, body) {
  return fetch(`${bff.url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /auth/forgot-password — „Passwort vergessen“ without a session", () => {
  it("forwards the address to the backend and answers its reply", async () => {
    bff = await startBff();

    const response = await post("/auth/forgot-password", {
      id: "erika@example.de",
    });

    expect(response.status).toBe(200);
    expect((await response.json()).received).toEqual({
      id: "erika@example.de",
    });
  });
});

describe("POST /auth/reset-password — the new password from the mail's link", () => {
  it("sets it without a session", async () => {
    bff = await startBff();

    const response = await post("/auth/reset-password", {
      token: RESET_TOKEN,
      id: "erika@example.de",
      password: "neu-2",
    });

    expect(response.status).toBe(200);
  });

  it("answers the backend's refusal of a spent link", async () => {
    bff = await startBff();

    const response = await post("/auth/reset-password", {
      token: "verbraucht",
      id: "erika@example.de",
      password: "neu-2",
    });

    expect(response.status).toBe(410);
  });
});
