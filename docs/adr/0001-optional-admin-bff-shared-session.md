# ADR 0001: Optional Admin BFF for Shared Session with Storefront

- **Status:** Accepted (Phases 0–5 complete: contract through hardening / release notes)
- **Date:** 2026-07-21
- **Epic:** DEV-836 — Optional Admin BFF for Shared Session with Storefront
- **Deciders:** Biletado core team

## Context

Admin UI and Storefront can share one browser origin (Admin under `/admin`), but they do **not** share a login session today:

| Surface | Auth transport today |
|---------|----------------------|
| Admin UI | Bearer tokens in `localStorage`, direct calls to the backend API |
| Storefront | HttpOnly cookies via Nitro BFF (`/api/*`) |
| Backend API | Bearer-only (no auth cookies since API v3.4) |

Open-source and simple deployments must keep working without a BFF. Shared session is an **opt-in** for installs that put Admin and Storefront on the same origin.

## Decision

### Architecture (Variant B)

1. Add an **optional, standalone Admin BFF** mounted under `/admin/api/*` — do **not** reuse the Storefront Nitro BFF.
2. In BFF mode the SPA talks only to the Admin BFF; the BFF holds tokens in HttpOnly cookies and calls the backend with `Authorization: Bearer …`.
3. The backend API stays UI-agnostic and Bearer-first. Direct clients (curl, integrations, JS embed) keep calling the API with Bearer tokens.
4. No cookie auth on the business API in this epic.
5. The Vue 2 Admin SPA stays; the BFF is an optional Node process.

### Open-source compatibility

| Mode | When | Behaviour |
|------|------|-----------|
| **Direct (default / legacy)** | `VUE_APP_AUTH_MODE` unset or `direct` | Same as today: SPA → API with Bearer from `localStorage` |
| **BFF (opt-in)** | `VUE_APP_AUTH_MODE=bff` | SPA → Admin BFF with cookies; no auth tokens in `localStorage` |

Rules:

- One deploy = one mode (no mixing Direct and BFF in the same build/runtime).
- BFF container/process is optional; without it only Direct is valid.
- Docs: simple setup = Direct; shared session = BFF + cookie alignment + shared origin.

### Auth transport abstraction (implementation phases)

Behind `ApiClientService`:

- `DirectAuthTransport` — current behaviour
- `BffAuthTransport` — cookie/BFF path

Views, Vuex, and router stay largely unchanged.

## Cookie contract (locked with Storefront)

Source of truth: Storefront Nitro BFF cookie setters (e.g. `server/api/auth/login.post.js`, `server/service/AuthService.js`, SSO callback handlers).

Admin BFF **must** set/delete the same cookie names and flags so `/` and `/admin` share the session on one origin.

### Session cookies

| Name | Value | `httpOnly` | `secure` | `sameSite` | `path` | `maxAge` |
|------|-------|------------|----------|------------|--------|----------|
| `access-token` | Backend (or Keycloak) access JWT | `true` | `true` when `NODE_ENV === "production"`, else `false` | `lax` | `/` | `86400` (1 day) |
| `refresh-token` | Refresh token | `true` | same as above | `lax` | `/` | `604800` (7 days) |
| `auth-type` | Auth method hint for the client/BFF | `false` | same as above | `lax` | `/` | `604800` (7 days) |

### `auth-type` values

| Value | Meaning | Set by Storefront today |
|-------|---------|-------------------------|
| `keycloak` | SSO / OIDC session | Yes (SSO login, confirm, register, callback) |
| *(absent)* | Local password or card session | Local/card login currently leave the cookie unset |
| `local` | Reserved for Admin BFF / future alignment | Not set by Storefront password login today |

**Alignment rules for Admin BFF:**

1. Always set `access-token` / `refresh-token` exactly as above.
2. For Keycloak SSO: set `auth-type=keycloak` (required for shared SSO logout / refresh routing).
3. For local password (and card, if exposed): **omit** `auth-type` or clear it — match Storefront so both apps treat the session as non-Keycloak.
4. Optional follow-up in Storefront (out of Phase 0): set `auth-type=local` on password login for clarity; Admin BFF would then set the same value. Until then, absence means non-Keycloak.

### Delete semantics

On logout or failed refresh, delete with `path: "/"` (and matching `secure`/`sameSite` where the runtime requires it for reliable clearing):

- `access-token`
- `refresh-token`
- `auth-type`

### Out of cookie contract (PKCE helpers)

Storefront SSO also uses short-lived cookies (`kc-code-verifier`, `kc-state`, `kc-redirect`, …). Those are BFF-local OIDC state, not the shared session contract. Admin BFF may use its own names under `/admin` if needed; they are **not** required for Storefront ↔ Admin session sharing.

## Environment variables

### Admin SPA (build-time)

| Variable | Values | Default | Role |
|----------|--------|---------|------|
| `VUE_APP_AUTH_MODE` | `direct` \| `bff` | `direct` (also when unset) | Selects auth transport at build time |
| `VUE_APP_SERVER_BASE_URL` | URL | required for Direct | Backend API base URL when `AUTH_MODE=direct` |
| `VUE_APP_BFF_BASE_URL` | URL path or absolute URL | `/admin/api` when mode is `bff` | Admin BFF base for SPA requests (Phase 1+) |

Notes:

- `VUE_APP_*` are baked in at build time (see README). One image/build = one mode.
- In Direct mode, `VUE_APP_BFF_BASE_URL` is ignored.
- In BFF mode, the SPA must **not** use `VUE_APP_SERVER_BASE_URL` for authenticated business calls; those go to the BFF. Public bootstrap endpoints may still be decided in Phase 1/2.

### Admin BFF process (runtime, Phase 1+)

| Variable | Required | Role |
|----------|----------|------|
| `API_BASE_URL` | yes | Backend API origin the BFF calls with Bearer |
| `PORT` | no | Listen port (e.g. `3001`) |
| `NODE_ENV` | no | Drives cookie `secure` (`production` → `secure: true`) |
| `COOKIE_SECURE` | no | Optional override if TLS terminates at a proxy while `NODE_ENV` is not `production` |

Deploy routing (Phase 1+): reverse proxy maps `/admin/api` → Admin BFF; static Admin assets under `/admin`.

## Target architecture (BFF mode)

```text
Browser (example.com)
  ├── Admin SPA  /admin
  ├── Admin BFF  /admin/api   ← HttpOnly cookies
  ├── Storefront / + /api     ← same cookies (path: /)
  └── API        api.example.com  ← Bearer only

Direct clients (curl / apps) → API with Bearer (unchanged)
```

## Acceptance criteria

### A — Direct mode (default)

- [x] Fresh install with no env change behaves like today (Bearer + `localStorage`).
- [x] Login, refresh, logout, Keycloak (existing `keycloak-js` path) work without a BFF process.
- [x] Auth tokens may remain in `localStorage` (known Direct trade-off).
- [x] Backend API remains usable with Bearer without any UI.

### B — BFF mode (opt-in, single Admin)

- [x] With `VUE_APP_AUTH_MODE=bff` and a running Admin BFF, Admin auth works via cookies.
- [x] No auth access/refresh tokens stored in `localStorage` in BFF mode (`scrubLegacyTokenStorage`).
- [x] SPA authenticated traffic goes to `/admin/api/*` (or configured BFF base), not directly to the API with client-held Bearer tokens.
- [x] Backend API still accepts Bearer from non-UI clients.

### C — Shared session (same origin + BFF + Storefront)

Requires: Admin and Storefront on the **same site** (e.g. `https://example.com/` + `https://example.com/admin`), cookie contract above, both BFFs setting the shared cookies.

- [x] Login in Storefront → open Admin without password re-entry (Admin login page resumes via `/auth/me`).
- [x] Login in Admin (BFF mode) → open Storefront without password re-entry (shared `path=/` cookies).
- [x] Logout behaviour is coordinated (Admin clears all auth cookies; Keycloak also returns IdP browser logout URL).
- [x] Deploy docs: [docs/shared-session-deploy.md](../shared-session-deploy.md).

### D — Documentation

- [x] README / `.env-example` document both modes (simple = Direct; shared session = BFF).
- [x] This ADR remains the contract for cookie names/flags and env vars (`bff/src/cookieContract.js`).

## Consequences

### Positive

- Shared Admin ↔ Storefront session without forcing Open-Source users onto a BFF.
- Tokens leave the JS heap in BFF mode (better XSS posture for that deploy shape).
- API stays sessionless Bearer — curl and integrations unchanged.

### Negative / risks

- Cookie names/`path`/`sameSite`/`secure` must match Storefront exactly or sharing fails silently.
- Keycloak redirect URIs must include Admin BFF callback URLs when SSO runs in BFF mode.
- API `FRONTEND_URL` is singular — multi-frontend email/redirect links need care.
- Direct mode keeps the existing XSS/`localStorage` trade-off.

### Out of scope (this epic)

- Forcing Storefront BFF as the Admin gateway (Variant A)
- Cookie auth on the backend business API
- Mandatory migration of all installs
- Passing tokens via URL

### Phase 5 — Hardening (done)

- CSRF: SameSite=lax (+ optional Origin/Referer vs `PUBLIC_ORIGIN`) — [docs/bff-hardening.md](../bff-hardening.md)
- No JWTs in `localStorage` in BFF mode — scrub on transport create / session mark/clear
- Smoke checklists: [docs/bff-smoke-tests.md](../bff-smoke-tests.md)
- Upgrade: BFF remains opt-in; recommended when Admin+Storefront share one origin

## Implementation phases (reference)

| Phase | Focus |
|-------|--------|
| **0** | This contract (cookie, env, ADR, acceptance) — done |
| **1** | Admin BFF MVP (`bff/`: login/logout/me/refresh/card + proxy + Docker/nginx) — done |
| **2** | Vue 2 `AuthTransport` opt-in (`src/services/auth/*`) — done |
| **3** | SSO / Keycloak in BFF mode (OIDC+PKCE under `bff/src/routes/sso.js`) — done |
| **4** | Shared-session verification with Storefront — done (`docs/shared-session-deploy.md`) |
| **5** | Hardening, CSRF notes, smoke tests, release notes — done (`docs/bff-hardening.md`, `docs/bff-smoke-tests.md`) |

## References

- Storefront cookie setters: `smart-city-booking-store-front/server/api/auth/*`, `server/service/AuthService.js`
- Admin Direct auth today: `src/services/api/ApiClientService.js`, `src/services/KeycloakService.js`
- Epic Notion: DEV-836
