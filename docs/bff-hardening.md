# Admin BFF Hardening (Phase 5)

Optional BFF / shared-session mode. Default Direct installs are unchanged.

## CSRF (cookie mode)

| Layer | Role |
|-------|------|
| **`SameSite=lax`** on `access-token` / `refresh-token` / `auth-type` | Primary: browsers do not send these cookies on cross-site POSTs from other origins |
| **`Secure` in production** | Cookies only over HTTPS |
| **HttpOnly** on access/refresh | JS cannot read tokens (XSS cannot exfiltrate JWTs) |
| **Origin/Referer check** | When `PUBLIC_ORIGIN` is set, mutating BFF requests whose `Origin`/`Referer` is present must match that origin (`bff/src/csrf.js`) |

This matches the Storefront posture (SameSite=lax cookies; no mandatory double-submit token on the Admin BFF). A full CSRF token (e.g. double-submit) is optional future hardening if threat models require it.

**Ops note:** Set `PUBLIC_ORIGIN` in production (e.g. `https://example.com`) so the Origin check is active. Curl without `Origin` still works for health/auth debugging.

## No auth tokens in the Admin SPA (BFF mode)

In `VUE_APP_AUTH_MODE=bff`:

- Access/refresh JWTs live only in HttpOnly cookies (set by the BFF).
- `BffAuthTransport` never writes `accessToken` / `refreshToken` / `kcTokens` to `localStorage`.
- On transport create / session mark / clear, legacy Direct keys are scrubbed.
- Session marker `sessionStorage.bffAuthSession` is a boolean flag only (not a token).
- `auth-type` may be a non-HttpOnly cookie (`keycloak`) for UX — it is not a credential.

**Code review checklist (BFF mode):**

- [ ] No `localStorage.setItem("accessToken"|"refreshToken"|"kcTokens")` on BFF paths
- [ ] `Authorization` header is stripped on BFF client requests (`onRequest`)
- [ ] Authenticated SPA traffic uses `VUE_APP_BFF_BASE_URL`, not a client-held Bearer to the API

Direct mode may still store tokens in `localStorage` (documented trade-off).

## Smoke tests

See [bff-smoke-tests.md](./bff-smoke-tests.md).

## Upgrade note (Open Source)

Enabling the Admin BFF is **optional**. Keep Direct mode unless Admin and Storefront share one browser origin and you want a single login. Recommended when deploying `/` (Storefront) + `/admin` (Admin) together — see [shared-session-deploy.md](./shared-session-deploy.md).

## Docker (single image)

The Admin UI Docker image embeds the BFF. At runtime:

- `VUE_APP_AUTH_MODE=direct` (default) — nginx + SPA only
- `VUE_APP_AUTH_MODE=bff` — also starts embedded BFF; nginx proxies `/admin/api` → it

See root `Dockerfile` and `build_utils/docker-entrypoint.sh`.
