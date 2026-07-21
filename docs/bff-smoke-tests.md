# Admin Auth Smoke Tests

Manual checklists for the three deploy shapes. Run after auth/BFF changes.

## A — Direct-only (default)

**Setup:** `VUE_APP_AUTH_MODE` unset or `direct`. No Admin BFF process. `VUE_APP_SERVER_BASE_URL` → API.

| # | Check | Pass |
|---|--------|------|
| A1 | Fresh load without env auth flags works as before | [ ] |
| A2 | Local password login → dashboard | [ ] |
| A3 | Logout → login page; protected route redirects to login | [ ] |
| A4 | Token refresh after access expiry (or wait / force 401) still works | [ ] |
| A5 | Keycloak login via `keycloak-js` (if instance has Keycloak active) | [ ] |
| A6 | DevTools → Application → Local Storage has `accessToken` (expected in Direct) | [ ] |
| A7 | API still callable with `Authorization: Bearer …` (curl) without UI | [ ] |

## B — BFF-only (Admin + BFF, no Storefront required)

**Setup:** `VUE_APP_AUTH_MODE=bff`, `VUE_APP_BFF_BASE_URL=/api` (or `/admin/api`). Local: `npm run bff:dev`. Docker: same UI image with mode `bff` (embedded BFF).

| # | Check | Pass |
|---|--------|------|
| B1 | Login (password) → dashboard; cookies `access-token` / `refresh-token` HttpOnly, `path=/` | [ ] |
| B2 | DevTools → Local Storage has **no** `accessToken` / `refreshToken` / `kcTokens` | [ ] |
| B3 | Network: authenticated calls go to BFF base, not raw API with Bearer from JS | [ ] |
| B4 | Logout → cookies cleared → `/login`; `/dashboard` redirects to login | [ ] |
| B5 | Keycloak SSO via BFF (`/auth/sso/*`) if configured | [ ] |
| B6 | After deleting cookies (or Storefront logout on shared origin), Admin kicks to login | [ ] |
| B7 | BFF health returns ok (`/health` or `/admin/api/health` via proxy) | [ ] |

## C — Shared-domain (Admin + Storefront, same origin)

**Setup:** Edge proxy: `/` Storefront, `/admin` Admin (embedded BFF). See [shared-session-deploy.md](./shared-session-deploy.md).

| # | Check | Pass |
|---|--------|------|
| C1 | Login Storefront → open `/admin` (or `/admin/login`) without password | [ ] |
| C2 | Login Admin → Storefront shows logged-in user without re-auth | [ ] |
| C3 | Logout Admin → Storefront user cleared; `/account/*` → login | [ ] |
| C4 | Logout Storefront → Admin redirects to login (or on next focus/poll) | [ ] |
| C5 | Keycloak logout ends IdP session (no silent re-login) | [ ] |
| C6 | Cookie names/flags match contract (`path=/`, `sameSite=lax`, `secure` in prod) | [ ] |

## Quick local commands

```bash
# Direct
# unset VUE_APP_AUTH_MODE; npm run serve

# BFF
npm run bff:dev
# VUE_APP_AUTH_MODE=bff VUE_APP_BFF_BASE_URL=/api npm run serve
```
