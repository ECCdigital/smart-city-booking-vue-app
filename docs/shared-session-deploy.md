# Shared Session Deploy (Admin + Storefront)

Opt-in setup so **Admin** (`/admin`) and **Storefront** (`/`) share one login session on the same browser origin via HttpOnly cookies.

Default Admin installs stay on **Direct** mode (no BFF). Use this guide only when you want shared session.

## Requirements

| Piece | Role |
|-------|------|
| Same site origin | e.g. `https://example.com` for both UIs |
| Storefront | Nitro BFF under `/api` (existing) |
| Admin UI | Built with `VUE_APP_AUTH_MODE=bff`, served under `/admin` |
| Admin BFF | Node process, exposed as `/admin/api` |
| Backend API | Bearer-only (unchanged) |

Cookies (both BFFs must match):

| Name | httpOnly | path | sameSite | secure (prod) | maxAge |
|------|----------|------|----------|---------------|--------|
| `access-token` | yes | `/` | `lax` | yes | 1 day |
| `refresh-token` | yes | `/` | `lax` | yes | 7 days |
| `auth-type` | no | `/` | `lax` | yes | 7 days (`keycloak` only; omitted for local/card) |

Source of truth in this repo: `bff/src/cookieContract.js`.

## Edge routing (example)

```nginx
# Storefront (Nitro)
location /api/ {
  proxy_pass http://storefront:3000/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header Cookie $http_cookie;
  proxy_pass_header Set-Cookie;
}

location / {
  proxy_pass http://storefront:3000/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Admin UI image (embedded BFF already serves /admin/api inside the container)
location /admin/ {
  proxy_pass http://admin-ui:80/admin/;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Cookie $http_cookie;
  proxy_pass_header Set-Cookie;
}
```

If the edge must split `/admin/api` to a standalone BFF, keep a separate upstream; otherwise one `admin-ui` service is enough (`VUE_APP_AUTH_MODE=bff`).

Compose sketch: [docker-compose.bff.example.yml](../docker-compose.bff.example.yml).

## Environment

Use the **same Admin UI image** as Direct deploys. With `VUE_APP_AUTH_MODE=bff`, the container entrypoint starts the embedded BFF and nginx proxies `/admin/api` → it. No second image required.

```bash
BASE_URL=/admin
# Prefer false when the edge keeps the /admin prefix on the upstream request.
# true is OK if the edge strips /admin (container then sees /api/*); the image
# proxies both /admin/api/ and /api/ to the embedded BFF.
STRIP_PREFIX=false
VUE_APP_AUTH_MODE=bff
VUE_APP_BFF_BASE_URL=/admin/api
VUE_APP_SERVER_BASE_URL=https://api.example.com
PUBLIC_ORIGIN=https://example.com
# Multiple hostnames (custom + system default), comma-separated; PUBLIC_ORIGINS is merged in:
# PUBLIC_ORIGIN=https://booking.kunde.de,https://booking.system.example.com
# BFF reads the same UI env names (no duplicate API_BASE_URL / BFF_PUBLIC_PATH needed).
# Optional overrides only:
# API_BASE_URL=https://api.example.com
# BFF_PUBLIC_PATH=/admin/api
# ADMIN_SPA_BASE_PATH=/admin
# COOKIE_SECURE=true
# ADMIN_BFF_UPSTREAM=http://other-bff:3001   # only if BFF runs outside this container
# ADMIN_BFF_ENABLED=false                    # disable embedded BFF
```

**Symptom of a broken BFF proxy:** `POST /api/auth/login` → `405`, or `GET /api/auth/me` returns HTML (`index.html`, ~1KB) with status 200. Then nginx is not forwarding to the BFF — check `STRIP_PREFIX` / edge strip vs. `VUE_APP_BFF_BASE_URL=/admin/api`.

### Multi-URL / `PUBLIC_ORIGIN` allowlist

- Comma-separated origins; `PUBLIC_ORIGIN` and `PUBLIC_ORIGINS` are **merged** (not overridden).
- Request host (via `X-Forwarded-Host` / `Host` + `X-Forwarded-Proto`) must be on the allowlist; SSO `redirect_uri` follows that host and is stored in the PKCE session for the callback.
- Edge must set `Host` / `X-Forwarded-Host` and `X-Forwarded-Proto` (see nginx sketch above). Expose the BFF **only** through the edge.
- IDN: use Unicode **or** Punycode consistently in env values.
- Sessions are **per hostname** (host-only cookies). No shared login across unrelated domains.
- **Storefront:** if the Storefront BFF still has a single fixed `PUBLIC_ORIGIN`, shared session on additional hostnames needs a follow-up in that repo.

### Keycloak (BFF SSO)

For **each** allowlisted origin, Valid redirect URIs must include:

- `{origin}/admin/api/auth/sso/callback` (Admin)
- Storefront callback (existing), e.g. `{origin}/api/auth/sso/callback`

Also register matching Web origins and post-logout redirect URIs (`{origin}/admin/login`, …).

## Expected behaviour

| Action | Result |
|--------|--------|
| Login in Storefront | Cookies set on `path=/` |
| Open `/admin` or `/admin/login` | Admin BFF `/auth/me` succeeds → no password again |
| Login in Admin (BFF) | Same cookies → Storefront `/api/auth/me` succeeds |
| Logout in Admin (local) | Clears `access-token`, `refresh-token`, `auth-type`; broadcasts `session-ended` |
| Logout in Admin (Keycloak) | Back-channel revoke + clear cookies + browser IdP logout URL + broadcast |
| Logout in Storefront | Clears the same cookies + broadcast; other app drops client session |
| Dead session in Admin (no cookie / refresh fail) | Clear Vuex user → redirect `/admin/login` |
| Dead session in Storefront | Clear Pinia user; redirect `/login` only on `/account/*` |

## Local notes

Local `npm run serve` + `npm run bff:dev` is **not** a full shared-origin setup (Storefront is a separate app/port). Use a shared reverse proxy (or hosts file + nginx) pointing `/` and `/admin` at one origin to test Phase 4 end-to-end.

## Storefront alignment note

Both BFFs should clear `access-token`, `refresh-token`, and `auth-type` with `path=/` (and matching `sameSite` / `secure`). Admin: `bff/src/cookies.js`. Storefront: `server/utils/authCookies.ts`.
