# Keycloak realm: one guide, and the places that follow it

The Anleitung in the tab „Instanz verwalten → Single Sign-On“ is the only place that says how a Keycloak realm is set up for Biletado. The setup docs (backend `docs/deployment.md`, `bff/README.md`, `docs/shared-session-deploy.md`) and the backend's log warning about the Audience mapper point to the tab instead of keeping a version of their own. **Do not write Keycloak settings anywhere else**: change the guide, and walk the list below for what has to follow.

Older version branches have no tab and keep their own docs (`version/4.3.x`: ECCdigital/tickets#89).

## Where the guide and the check live

| Part                                     | Where                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Steps, settings, notes, Keycloak version | `src/services/keycloak/realmGuide.js` (`buildRealmGuide`, `KEYCLOAK_VERSIONS`, `STOREFRONT_SSO_PATHS`)                                                                                      |
| German texts                             | `instance.edit.sso.guide.*` in `src/language/de/translations.json`; settings keep the name Keycloak gives them                                                                              |
| „Als Text“ → „Anleitung kopieren“        | `src/services/keycloak/realmGuideText.js`, built from the same model and texts; its frame under `instance.edit.sso.text.*`                                                                  |
| Tab                                      | `src/components/Instance/Edit/InstanceEditSingleSignOn.vue`, `SsoStatusCard.vue`, `RealmGuide*.vue`                                                                                         |
| „Realm prüfen“ (live check)              | Backend `POST /api/instances/keycloak/check`, `src/commons/services/keycloak-check/`. The backend answers rows with reason codes; the Admin UI maps rows to steps and writes every sentence |
| Rücksprungadressen                       | direct mode `src/services/auth/directRedirects.js`; BFF mode `bff/src/publicUrl.js`, served as `GET <BFF>/auth/sso/addresses`; Storefront `STOREFRONT_SSO_PATHS`                            |

## A new requirement on the realm

When Keycloak or Biletado asks something new of the realm, all of these change in the same release:

-   [ ] **Step of the guide.** The setting or note in `realmGuide.js`, in the step it belongs to (a new step only if none fits), its text under `instance.edit.sso.guide.*`, and the text to copy: `realmGuideText.js` renders settings, notes and hints by itself, anything of a new shape needs a line there. Specs: `tests/unit/services/keycloak/realmGuide.spec.js`, `tests/unit/components/Instance/Edit/InstanceEditSingleSignOn.spec.js`.
-   [ ] **Check of the live check (backend).** A probe under `src/commons/services/keycloak-check/rows/`, slotted into `STEPS` of `keycloak-check-service.js` in the evaluation order. Its reason codes and `details` are the contract with the Admin UI: name them in the description of `KeycloakCheckRow.reason` in `src/docs/routes/instance.yaml`. A spec beside `tests/keycloak-realm-check*.test.js`; probes judged from Keycloak's source get one run by hand against a real realm before the release (as ECCdigital/tickets#103).
-   [ ] **Sentence in the Admin UI.** The new row's step in the mapping of rows to steps, and a sentence per new reason under `instance.edit.sso.check.*`. An unknown reason still renders a generic sentence with the code, so the Admin UI never breaks on a newer backend, but it says nothing useful either.
-   [ ] **Minimum version.** If the requirement comes with a Keycloak release, raise `KEYCLOAK_VERSIONS` (`minimum`, `recommended`) in `realmGuide.js`; the step „Realm anlegen“ and the text to copy read it. The backend's deployment doc names no number, it refers to the tab.
-   [ ] **Changelogs** of Admin UI and backend (`docs/CHANGELOG.md` in each): name the requirement and the action „Realm prüfen“, so that the owners of existing instances check their realm after the update. How customers hear of it is up to customer care.
-   [ ] **Realm of the test bench.** The realm the test bench checks against the newest Keycloak 26.x gets the setting too (ECCdigital/tickets#88, not built yet; until then, nothing to change).

## Changed paths of the Storefront

The Storefront's SSO routes (`server/api/auth/sso/` in smart-city-booking-store-front) are known by path in two places that do not follow by themselves. Change them with the Storefront, in one release:

-   [ ] **Admin UI**: `STOREFRONT_SSO_PATHS` in `realmGuide.js`, the guide's Rücksprungadressen of the Storefront: `/api/auth/sso/callback` after sign-in, `/api/auth/sso/login*` for „Benutzer wechseln“. The body of „Realm prüfen“ sends the same.
-   [ ] **Backend**: `SSO_LOGIN_PATH` in `src/commons/services/keycloak-check/rows/portal-row.js`; row 10 calls `<Portal-URL>/api/auth/sso/login`.
-   [ ] **Changelogs** with „Realm prüfen“: realms set up before list the old paths.

## Changed paths of the Admin UI

Nothing to change by hand. Each mode builds its Rücksprungadressen in one function, which the sign-in and the guide both call, so they stay in step:

-   **direct mode**: `directRedirects()` in `src/services/auth/directRedirects.js` (own Adresse plus `BASE_URL`), used by sign-in, silent check, sign-out, „Benutzer wechseln“ and the guide.
-   **BFF mode**: `getRedirectUris()` and its parts in `bff/src/publicUrl.js` (`PUBLIC_ORIGIN` / `PUBLIC_ORIGINS`, `BFF_PUBLIC_PATH`, `ADMIN_SPA_BASE_PATH`), used by sign-in, sign-out, „Benutzer wechseln“ and `GET /auth/sso/addresses`, which the guide reads.

„Realm prüfen“ probes the Rücksprungadressen the guide sends, so the check follows as well. Keep it that way: never build a Rücksprungadresse outside these functions. A changed path still makes realms set up before outdated, so it goes into the changelog with „Realm prüfen“.
