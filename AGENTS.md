# Agent Instructions — Smart City Booking Admin UI

Instructions for AI coding agents (Codex, Cursor, Claude Code). Human docs live in `README.md` and `docs/`.

## Project

Vue 2.7 SPA for multi-tenant resource booking administration (rooms, sports facilities, makerspaces). Connects to the Smart City Booking REST API. GPL-3.0.

| Area | Path | Purpose |
|------|------|---------|
| Pages | `src/views/` | Route-level views and checkout flows |
| Components | `src/components/` | Reusable UI (domain-grouped subfolders) |
| API layer | `src/services/api/` | Axios-based API clients |
| Permissions | `src/services/permissions/` | UI authorization checks |
| State | `src/store/modules/` | Vuex modules |
| Routing | `src/router/` | Routes and auth middleware pipeline |
| i18n | `src/language/` | German UI strings (`de/translations.json`) |
| Tests | `tests/unit/` | Vitest specs, mirroring the `src/` tree |
| JS embed | `src/js-web-interface/` | Standalone `BookingManager` for external websites |
| Entities | `src/entities/` | Lightweight domain helpers |

See [docs/agents/architecture.md](docs/agents/architecture.md) for layout and data flow.

## Ecosystem

This repo is the **Admin UI only**. Related repositories:

| Component | Repository | Role |
|-----------|------------|------|
| **Backend API** | [smart-city-booking-backend](https://github.com/ECCdigital/smart-city-booking-backend) | REST API, auth, bookings, tenants |
| **Storefront** | [smart-city-booking-store-front](https://github.com/ECCdigital/smart-city-booking-store-front) | Public booking UI (v4) |

Do not assume backend or storefront code is in this repo. API or auth changes may require coordinated updates in the backend repo.

## Commands

```bash
npm install          # install dependencies
npm run serve        # dev server (needs running backend API)
npm run build        # production build + minified JS web interface
npm run lint:check   # eslint
npm run lint:fix     # eslint --fix
npm run format:check # prettier --check
npm run format:write # prettier --write
npm test             # vitest, single run
npm run test:watch   # vitest, watch mode
```

Run `npm run lint:check` and `npm test` before finishing a task. Fix lint issues you introduce.

## Coding standards

- **Written language:** English for all code, comments, commit messages, PR titles/descriptions, and changelog entries
- **UI copy:** German strings in `src/language/de/translations.json` — do not translate unless asked
- **Programming language:** JavaScript (ES modules), Vue 2 Options API, Vuetify 2
- **Style:** Prettier + ESLint — match surrounding code
- **DRY:** Reuse existing services, components, and utilities; extract shared logic only when duplication is real — avoid premature abstractions
- **Scope:** Minimal, focused diffs; no drive-by refactors
- **API calls:** Use `Api*Service` classes via `ApiClientService` — don't call axios directly from components
- **Permissions:** Gate UI actions with `*PermissionService` — mirror backend permission semantics
- **Tenancy:** Most data is scoped by tenant — respect `tenants/currentTenantId` from Vuex
- **Secrets:** Never commit `.env`, credentials, or real tokens
- **Env vars:** `VUE_APP_*` are baked in at build time — document new vars in `.env-example`

Details: [docs/agents/coding-standards.md](docs/agents/coding-standards.md)

## Domain-specific guides

| Topic | File |
|-------|------|
| Architecture & data flow | [docs/agents/architecture.md](docs/agents/architecture.md) |
| Testing (Vitest) | [docs/agents/testing.md](docs/agents/testing.md) |
| Vue components & views | [docs/agents/components.md](docs/agents/components.md) |
| API services | [docs/agents/api-services.md](docs/agents/api-services.md) |
| JS web interface (embed) | [docs/agents/web-integration.md](docs/agents/web-integration.md) |
| Optional Admin BFF / shared session | [docs/adr/0001-optional-admin-bff-shared-session.md](docs/adr/0001-optional-admin-bff-shared-session.md) |
| Shared-session deploy | [docs/shared-session-deploy.md](docs/shared-session-deploy.md) |
| BFF hardening / CSRF | [docs/bff-hardening.md](docs/bff-hardening.md) |
| BFF smoke tests | [docs/bff-smoke-tests.md](docs/bff-smoke-tests.md) |
| Auth transports (`direct` / `bff`) | [src/services/auth/](src/services/auth/) |

## Guardrails

- Do **not** change version branches (`version/3.x`, `version/4.x`) unless explicitly asked
- Do **not** commit without being asked
- Do **not** add dependencies without good reason
- Do **not** upgrade to Vue 3 or Vuetify 3 unless explicitly asked
- Prefer extending existing services/components over duplicating logic
- Changes require a changelog entry in `docs/CHANGELOG.md`. Keep it short.
- Backend API: [smart-city-booking-backend](https://github.com/ECCdigital/smart-city-booking-backend) — check API docs there for endpoint changes

## Tool setup

| Tool | Entry point |
|------|-------------|
| **Codex** | Reads this file (`AGENTS.md`) natively |
| **Cursor** | Reads `AGENTS.md` + `.cursor/rules/*.mdc` |
| **Claude Code** | Reads `CLAUDE.md` → imports this file |

Structure overview: [docs/agents/README.md](docs/agents/README.md)
