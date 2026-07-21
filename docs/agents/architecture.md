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

**Optional BFF mode** (`VUE_APP_AUTH_MODE=bff`): SPA uses `BffAuthTransport` → Admin BFF with HttpOnly cookies (`access-token`, `refresh-token`, `auth-type`). Keycloak uses BFF OIDC+PKCE (`/auth/sso/*`); Direct mode keeps `keycloak-js`. Implementation: `src/services/auth/*` + `bff/`. Contract: [docs/adr/0001-optional-admin-bff-shared-session.md](../adr/0001-optional-admin-bff-shared-session.md). Shared-origin deploy with Storefront: [docs/shared-session-deploy.md](../shared-session-deploy.md).

## Version lines

| Branch | Version | Notes |
|--------|---------|-------|
| `develop` | v4.x dev | Active development |
| `version/4.x` | v4.x stable | Production releases |
| `version/3.x` | v3.x LTS | Maintenance only |

Work on `develop` unless told otherwise.
