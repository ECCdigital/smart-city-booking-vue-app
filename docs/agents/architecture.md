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

`/onboarding` (`src/views/Management/TenantOnboarding.vue`) is the shortened tenant creation (`Onboarding/OnboardingTenantStep.vue`). The creation replaces the address with `?tenant=<id>`, which shows the tenant's Nächste Schritte (`Onboarding/OnboardingNextSteps.vue`); a reload shows them again.

- Nächste Schritte are plain links, none back to the creation: tiles to the tenant settings, the members (invite dialog open, `?invite=1`) and a new bookable in the guided flow, the readiness check, legal texts and payment (`Onboarding/OnboardingSetupLinks.vue`, `/tenant?tab=legal|payments` on their own) and „Zur Startseite“. The first bookable is guided like any other
- Section cards on the design tokens (`docs/agents/design-tokens.md`); „Zur Verwaltung“ is the view's toolbar before the creation
- The supervision level is shown before and after the creation (`Onboarding/OnboardingSupervisionNotice.vue`); `free` shows no supervision texts
- The creation contract, the reading of creation errors and the routes on are pure functions in `src/utils/tenantOnboarding.js`; the view only wires them to the API services
- The readiness check (`TenantReadinessCheck.vue`, `GET api/tenants/:tenant/readiness`, states read in `src/utils/tenantReadiness.js`) is information, never a gate. Both owner levels see the same answer (`TenantPermissionService.allowReadiness`): on Nächste Schritte, in the tab „Bereitschaft“ of the tenant settings (`Edit/TenantEditReadiness.vue`) and in `TenantReadinessDialog.vue` of the instance's tenant list. The guided flow's confirmation (`Bookable/Flow/BookableFlowDone.vue`) shows no check; for a paid bookable it names a `missing` criterion `payment` in one line. Nothing is cached — every opening asks the backend again

## Review queue (tenant supervision)

`/instance/review-queue` (`src/views/Management/InstanceReviewQueue.vue`, instance owners, Navbar „System“) lists the pending offers of all supervised tenants from `GET api/instances/review-queue` (`ApiReviewQueueService`). It is drawn as the guided setup is — a section card of hairline rows (`v-data-iterator`, not a table) with the waiting time as each row's leading fact, and beside it the sticky panel of the supervision notices (below).

- Pagination and order are the backend's (longest waiting first): the table sends `page`/`pageSize`/`tenantId`/`offerType`, never sorts, and a filter change starts at page 1. Nothing is cached — entering the view or „Aktualisieren“ asks again; overlapping loads keep the answer asked for last
- A row is decided in place: „Freigeben“ and „Ablehnen“ (the latter asks for an optional reason) call `ApiReviewService.decide` and reload the queue; a 409 names the conflict and reloads as well. The offer editors carry the same actions for a closer look. `src/utils/reviewQueueLink.js` turns a row into the editor's router location (the backend's `adminPath` names the per-type bookable editor, `/events/edit` for events) and follows nothing else. The path carries no tenant, so the view selects the row's `tenantId` (`tenants/select`) before routing
- A second register „Mandanten“ (`?tab=tenants`; the page opens at „Angebote“) is `TenantApprovalQueue` (`src/components/Supervision/`): the tenants at „Freigabe ausstehend“ from `GET api/instances/tenant-approval-queue` (`ApiTenantApprovalQueueService`, `page`/`pageSize` only), drawn with the same rows as the offers — not `AppList` — so both registers read alike. „Freigeben“ is `ApiSupervisionService.setTenantLevel` with `supervised` (or `free` from its menu), „Abweisen“ opens `TenantDeclineDialog`; a decision reloads both registers, since a supervised tenant's pending offers enter the offers' register. The Navbar's „Prüfliste“ shows the sum of both `total`s (two reads with `pageSize=1`) for instance owners

## Supervision notices (instance owner)

The outbox of supervision mails has no page of its own: `SupervisionNoticePanel` beside the review queue names the notices that did not go out (the first five, with their retry, and a count of the rest) and opens the whole outbox as `SupervisionNotificationList` in a dialog (`src/components/Supervision/`). `/instance/aufsichtsmitteilungen` redirects to the queue. Both read the backend's outbox (`ApiSupervisionNotificationService`: `GET api/instances/supervision/notifications?status=&page=&pageSize=`, `POST …/:id/retry`).

- Server-paginated, opens on `status=failed`; the status filter shows the rest. Overlapping loads keep the answer asked for last
- „Erneut senden“ (`src/mixins/notificationRetry.js`, shared by panel and list) exists on `failed` and `pending` rows and sends the missing mails again — it never repeats the decision or writes history. The button is disabled while its retry runs; the list reloads after every retry, a refused one included, and the panel reads itself anew when the dialog closes
- A row carries no list of intended recipients, only `deliveries` (who already has the mail) — the column reads „Zugestellt an“. The occasion's `payload` differs by `type`; `src/utils/supervisionNotifications.js` is the one place that reads it
- `lastError` is shown as the backend sends it (secrets are masked there). The refusals of a retry (`409 supervision_notification_already_sent` / `…_dispatch_in_progress`, `404 supervision_notification_not_found`) are entries of the central reader's code tables

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
| newest `version/<major>.<minor>.x` | next minor | All work and pull requests |
| older `version/<major>.<minor>.x` | maintained lines | Fixes, merged forward |
| `develop` | default branch | Follows the newest, nothing directly |
| `version/3.x` | v3.x LTS | Maintenance only |

Work on the newest `version/<major>.<minor>.x` unless told otherwise, and switch a pull request's base from `develop` to it by hand. Rule in full: [README.md](../../README.md#versions--branches).
