# Vue Components & Views

## Component organization

Components are grouped by domain under `src/components/`:

| Folder                                   | Domain                                       |
| ---------------------------------------- | -------------------------------------------- |
| `Booking/`                               | Booking list, edit, dialogs, kanban          |
| `Bookable/`                              | Bookable configuration (rooms, resources, …) |
| `Tenant/`                                | Tenant settings, mail, invoices              |
| `Instance/`                              | Instance-level config, rule engine           |
| `Mail/`                                  | Mail templates, block editor                 |
| `PDF/`                                   | PDF template editor and preview              |
| `Auth/`                                  | Login cards, Keycloak                        |
| `commons/`                               | Shared UI (SaveBar, toasts, selectors)       |
| `Checkout/`                              | Checkout calendar and shared checkout UI     |
| `Coupon/`, `Role/`, `User/`, `Files/`, … | Other domain areas                           |

Views in `src/views/` are route-level pages. They compose components and handle page-level data loading.

## Component template

Follow the Options API pattern used throughout the project:

```vue
<script>
import ApiBookingService from "@/services/api/ApiBookingService";

export default {
    name: "MyComponent",
    props: {
        bookingId: { type: String, required: true },
    },
    data() {
        return {
            booking: null,
            loading: false,
        };
    },
    async created() {
        await this.loadBooking();
    },
    methods: {
        async loadBooking() {
            this.loading = true;
            try {
                this.booking = await ApiBookingService.getBooking(
                    this.bookingId
                );
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>

<template>
    <v-card :loading="loading">
        <!-- content -->
    </v-card>
</template>

<style scoped>
/* component-specific styles only */
</style>
```

## Views

-   Views correspond to router entries in `src/router/index.js`
-   Use layouts (`src/layouts/Admin.vue`, `Default.vue`, `Form.vue`) via route `meta` or parent routes
-   Lazy-load heavy views with the existing `lazyLoad()` helper where appropriate
-   Route `meta` fields: `requiresAuth`, `interfaceName`, `public`, `title`

## i18n

-   Use `$t('key')` in templates for user-visible text
-   Add new keys to `src/language/de/translations.json`
-   Keep key names descriptive and nested by feature area

```vue
<template>
    <v-btn>{{ $t("booking.save") }}</v-btn>
</template>
```

## Permissions in templates

Hide or disable actions based on permission services:

```vue
<v-btn v-if="canEdit" @click="editBooking">
  {{ $t('booking.edit') }}
</v-btn>
```

```javascript
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

computed: {
  canEdit() {
    return BookingPermissionService.allowUpdate(this.booking);
  },
},
```

### Known gap: `create` without `update` in the role editor

`src/components/Role/RoleEdit.vue` renders every access level of a role
dimension as a free-standing checkbox. There is no coupling between them —
no `watch`, no `computed` setter, no `@change` — and the backend role schema
does not couple them either. A role with `manageRoles.create` and neither
`updateOwn` nor `updateAny` is two clicks away, and it is the most obvious
state of a freshly created role where somebody ticks only "Erstellen".

That role does not work. The obsolete PUT store routes carry `update` at the
door and only decide inside the handler whether something is created; for
`role` the backend authorization table knows no `updateOwn` at all, so the
request is rejected with 403 before it ever reaches the creating path.

**Deliberately not fixed** (§E9 of the 4.3.x permissions spec). Coupling the
checkboxes in the UI would be the lie in the opposite direction — it would
claim that creating implies editing, which is not true of the domain, and it
would have to come out again once the store routes are dropped. A backend PR
for routes that are meant to die is not worth it either.

**The caveat, on the record:** if customers maintain roles themselves, a
silent 403 two clicks into the editor becomes a support ticket. If that
happens, coupling the checkboxes in the UI is the fastest answer.

## Dialogs

-   Confirmation dialogs follow the naming pattern `*ConformationDialog.vue` (existing convention)
-   Emit `confirm` / `cancel` events; parent handles the actual API call
-   Use `v-dialog` with `persistent` for destructive actions

## Forms

-   Complex forms use `vee-validate` v3 where already established in the file
-   Use `SaveBar` (`src/components/commons/SaveBar.vue`) for sticky save/cancel bars on edit pages
-   Validate before submit; show field errors inline

## State

-   **Page-local state** → `data()` in the component
-   **Shared across components** → Vuex module (`mapState`, `mapGetters`, `mapActions`)
-   **Persisted preferences** → `userPreferences` Vuex module or `PersistenceService`

## Styling

-   Global styles in `src/scss/` — don't duplicate variables
-   Component styles: `<style scoped>` preferred
-   Use Vuetify utility classes and theme colors before custom CSS
-   Theme colors come from env vars (`VUE_APP_PRIMARY_COLOR`, etc.) applied at build/runtime

## What to avoid

-   Business logic-heavy components — extract to services or utils
-   Direct `axios` calls in components
-   Inline German strings instead of `$t()` keys
-   New component folders that don't match the domain grouping
