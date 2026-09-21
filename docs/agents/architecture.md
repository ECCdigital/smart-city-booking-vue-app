# Architecture

## Ecosystem

This repository is the Admin UI. Related repositories:

| Component | Repository |
|-----------|------------|
| Backend API | https://github.com/ECCdigital/smart-city-booking-backend |
| Storefront | https://github.com/ECCdigital/smart-city-booking-store-front |

The Admin UI consumes the backend API. Changes to endpoints, auth, or response shapes may need updates here and in the storefront repo.

## Stack

- **Framework:** Vue 2.7 (Options API)
- **UI:** Vuetify 2, SCSS (`src/scss/`)
- **State:** Vuex 3 (`src/store/modules/`)
- **Routing:** Vue Router 3 with middleware pipeline (`src/router/middleware.js`)
- **HTTP:** Axios via `ApiClientService` (`src/services/api/ApiClientService.js`)
- **i18n:** vue-i18n — German only (`src/language/de/translations.json`)
- **Auth:** JWT (local) and Keycloak SSO (`src/services/KeycloakService.js`)
- **Build:** Vue CLI 5 (`vue-cli-service`)

## Directory layout

```
src/
  main.js                  # Bootstrap: instance load, auth, Vue mount
  App.vue                  # Root component
  views/                   # Route-level pages
    Auth/                  # Login, password reset, invitations
    Bookables/             # Rooms, resources, events, tickets, locations
    BundleCheckout/        # Multi-step checkout flow
    MultiCheckout/         # Alternative checkout flow
    Management/            # Tenants, users, roles, instances, rule engine
  components/              # Reusable UI (grouped by domain)
    Booking/, Bookable/, Tenant/, Instance/, Mail/, PDF/, commons/, …
  services/
    api/                   # Api*Service classes (one per backend resource)
    permissions/           # *PermissionService (UI authorization)
    FormatService.js       # Date, currency, formatting
    PersistenceService.js  # Local storage helpers
  store/modules/           # Vuex modules (user, tenants, bookables, …)
  router/
    index.js               # Route definitions
    middleware.js          # Pipeline runner
    middlewares/           # auth, requireTenant, interface, …
  entities/                # Lightweight domain helpers (booking, tenant, …)
  utils/                   # Shared utilities (checkout errors, booking form, …)
  language/                # i18n setup and translations
  layouts/                 # Admin, Default, Form layouts
  js-web-interface/        # Standalone BookingManager embed script
  scss/                    # Global styles and variables
public/                    # Static assets, silent SSO page
docs/                      # Changelog and agent docs
```

## Multi-tenancy

```
Instance (global deployment config, loaded at bootstrap)
  └── Tenant (organization: city, department)
        ├── Membership (user ↔ tenant link with roles)
        ├── Bookable (bookable resource)
        ├── Booking (reservation)
        ├── Event, Coupon, Catalog, Workflow, …
        └── Role (permissions per tenant)
```

- Current tenant context lives in Vuex (`tenants/currentTenantId`)
- Router middleware `requireTenant` enforces tenant selection for tenant-scoped routes
- Permission services check `user.state.data.permissions.tenants` for the active tenant
- Cross-tenant data access in the UI is a security bug

## Guided setup (tenant onboarding)

`/onboarding` (`src/views/Management/TenantOnboarding.vue`) leads from the shortened tenant creation to the first bookable: tenant → bookable → optional legal texts/payment → overview with the readiness check.

- Form rules, the mapping onto a `Bookable` and the reading of creation errors are pure functions in `src/utils/tenantOnboarding.js`; the view only wires them to the API services
- No stored wizard progress: every step saves through the regular API, `?tenant=` resumes from current data, and price and availability are asked again. The confirmation of a running session lives in memory only (`src/utils/tenantOnboardingRun.js`), so it survives the detour to `/tenant?tab=legal|payments` (which shows a way back via `onboardingStep`) but no reload
- The closing action only stores the publication wish (`isPublic`); its wording follows `tenant.supervisionLevel` (`free` / `supervised` / `blocked`), the backend submits a first wish for review on its own. `free` shows no supervision texts
- The readiness check (`TenantReadinessCheck.vue`, `GET api/tenants/:tenant/readiness`) is information, never a gate. Both owner levels see the same answer (`TenantPermissionService.allowReadiness`): the wizard overview, the tab „Bereitschaft“ of the tenant settings (`Edit/TenantEditReadiness.vue`) and `TenantReadinessDialog.vue` in the instance's tenant list. Nothing is cached — every opening asks the backend again
- Bookable types are the existing four (`room`, `event-location`, `resource`, `ticket`); `event-location` is the value both this app and the backend entity use — the `location` in the backend's Mongoose enum is not enforced and nothing is converted
- Events stay in the regular administration

## Review queue (tenant supervision)

`/instance/pruefliste` (`src/views/Management/InstanceReviewQueue.vue`, instance owners, Navbar „System“) lists the pending offers of all supervised tenants from `GET api/instances/review-queue` (`ApiReviewQueueService`).

- Pagination and order are the backend's (longest waiting first): the table sends `page`/`pageSize`/`tenantId`/`offerType`, never sorts, and a filter change starts at page 1. Nothing is cached — entering the view or „Aktualisieren“ asks again; overlapping loads keep the answer asked for last
- The queue lists and links only; the review actions live in the offer editors. `src/utils/reviewQueueLink.js` turns a row into the editor's router location (the backend's `adminPath` names the per-type bookable editor, `/events/edit` for events) and follows nothing else. The path carries no tenant, so the view selects the row's `tenantId` (`tenants/select`) before routing

## Key patterns

| Layer | Pattern | Example |
|-------|---------|---------|
| View | Route page, loads data, composes components | `src/views/Bookings.vue` |
| Component | Reusable UI, emits events, uses services | `src/components/Booking/BookingEdit.vue` |
| API service | HTTP calls via `ApiClientService` | `src/services/api/ApiBookingService.js` |
| Permission | UI gate before showing actions | `src/services/permissions/BookingPermissionService.js` |
| Vuex module | Shared reactive state | `src/store/modules/tenants.js` |

Views and components should stay thin — delegate HTTP to API services and authorization to permission services.

## Auth flow

**Default (Direct):**

1. `main.js` loads public instance config via `ApiInstanceService.getPublicInstance()`
2. Auth type stored in `localStorage` (`authType`: `local` or `keycloak`)
3. `ApiClientService` attaches Bearer token (JWT or Keycloak) on every request
4. Router middleware pipeline checks `requiresAuth`, tenant context, and interface permissions
5. Token refresh handled in `ApiClientService` interceptors

**Optional BFF mode** (`VUE_APP_AUTH_MODE=bff`): SPA uses `BffAuthTransport` → Admin BFF with cookies (`access-token` / `refresh-token` HttpOnly; `auth-type` readable marker, optional for local/card). Keycloak uses BFF OIDC+PKCE (`/auth/sso/*`); Direct mode keeps `keycloak-js`. Implementation: `src/services/auth/*` + `bff/`. Contract: [docs/adr/0001-optional-admin-bff-shared-session.md](../adr/0001-optional-admin-bff-shared-session.md). Shared-origin deploy with Storefront: [docs/shared-session-deploy.md](../shared-session-deploy.md).

## Version lines

| Branch | Version | Notes |
|--------|---------|-------|
| `develop` | v4.x dev | Active development |
| `version/4.x` | v4.x stable | Production releases |
| `version/3.x` | v3.x LTS | Maintenance only |

Work on `develop` unless told otherwise.
