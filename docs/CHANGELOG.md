# Changelog

Notable changes for the Smart City Booking Admin UI.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Releases are tagged `v4.x.x` from branch `version/4.x`.

## [Unreleased]

### Added

-   Test setup: Vitest with `@vue/test-utils@1`, `@vitejs/plugin-vue2` and jsdom, running beside the Vue CLI toolchain — `npm test` and `npm run test:watch`, specs under `tests/unit/` mirroring `src/`, shared Vuetify/Vuex mount boilerplate in `tests/unit/support/mount.js`, conventions in `docs/agents/testing.md`
-   Characterisation tests pinning today's behaviour ahead of the 4.3.x API migration: `apiErrorMessage`, `TenantPermissionService`, `bookingPaymentStatus` and the three status switches of `BookingEditStatus`
-   Tenant access apps: Salto KS IQ activation checklist for remote-open — progress header, IQs sorted by required action, guided modal wizard for the first activation (app-ban acknowledgement, PIN mail, one-time PIN capture), inline PIN entry for pending activations, discard with confirmation — requires the matching backend wizard endpoints
-   Media picker: new tab "Externer Link" — a pasted `https://` address is stored as an external reference (hotlink, no import) wherever the picker opens, restoring external image URLs for bookable and event images
-   Bookable and event image lists: an existing external entry's address can be corrected in place (pencil icon on the row)
-   Bookable editor: "Als Bild übernehmen" on the legacy cover alert moves `imgUrl` into the image list as an external entry and clears the old field
-   Media library admin view (`/media`, admin interface `media`): split view with facets (kind, tags, visibility), server-side search and pagination, permanent upload dropzone with per-file progress and error details, metadata editing, auto-loaded usage proof, and deletion blocked while a medium is in use; instance media tab for instance owners (`/api/v2/instance/media`)
-   Role editor: `manageMedia` permission group and the `media` admin interface
-   Media picker: gallery grid in a modal with multi-select, server-side search and tag filter, upload straight from the picker, and `intern` media greyed out with a reason wherever the entity is publicly visible
-   Bookable editor: new "Bilder" section with an ordered image list — position 0 is the cover image, drag to reorder, remove drops the reference and keeps the medium
-   Instance editor: new tab "Rechtliches" with the three legal documents (privacy policy, legal notice, terms) — each picked from the instance media library and stored as a media reference, public media only, external links stay possible; the fields moved out of tab "Allgemein" and the derived `url`/`fileName` are no longer sent back once a reference stands
-   Tenant editor: new tab "Rechtliches" with an expandable list of legal documents (`tenant.legalDocuments`) — privacy policy, legal notice, terms, right of withdrawal and freely named documents, each picked from the tenant media library and stored as a media reference, public media only, external links stay possible; a type already filed is no longer offered and two freely named documents may not share a title. The documents are filed only — nothing delivers them to end users yet

### Changed

-   `getApiErrorMessage` reads the 4.3.x error shape of a 403 (`{ error, code, statusCode, params }`) and translates it over `code` — one i18n table under `errors.forbidden-codes`, today with the generic `forbidden` entry the backend sends on 26 of its 32 denials; a 403 without that shape counts as a generic denial. The 400 branch is unchanged, its characterisation test that pinned "a 403 body is ignored" was rewritten deliberately
-   PDF template editor: a failed preview looks at the status before it reads the body — a 403 used to show the raw JSON body, because the response arrives as a Blob and the Blob branch ran first. The Blob unpacker now sits next to `getApiErrorMessage` as `unpackBlobErrorBody`
-   Tenant payments: a denied ePayBL connection test shows a permission message instead of "Request failed with status code 403"
-   `vue` and `vue-template-compiler` are aligned on 2.7.16 — they had drifted apart, which breaks any tool that compiles templates outside webpack
-   The stale eslint `overrides` block for `mocha` test globals is gone; Vitest globals stay off and specs import `describe`/`it`/`expect` from `vitest`
-   Tenant access apps: Salto KS picks an environment (`Accept (Sandbox)` / `Production`) instead of a free-text API base URL; the connection test sends `environment` and shows the server's own error (e.g. `invalid_client`) — requires the matching backend
-   Tenant access apps: Salto KS credentials and the IQ activation wizard are behind a "coming soon" state — visible and greyed out for everyone, instance owners included; stored configuration is untouched and still travels through a save
-   Access point dialog: the PIN-at-the-lock modes (`PIN-Code`, `PIN-Code & App`) are behind a "coming soon" state and cannot be picked; a new access point starts on `Öffnen per App`. Access points already stored on a PIN mode keep it
-   Media picker: upload moved from the grid header into a tab of its own (Mediathek | Upload | Externer Link); successful uploads land back on the grid, selected
-   Single-image fields (teaser, speaker photo, logo, …) route external links through the picker's "Externer Link" tab; the unlabeled link-icon toggle is gone, an existing external address stays editable in place
-   Bookable and event editors now store media references instead of raw file URLs: bookable images and attachments, event teaser and contact photo, event image list and speaker photos, event attachments (now with title, caption, `show`, `required`, `mailAttach`) — external links stay possible
-   Bookable and event cards load images in fixed presets (`sm`, with `thumb` as the lazy placeholder), which replaces the full-size placeholder they used to fetch
-   Event attachments and images steps, the simple event creator and the speaker photos pick from the media library
-   Event image list and speaker photos follow the event's visibility: `intern` media are selectable at a non-public event, matching the backend's reference guard
-   Instance editor, tab "Portal": logo and favicon are picked from the instance media library and stored as media references (`branding.logo`, `branding.favicon`) instead of plain file paths — public media only, external links stay possible, and the derived `logoUrl`/`faviconUrl` are no longer sent back once a reference stands
-   Media library, detail panel and media picker: cards, dialogs and dropzones drop from the app-wide 25px corner radius to 8px — overridden for the media surfaces only, the global radius is unchanged
-   Media library: the filter column drops its card and reads as a borderless navigation — small caps section headings, 36px entries, and the active filter as a primary-tinted 8px pill; the filters themselves are unchanged
-   Media library, detail panel: the size variants drop their table and read as a borderless compact list — preset, measurements and file size per row, each with a copy button for the variant's absolute URL (`?size=<preset>`); the panel's section headings match the filter column's small caps

### Fixed

-   Tenant owners can edit their tenant and its access providers again — the permission check asked for a `manageTenants` dimension the API never sends, which left the tenant and access pages to instance owners only
-   Selected and hovered rows no longer paint outside their rounded corner: Vuetify gives the list-item overlay no radius of its own, so the attachment list's grey backdrop sat square behind a 4px row, and the media library's row highlight stuck out past the card
-   Media library: "URL kopieren" always copies an absolute URL — a relative API base (BFF mode, or an unset direct-mode base URL) is anchored on the current origin; for `intern` media the success toast notes that the link needs a login
-   Legal document links reach a document served from the media library: the login, card login, registration and password-reset pages resolve its root-relative address against the API instead of prefixing `https://` — and the login and password-reset footers read the documents themselves instead of `dataProtectionUrl`/`legalNoticeUrl`, which the backend migration to the document fields removed

### Removed

-   Tenant access apps: webhook configuration is gone — Nuki's callback-URL/notification-ID form with its register/unregister buttons, and the Salto KS webhook registration status. The method is not supported (the Salto Connect API has no webhooks at all)
-   The old file picker's write paths: no editor calls `POST /:tenant/files` or `GET /:tenant/files/list` any more (`FileList` component and the unrouted `FileTest` view are gone); the orphaned `ChooseFile` component and `ApiFileService` are now deleted too, so nothing addresses the removed `/api/:tenant/files` endpoints

## [4.2.9] — 2026-08-31

### Fixed

-   Custom field dialog: "Speichern" no longer stays disabled when "Pflichtfeld im Buchungsprozess" is enabled — the preview's inputs no longer register with the dialog's `v-form`

## [4.2.8] — 2026-08-25

### Added

-   Custom field dialog: "In Buchungs-E-Mails anzeigen" switch for checkout fields (`usageOptions.showInMail`) — value shows up in the booking-details block of all booking mails; reset when the field leaves the checkout context

### Fixed

-   Untyped image sites (event image list, speaker photo) store the backend's own delivery address again instead of this app's transport URL. In BFF mode the transport URL carries the BFF base, so a picked medium was persisted as `/api/api/v2/…/media/…/file` — an address only the admin UI can resolve, which left the storefront, mails and the HTML endpoint with a dead link. The admin UI kept working throughout, which is why it went unnoticed
-   BFF mode: Keycloak SSO login no longer fails with a gateway error — nginx proxy buffers raised so the callback's token cookies fit (`upstream sent too big header` → 502 on `/api/auth/sso/callback`)

## [4.2.7] — 2026-08-10

### Fixed

-   Bookable edit: unsaved-changes chip clears after a successful save (snapshot now matches the normalized bookable)

## [4.2.6] — 2026-08-10

### Changed

-   Block editor text blocks: font size select uses pixel values (7–24 px) instead of small/medium/large; existing S/M/L templates still render correctly

## [4.2.5] — 2026-07-31

### Added

-   Tenant email settings: choose booking-period date format in mails (`mailBookingPeriodFormat`) under Erweitert
-   Mail theme wizard: Arial as a selectable font family for email layouts

### Changed

-   Support-footer toggle moved into the Erweitert panel together with the booking-period format option
-   Tenant email tab restructured into Versand, E-Mail-Layout, and E-Mail-Inhalte sections
-   Mail layout status: edit/create action separated from the status alert as a primary button

## [4.2.4] — 2026-07-29

### Fixed

-   BFF mode: local/card registration and password reset no longer hang (BFF owns `/auth/signup`, `/auth/card/signup`, `/auth/reset`, `/auth/resetpassword` instead of proxying after the body was consumed)

## [4.2.3] — 2026-07-29

### Fixed

-   Booking edit: availability conflict warnings no longer appear for an unchanged existing booking (self-conflict); validation runs on create or when period/bookables change, excluding the booking being edited
-   **DEV-845:** Series cancellation refund preview lists bookings chronologically by start date, shows each appointment date, and clarifies the mixed-policy hint
-   BFF mode: opening `/register` (and other public auth pages) no longer hard-redirects to login after a cold `/auth/me` 401
-   Mail snippet editor: visual edits in intro or closing section no longer overwrite the other section's expert HTML
-   Mailto link dialog: bare `mailto:` (empty recipient) is rejected instead of being applied
-   Mail theme image insert: only HTTPS URLs are accepted

### Added

-   Mail snippets: optional closing content (`{snippetKey}__after`) after booking details, buttons, QR, and system footer; combined visual editor shows intro, mocked system block, and closing section in one canvas
-   Tenant setting to show/hide the automatic support-contact system footer in booking mails
-   Mail text editor: E-Mail-Link dialog for arbitrary mailto targets with embedded Handlebars variables (plus button property shortcut)
-   Mail Theme Wizard: rich-text editor for header and footer (links, horizontal rule, image by HTTPS URL with width and alt text for blocked images, font size, line height)

### Changed

-   Generic mail template footer styling is left-aligned with darker text for longer signatures
-   Align mail theme header/footer/logo horizontal inset with card content padding
-   Mail block/snippet HTML inherits the tenant theme font instead of a hardcoded system stack
-   Mail theme font stacks use single quotes so inline `style` attributes stay valid in HTML emails

## [4.2.2] — 2026-07-27

### Fixed

-   BFF CSRF behind TLS-terminating proxies (e.g. Coolify): map derived `http` host to allowlisted `https` origin by hostname; container nginx preserves edge `X-Forwarded-Proto` / `X-Forwarded-Host` when proxying to the embedded BFF

### Changed

-   BFF `PUBLIC_ORIGIN` accepts a comma-separated allowlist (optional `PUBLIC_ORIGINS` merged in): CSRF and OIDC redirects follow the request host when allowlisted; SSO callback reuses `redirect_uri` from the PKCE session. Set-but-invalid config fails closed at startup. **Note:** Storefront BFF may still need a matching multi-origin change for shared session on additional hostnames.

## [4.2.1] — 2026-07-22

### Added

-   Single Admin UI Docker image embeds optional BFF: `VUE_APP_AUTH_MODE=bff` starts in-process BFF + nginx proxy on `/admin/api` and `/api` (works with `STRIP_PREFIX=true` edge strip); Direct mode unchanged
-   BFF `auth/me` rejects non-JSON / SPA HTML fallbacks so a mis-proxied login cannot fake a session
-   BFF env cleanup: loads root `.env` and accepts UI aliases (`VUE_APP_SERVER_BASE_URL`, `VUE_APP_BFF_BASE_URL`, `BASE_URL`, …); `createAuthTransport` uses `isBffAuthMode()`
-   BFF hardening follow-up: Express cookie `maxAge` in ms, SSO open-redirect guard, no `refresh_token` in browser logout URLs, fetch timeouts, session revalidate only on 401, `/admin` base-path aware public routes
-   Reject non-OK Keycloak session revocation responses (still best-effort for local logout)
-   BFF hardening / release notes (Phase 5): CSRF notes + Origin check when `PUBLIC_ORIGIN` is set, legacy token scrub in BFF mode, smoke-test checklists (`docs/bff-smoke-tests.md`), upgrade guidance in README
-   Shared-session invalidation: when BFF cookies are gone / refresh fails, Admin clears client state (incl. persisted Vuex user) and redirects to login; 401 on `/auth/me`, focus/poll re-check, BroadcastChannel + localStorage sync with Storefront
-   Shared Admin↔Storefront session (Phase 4): cookie contract module, login page resumes existing cookie session, Keycloak logout returns IdP browser logout URL, deploy guide in `docs/shared-session-deploy.md`
-   BFF Keycloak/SSO (Phase 3): Admin BFF OIDC+PKCE login/callback/logout/silent-check; Vue BFF mode uses server-side SSO (no `keycloak-js`); Direct mode keeps existing Keycloak client flow
-   Opt-in BFF auth transport (Phase 2): `DirectAuthTransport` / `BffAuthTransport` behind `ApiClientService`; set `VUE_APP_AUTH_MODE=bff` to use Admin BFF cookies (no auth tokens in `localStorage`); default Direct path unchanged
-   Optional Admin BFF MVP (Phase 1): Express service under `bff/` with login/logout/me/refresh/card cookies, generic Bearer proxy, Dockerfile, `docker-compose.bff.example.yml`, nginx `/admin/api` via `ADMIN_BFF_UPSTREAM`, and vue-cli proxy `/admin/api` → local BFF
-   Auth modes contract (Phase 0): optional Admin BFF / shared session with Storefront documented in `docs/adr/0001-optional-admin-bff-shared-session.md`; env placeholders `VUE_APP_AUTH_MODE` / `VUE_APP_BFF_BASE_URL` in `.env-example` (default remains Direct / legacy)
-   Bookable edit expert mode toggle: advanced tabs (Schließsysteme, Abhängigkeiten) and advanced sections (tags, graduated prices, lead times, special hours, discounts, required fields, field definitions, …) can be hidden when `VUE_APP_BOOKABLE_EXPERT_MODE_DEFAULT` is set to `true`/`false` (unset = always expert, no toggle); session override in `sessionStorage`; overview shows expert traits as non-clickable hints in simple mode
-   Bookable edit tab navigation shows nested subsections for the active tab (desktop list / mobile chips); clicking jumps to the card or Custom Fields sub-tab; optional deep-link via `?tab=…&section=…`
-   Bookable, tenant, and instance edit ask for confirmation before discarding unsaved changes when leaving the page, closing/reloading the tab, or resetting the form
-   Bookable edit „Eigene Felder“: simple mode shows only value editing; expert mode keeps both sub-tabs (Werte pflegen / Felder definieren)
-   Bookable edit shows a live overview of what the bookable is and how it can be booked (sticky sidebar on large screens, compact band on smaller viewports); empty traits are hidden, opening hours are summarized, and clicking a trait jumps to the matching tab; tickets show the linked event name with an open-in-new-tab action
-   Bookable edit keeps the page header, tab navigation, and overview fixed while only the form content scrolls
-   Bookable tags and flags live under Allgemein, with clearer labels: public info for bookers vs. internal tags for filtering/grouping
-   New bookables default to free time selection (Freie Zeitwahl) as booking type; new tickets default to time-independent (Zeitunabhängig)

### Changed

-   Bookable edit tab „Preise“ renamed to „Preise & Kapazität“ to reflect capacity settings
-   Member details show a warning when supervisor booking notifications are disabled for the tenant

### Fixed

-   Bookable edit no longer marks unsaved changes when opening „Preise & Kapazität“; the IFBS external provider is only created when the user enables or configures it

## [4.2.0] — 2026-07-17

### Added

-   Cancellation refund tiers: define refund rules per tenant, preview what customers get back, and show the expected refund during self-cancellation (including mails and cancellation documents)
-   When cancelling a series (or a single booking from a series), optional customer bank details can be collected for the cancellation PDF
-   Series bookings are easier to spot in the Kanban board and can be opened directly from the card; the booking overview can be filtered by single or series bookings
-   Supervisor booking notifications: configure who is notified about new bookings (users, roles, or email addresses) per tenant member
-   Percentage booking discounts for users and roles replace the previous free-booking lists; discounts also apply in bundle checkout
-   Cancellation PDF templates support refund information, with an option to load the standard template in the visual editor

### Changed

-   Custom fields: clearer editor and list with live preview; on bookables, field values and definitions are combined in one „Eigene Felder“ tab
-   Cancelled bookings can be reactivated via the status switch in booking edit

### Fixed

-   Reactivating a cancelled booking keeps the original price instead of resetting it to 0 €
-   Bundle checkout shows the payment step only when there is something left to pay after discounts (including paid add-ons)
-   Supervisor booking notifications can be turned on or off in booking settings; the related mail snippet is customizable
-   Member and user search matches name and email more reliably (case-insensitive substring search)
-   Saving a user or profile no longer overwrites booking contact names

## [4.1.3] — 2026-07-03

### Added

-   Series bookings in booking details can now have collective invoices created, with a choice between collective and single invoice — consistent with the existing collective receipt flow
-   Collective invoices for series bookings can also be created and downloaded from the series booking overview
-   PDF templates for receipts, invoices, and cancellations: choose how booking details are displayed (compact overview, single line, or detailed table)
-   Per tenant, control which booking information (number, period, payment date, payment method) appears in the PDF table — hidden fields remain available for placement elsewhere in the template
-   PDF template editor: preview with page breaks, optional header/footer on every page, and improved variable selection

### Changed

-   PDF template settings for layout and booking fields are combined in one place under payment and receipt settings

### Fixed

-   Tenant-selection redirect hardened against open-redirect vectors (protocol-relative and backslash paths)

## [4.1.2] — 2026-07-02

### Added

-   Lead-time configuration (preparation lead time and service hours) for fixed time-window and block-period bookables in the bookable editor

### Changed

-   Lead-time editor placement: time-window and block-period configuration appears before lead-time settings for those booking types
-   Booking buffer settings remain available only for free time-selection (`schedule`) bookables

## [4.1.1] — 2026-07-01

### Fixed

-   Free bookings labeled as „Kostenfrei“ instead of „Bezahlt“ across admin UI, checkout status, exports, and the booking-manager JS widget (DEV-776)
-   Payment status chip contrast for free bookings in booking details and public booking status view
-   `isFreeBooking` detection tightened to `priceEur` only; checkout pending filter and completion helpers aligned with shared payment status rules

## [4.1.0] — 2026-06-30

### Added

-   Admin UI for booking lead time: service hours, preparation lead time, and weekday-based configuration on the bookable editor
-   Capacity buffer fields in the lead-time editor (before/after booking), with enable switch and preset durations
-   Shared lead-time utilities (`bookingLeadTime.js`) for field normalization and buffer configuration

### Fixed

-   Lead-time editor initialization and service-hours time menus for existing entries
-   Lead-time section stays expanded after save; UI state decoupled from unrelated bookable fields (`isLeadTimeRelated`)
-   SaveBar layering when editing lead-time settings
-   Buffer cannot remain enabled without configured before/after values

### Changed

-   Booking buffer UI separated from lead-time section with its own enable switch (`isBufferRelated`)
-   Lead-time cards aligned with the elevation-2 card pattern used elsewhere in the editor

## [4.0.1] — 2026-06-29

### Added

-   Redesigned bookable edit page with dedicated view and routing

### Fixed

-   Reject handling for bookable edit workflows

## [4.0.0] — 2026-06-29

-   Initial stable release of the v4.x admin UI (Vue 2 / Vuetify)
-   Bookable and booking management, checkout configuration, and integration with the v4 backend API

## Earlier releases

See git tags `v4.0.0-rc.*` for release-candidate history.

[4.2.9]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.8...v4.2.9
[4.2.8]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.7...v4.2.8
[4.2.7]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.6...v4.2.7
[4.2.6]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.5...v4.2.6
[4.2.5]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.4...v4.2.5
[4.2.4]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.3...v4.2.4
[4.2.3]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.2...v4.2.3
[4.2.2]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.1...v4.2.2
[4.2.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.2.0...v4.2.1
[4.2.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.3...v4.2.0
[4.1.3]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.2...v4.1.3
[4.1.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.0...v4.1.1
[4.1.2]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.1...v4.1.2
[4.1.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.1...v4.1.0
[4.0.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/releases/tag/v4.0.0
