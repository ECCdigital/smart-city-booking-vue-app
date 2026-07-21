# API Services

## Overview

All backend communication goes through service classes in `src/services/api/`. They use the shared `ApiClientService` singleton (`window.ApiClient`).

```
Component/View
    ↓
Api*Service (domain-specific)
    ↓
ApiClientService (axios instance)
    ↓
AuthTransport (Direct | BFF)
    ↓
Backend REST API  or  Admin BFF → Backend
```

## ApiClientService

`src/services/api/ApiClientService.js` is the HTTP foundation:

- Selects `DirectAuthTransport` or `BffAuthTransport` from `VUE_APP_AUTH_MODE` (default `direct`)
- Direct: base URL `VUE_APP_SERVER_BASE_URL`, Bearer from `localStorage` / Keycloak
- BFF: base URL `VUE_APP_BFF_BASE_URL` (default `/admin/api`), `withCredentials`, HttpOnly cookies
- Handles 401 refresh via the active transport
- Exposes `get`, `post`, `put`, `patch`, `delete` wrappers

Do not create additional axios instances. Auth transport code lives in `src/services/auth/`.

## Service classes

One class per backend resource area:

| Service | Backend area |
|---------|-------------|
| `ApiAuthService` | Login, logout, token refresh |
| `ApiBookingService` | Bookings CRUD, status changes |
| `ApiBookablesService` | Bookable resources |
| `ApiTenantService` | Tenant configuration |
| `ApiEventService` | Events |
| `ApiCheckoutService` | Checkout flow |
| `ApiGroupBookingService` | Group/series bookings |
| `ApiRuleEngineService` | Rule engine rules & executions |
| … | See `src/services/api/` for full list |

## Adding a new endpoint

1. Find or create the matching `Api*Service` class
2. Add a static or instance method that calls `ApiClientService`
3. Use the method from views/components — not raw axios
4. If the backend endpoint is new, verify it exists in [smart-city-booking-backend docs](https://github.com/ECCdigital/smart-city-booking-backend/tree/develop/docs/api)

```javascript
import ApiClientService from "./ApiClientService";

class ApiBookingService {
  static async getBooking(tenantId, bookingId) {
    const response = await ApiClientService.get(
      `tenants/${tenantId}/bookings/${bookingId}`
    );
    return response.data;
  }
}

export default ApiBookingService;
```

## Error handling

- Use `apiErrorMessage.js` to map API error responses to user-friendly messages
- Let errors propagate to the caller — the component/view decides how to display them (toast, inline, dialog)
- Don't catch and ignore errors in service methods

## Auth headers / transport

Don't manually set `Authorization` headers in service methods.

| Mode | Env | Behaviour |
|------|-----|-----------|
| **Direct** (default) | unset or `VUE_APP_AUTH_MODE=direct` | Bearer from `localStorage` (`local`) or `KeycloakService` (`keycloak`) |
| **BFF** (opt-in) | `VUE_APP_AUTH_MODE=bff` | Cookies via Admin BFF; no auth tokens in `localStorage`; login/logout/me/refresh/card use BFF routes |

Use `ApiAuthService` for login/logout/me/card. BFF mode: server SSO + shared cookies with Storefront. Contract: [docs/adr/0001-optional-admin-bff-shared-session.md](../adr/0001-optional-admin-bff-shared-session.md). Deploy: [docs/shared-session-deploy.md](../shared-session-deploy.md).

## Tenant scoping

Most endpoints include `tenantId` in the URL path (`tenants/{tenantId}/…`). Get the current tenant from Vuex:

```javascript
import store from "@/store";

const tenantId = store.getters["tenants/currentTenantId"];
```

## Backend reference

For endpoint shapes, permissions, and request/response formats, consult the backend repo:

- [API Reference](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/api/README.md)
- [Authentication](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/api/authentication.md)
