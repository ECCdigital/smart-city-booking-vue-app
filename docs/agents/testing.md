# Testing

Vitest runs beside the Vue CLI/webpack toolchain. It does not replace it: `npm run serve` and `npm run build` are untouched, and no test file is part of the production bundle.

## Commands

```bash
npm test          # single run (CI)
npm run test:watch  # watch mode
npm test -- tests/unit/utils/bookingStatus.spec.js   # one file
```

## Where tests live

```
tests/unit/                          ← mirrors the src/ tree
  setup.js                           ← global setup, loaded by vitest.config.js
  support/mount.js                   ← Vuetify/Vuex/i18n boilerplate for component specs
  support/api.js                     ← shared API failure doubles and `flushPromises`
  services/api/apiErrorMessage.spec.js
  services/permissions/TenantPermissionService.spec.js
  utils/bookingStatus.spec.js
  components/Booking/BookingInitialState.spec.js
```

-   Tests live under `tests/unit/`, **not** next to the source. Keeping `src/` free of test files keeps the webpack build and the `.vue` component tree clean.
-   The path under `tests/unit/` mirrors the path under `src/`: a spec for `src/utils/foo.js` is `tests/unit/utils/foo.spec.js`.
-   Naming is `<module>.spec.js`. Only `tests/unit/**/*.spec.js` is collected.
-   Two aliases are available: `@/` → `src/` (same as the app) and `@tests/` → `tests/`.
-   Vitest globals are **off**. Import `describe`, `it`, `expect` and `vi` from `"vitest"` in every spec.

## Component specs

`tests/unit/setup.js` installs Vuetify and Vuex on Vue once and silences the dev banners. `tests/unit/support/mount.js` owns the `data-app` container that Vuetify overlays (`v-dialog`, `v-menu`, `v-tooltip`) detach into, so they behave as they do in the app.

Mount through the helper rather than `@vue/test-utils` directly:

```js
import { mountComponent } from "@tests/unit/support/mount";

const wrapper = mountComponent(MyComponent, { propsData: { … } });
```

`mountComponent` gives every mount its own Vuetify instance and its own host element inside `data-app`, and registers the wrapper for teardown — a global `afterEach` destroys it, so specs do not clean up themselves. A component that needs a store gets one through `options.store` (`new Vuex.Store(…)`); Vuex is already installed on Vue.

`mountComponent` also hands every mount the app's i18n instance, so `$t` in a template resolves against the real German catalogue. A key the catalogue lacks fails the spec that asked for it, whatever it asserts: `tests/unit/support/missingKeys.js` records every missing key and the global `afterEach` throws.

`tests/unit/support/pseudoLocale.js` checks that a page takes all its copy from the catalogue: `usePseudoLocale()` renders from a copy of the catalogue with every text marked (‹so›), `unmarkedTexts(element)` lists the texts and read attributes with a letter outside the marks - text built into a component - and `restoreLocale()` goes back to German. Keep the data of such a spec free of letters, so only the page's own copy reads. See `tests/unit/components/Bookable/BookableEditCopy.spec.js`.

Vitest resolves `vue` to the **runtime-only** build. A component double therefore needs a `render` function — a `template` string does not compile:

```js
vi.mock("@/layouts/Admin.vue", () => ({
    default: {
        name: "AdminLayout",
        render(h) {
            return h("div", this.$slots.default);
        },
    },
}));
```

`tests/unit/support/api.js` holds the shared API failure doubles — `forbiddenError()` (the 4.3.x `ForbiddenError` body), `serverError()` and `flushPromises()`, which lets a component's awaited API call settle before `$nextTick`.

Drive the real DOM (`trigger("click")`, `setValue(…)`) instead of calling component methods, so the spec breaks when the markup stops matching the behaviour.

## BFF specs

`tests/unit/bff/` tests the Admin BFF over HTTP in the node environment (`// @vitest-environment node`): `startBff(env)` from `tests/unit/support/bff.js` starts a stub backend and a fresh BFF on free ports, and the spec calls it with `fetch`. The harness loads Express and cookie-parser from `bff/node_modules`, so run `npm run bff:install` first.

## Characterisation tests

The specs that exist today pin **current** behaviour ahead of the 4.3.x API migration, including behaviour that is arguably wrong (`allowCreate` returning `undefined` rather than `false`). They are a baseline, not an endorsement. When a ticket deliberately changes one of these behaviours, change the spec in the same commit and say so in the changelog — `bookingPaymentStatus.spec.js` became `bookingStatus.spec.js` that way when the list moved from the flags to `booking.status`.
