# Admin BFF (optional)

Optional Node process that fronts the Admin UI with HttpOnly cookies, aligned to the Storefront cookie contract. Enables shared session when Admin (`/admin`) and Storefront (`/`) share one origin.

**Default Admin UI installs do not need this.** Use Direct mode (`VUE_APP_AUTH_MODE=direct` or unset).

## Endpoints

BFF listens at the process root. Reverse proxy should expose it as `/admin/api` (strip prefix → BFF `/`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness |
| `POST` | `/auth/login` | Local password login → sets cookies |
| `POST` | `/auth/signup` | Local registration (forwards to API) |
| `POST` | `/auth/card/signin` | Card login → sets cookies |
| `POST` | `/auth/card/signup` | Card registration (forwards to API) |
| `POST` | `/auth/reset` | Request password-reset mail (forwards to API) |
| `POST` | `/auth/resetpassword` | Set new password from reset token (forwards to API) |
| `POST` | `/auth/logout` | Clears cookies (local or Keycloak revoke) |
| `POST` | `/auth/refresh` | Refresh access cookie (local JWT or Keycloak) |
| `GET` | `/auth/me` | Current user (auto-refresh on 401) |
| `GET` | `/auth/sso/login` | Start OIDC+PKCE login |
| `GET` | `/auth/sso/callback` | OIDC callback |
| `GET` | `/auth/sso/silent-check` | Silent SSO (`prompt=none`) |
| `GET` | `/auth/sso/pending-user` | Pending SSO profile (JWT decode) |
| `POST` | `/auth/sso/confirm` | Confirm pending SSO → session cookies |
| `POST` | `/auth/sso/register` | Register + login from pending SSO |
| `POST` | `/auth/sso/logout` | Keycloak logout + clear cookies |
| `GET` | `/auth/sso/change-user` | IdP logout then restart SSO |
| `*` | `/*` | Proxy to `API_BASE_URL` with `Authorization: Bearer` from cookie |

Public browser URL examples: `/admin/api/auth/login`, `/admin/api/tenants/...`.

## Local development

```bash
cd bff
npm install
npm run dev
```

Prefer the **root Admin UI `.env`** — `bff/src/config.js` loads `../.env` then `bff/.env` and accepts UI names as aliases (`VUE_APP_SERVER_BASE_URL`, `VUE_APP_BFF_BASE_URL`, `BASE_URL`, …). Backend URL defaults to `http://localhost:8081` in development if unset. Optional: `bff/.env` only for BFF-only overrides (`PORT`, `CORS_ORIGINS`).

With the Vue app (`npm run serve`), requests to `/admin/api` and `/api` are proxied to `http://localhost:3001` (see root `vue.config.js`).

## Docker

**Preferred:** the root Admin UI `Dockerfile` embeds this BFF. One image; enable with `VUE_APP_AUTH_MODE=bff` at runtime (see root README / `build_utils/docker-entrypoint.sh`).

**Standalone BFF image** (optional, external process):

```bash
docker build -t admin-bff ./bff
docker run --rm -p 3001:3001 \
  -e API_BASE_URL=http://host.docker.internal:8081 \
  -e NODE_ENV=production \
  admin-bff
```

Then point the UI container at it with:

- `ADMIN_BFF_ENABLED=false` and `ADMIN_BFF_UPSTREAM=http://admin-bff:3001` (proxy/process layout only)
- `VUE_APP_AUTH_MODE=bff` and `VUE_APP_BFF_BASE_URL=/admin/api` (required so the SPA uses cookie auth via the BFF path)

## Environment

| Variable | UI alias | Required | Description |
|----------|----------|----------|-------------|
| `API_BASE_URL` | `VUE_APP_SERVER_BASE_URL` | yes (prod) | Backend API origin |
| `BFF_PUBLIC_PATH` | `VUE_APP_BFF_BASE_URL` | for SSO | Browser-facing BFF prefix (e.g. `/admin/api` or `/api`) |
| `ADMIN_SPA_BASE_PATH` | `BASE_URL` | for SSO | SPA base for post-login redirects (`/admin` or empty) |
| `COOKIE_SECURE` | `VUE_APP_IS_PRODUCTION` | no | Cookie `Secure` flag (else `NODE_ENV=production`) |
| `PUBLIC_ORIGIN` / `PUBLIC_ORIGINS` | same | recommended in prod | Comma-separated browser origin allowlist; CSRF + OIDC. Both vars are **merged** (no override). Set-but-invalid → BFF refuses to start. |
| `PORT` | — | no | Default `3001` |
| `NODE_ENV` | — | no | `production` → secure cookies when no override |
| `CORS_ORIGINS` | — | no | Comma-separated origins for credentialed CORS (dev) |

## Security (cookie mode)

- Session cookies: `access-token` and `refresh-token` are `HttpOnly` + `SameSite=lax` (+ `Secure` in production)
- `auth-type` is readable (not HttpOnly) and may be omitted for local/card sessions — see `src/cookieContract.js`
- When `PUBLIC_ORIGIN` / `PUBLIC_ORIGINS` is set, mutating requests with an `Origin`/`Referer` must match the **current** request origin (derived host must be allowlisted) (`src/csrf.js`)
- OIDC `redirect_uri` is taken from the request host when allowlisted, stored in the PKCE session, and reused on callback (not re-derived from headers)
- Details: [docs/bff-hardening.md](../docs/bff-hardening.md)

## Vue opt-in

Set in the Admin UI `.env`:

```bash
VUE_APP_AUTH_MODE=bff
VUE_APP_SERVER_BASE_URL=http://localhost:8081
VUE_APP_BFF_BASE_URL=/api
PUBLIC_ORIGIN=http://localhost:8080
```

Multiple public hostnames (custom domain + system default):

```bash
PUBLIC_ORIGIN=https://booking.kunde.de,https://booking.system.example.com
```

Then run the BFF (`npm run bff:dev` from repo root) and `npm run serve` — no separate `bff/.env` needed.

## Shared session with Storefront

When Admin (`/admin`) and Storefront (`/`) share one origin, both BFFs set the same cookies (`bff/src/cookieContract.js`). Deploy guide: [docs/shared-session-deploy.md](../docs/shared-session-deploy.md).

## Keycloak setup

Register the BFF callback URL on the Keycloak public client **for each** browser origin, e.g.:

- Local: `http://localhost:8080/api/auth/sso/callback` (when `BFF_PUBLIC_PATH=/api`)
- Shared origin: `https://example.com/admin/api/auth/sso/callback` (`BFF_PUBLIC_PATH=/admin/api`)
- Multi-URL: one callback (+ web origin + post-logout redirect) per entry in `PUBLIC_ORIGIN`

Set in the root `.env` (or BFF aliases):

- `VUE_APP_BFF_BASE_URL` / `BFF_PUBLIC_PATH` — browser-facing BFF prefix
- `PUBLIC_ORIGIN` — comma-separated browser origins (needed behind the vue-cli proxy so `redirect_uri` is not built with the BFF port). Edge must forward `Host` / `X-Forwarded-Host` and `X-Forwarded-Proto`. Keep the BFF reachable only via the edge (not directly from the public internet).

IDN custom domains: put env values consistently in Unicode **or** Punycode — mixing fails the allowlist match (`URL.origin` normalizes to Punycode).

**Storefront note:** Admin multi-origin support does not automatically fix the Storefront BFF if it still uses a single `PUBLIC_ORIGIN`. Shared session on a second hostname needs a matching Storefront change (separate repo).

PKCE state is kept in an in-memory store (plus cookies as fallback) so the Keycloak round-trip still works if the dev proxy drops `Set-Cookie` on 302 responses.

