/**
 * HTTP harness for the Admin BFF (`bff/`), for specs running in the node
 * environment (`// @vitest-environment node`).
 *
 * `startBff(env)` starts a stub of the backend API and a fresh BFF app, each
 * on a free port, and returns the BFF's base URL. Specs call it with global
 * `fetch`. Nothing reaches the network: the BFF talks only to the stub, and
 * the stub's instance config points Keycloak at the stub as well.
 *
 * The BFF is CommonJS and reads its config from `process.env` when it is
 * first required, so every start stubs the env and loads `bff/src` afresh.
 * Express and cookie-parser come from `bff/node_modules` (`npm run bff:install`).
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

const bffSrc = fileURLToPath(new URL("../../../bff/src/", import.meta.url));
const bffRequire = createRequire(bffSrc);

/** The access token the stub backend accepts on `GET /auth/me`. */
export const VALID_ACCESS_TOKEN = "valid-access-token";

/** Keycloak as the stub backend's public instance config names it. */
export const KEYCLOAK = {
  realm: "biletado",
  publicClient: "admin-web",
};

/**
 * Every variable the BFF reads, set so that neither the shell nor a local
 * `.env` leaks into a spec. An empty value counts as unset in the BFF.
 */
const NEUTRAL_ENV = {
  API_BASE_URL: "",
  VUE_APP_SERVER_BASE_URL: "",
  BFF_PUBLIC_PATH: "",
  VUE_APP_BFF_BASE_URL: "",
  ADMIN_SPA_BASE_PATH: "",
  BASE_URL: "",
  PUBLIC_ORIGIN: "",
  PUBLIC_ORIGINS: "",
  COOKIE_SECURE: "false",
  VUE_APP_IS_PRODUCTION: "",
  CORS_ORIGINS: "",
};

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function urlOf(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

async function startBackendStub() {
  const express = bffRequire("express");
  const app = express();
  let url = "";

  app.get("/api/instances/public", (_req, res) => {
    res.json({
      applications: [
        {
          id: "keycloak",
          active: true,
          serverUrl: `${url}/keycloak`,
          ...KEYCLOAK,
        },
      ],
    });
  });

  app.get("/auth/me", (req, res) => {
    if (req.get("authorization") !== `Bearer ${VALID_ACCESS_TOKEN}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json({ id: "owner@example.de" });
  });

  app.post(
    `/keycloak/realms/${KEYCLOAK.realm}/protocol/openid-connect/logout`,
    (_req, res) => res.sendStatus(204)
  );

  const server = await listen(app);
  url = urlOf(server);
  return { server, url };
}

function loadBff() {
  for (const key of Object.keys(bffRequire.cache)) {
    if (key.startsWith(bffSrc)) {
      delete bffRequire.cache[key];
    }
  }
  return bffRequire("./app.js");
}

/**
 * Start the stub backend and a fresh BFF configured with `env` (merged over
 * neutral defaults; `API_BASE_URL` points at the stub). Call `close()` when
 * done; it also restores the env.
 */
export async function startBff(env = {}) {
  const backend = await startBackendStub();
  const merged = { ...NEUTRAL_ENV, API_BASE_URL: backend.url, ...env };
  for (const [key, value] of Object.entries(merged)) {
    vi.stubEnv(key, value);
  }

  const { createApp } = loadBff();
  const server = await listen(createApp());

  return {
    url: urlOf(server),
    async close() {
      await Promise.all([close(server), close(backend.server)]);
      vi.unstubAllEnvs();
    },
  };
}
