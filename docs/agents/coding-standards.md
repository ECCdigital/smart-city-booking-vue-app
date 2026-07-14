# Coding Standards

## Language

All project artifacts must be in **English**:

- Source code (identifiers, developer-facing string literals)
- Comments and JSDoc
- Commit messages and PR titles/descriptions
- Changelog entries (`docs/CHANGELOG.md`)

User-facing UI copy lives in `src/language/de/translations.json` (German). Add or update keys there — do not hardcode German strings in templates unless matching existing patterns in the same file.

## DRY (Don't Repeat Yourself)

Avoid duplication, but don't over-abstract:

- **Reuse first** — check `src/services/`, `src/components/commons/`, and `src/utils/` before writing new helpers
- **Extract on repetition** — when the same logic appears in 2+ places, move it to a shared utility or service
- **Single source of truth** — permission checks, API calls, and formatting should live in one place
- **Pragmatic abstractions** — don't create helpers for one-off logic or a single call site

```javascript
// ❌ BAD — axios call directly in a component
const { data } = await axios.get(`/tenants/${tenantId}/bookings`);

// ✅ GOOD — use the existing API service
const bookings = await ApiBookingService.getBookings(tenantId);
```

## Module system

ES modules throughout:

```javascript
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

export default { /* … */ };
```

Use `@/` alias for `src/` imports (configured in Vue CLI).

## Formatting

- Prettier handles formatting — match surrounding files
- Run `npm run format:write` only on files you changed
- ESLint config: `.eslintrc.js` (Vue plugin, Prettier integration)

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| Vue files | PascalCase | `BookingEdit.vue`, `SaveBar.vue` |
| JS files | PascalCase for services | `ApiBookingService.js`, `FormatService.js` |
| Components | PascalCase `name` option | `name: "SaveBar"` |
| Methods/data | camelCase | `submitChanges()`, `isLoading` |
| Vuex modules | camelCase directory | `store/modules/user.js` |
| Constants | UPPER_SNAKE_CASE | `BOOKING_STATUS` |

## Vue conventions

- **Options API** — use `export default { name, props, data, computed, methods, … }`; no Composition API unless the file already uses it
- **Single-file components** — `<script>`, `<template>`, `<style scoped>` order
- **Props** — declare types and `required`/`default` explicitly
- **Events** — use `$emit` with kebab-case event names in templates
- **Vuetify** — use existing Vuetify 2 components and theme tokens; respect dark/light mode via `$vuetify.theme`
- **Loading states** — use the `loading` Vuex module or local `inProgress` props consistently with nearby components

## Error handling

- API errors: use `apiErrorMessage.js` helpers where available
- Show user feedback via `AppToaster` / toast Vuex module
- Don't swallow errors silently — log to `console.error` only for unexpected failures

## API access

- All HTTP goes through `ApiClientService` (singleton on `window.ApiClient`)
- One `Api*Service` class per backend resource area
- Don't construct new axios instances in components or views

## Permissions

- Gate buttons, menus, and routes with `*PermissionService` classes
- Permission shape mirrors backend — check `src/services/permissions/` before inventing new checks
- Instance owners (`permissions.instanceOwner`) bypass tenant-level restrictions

## Comments

- Brief comments for non-obvious business rules (checkout flows, permission edge cases)
- No comments that restate obvious code
- No JSDoc on every trivial method — only on complex shared utilities

## What to avoid

- Adding TypeScript (project is plain JS)
- Upgrading to Vue 3 / Vuetify 3 without explicit request
- Large abstractions for one-off use
- Changing unrelated files in the same PR
- Hardcoded API URLs (use `process.env.VUE_APP_SERVER_BASE_URL`)
- Hardcoded German UI strings outside `translations.json`
- Committing `.env` or credentials
