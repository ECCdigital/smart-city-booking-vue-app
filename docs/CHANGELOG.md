# Changelog

Notable changes for the Smart City Booking Admin UI.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Releases are tagged `v4.x.x` from branch `version/4.x`.

## [Unreleased]

### Added

- Bookable edit expert mode toggle: advanced tabs (Schließsysteme, Abhängigkeiten) and advanced sections (tags, graduated prices, lead times, special hours, discounts, required fields, field definitions, …) can be hidden when `VUE_APP_BOOKABLE_EXPERT_MODE_DEFAULT` is set to `true`/`false` (unset = always expert, no toggle); session override in `sessionStorage`; overview shows expert traits as non-clickable hints in simple mode
- Bookable edit tab navigation shows nested subsections for the active tab (desktop list / mobile chips); clicking jumps to the card or Custom Fields sub-tab; optional deep-link via `?tab=…&section=…`
- Bookable, tenant, and instance edit ask for confirmation before discarding unsaved changes when leaving the page, closing/reloading the tab, or resetting the form
- Bookable edit „Eigene Felder“: simple mode shows only value editing; expert mode keeps both sub-tabs (Werte pflegen / Felder definieren)
- Bookable edit shows a live overview of what the bookable is and how it can be booked (sticky sidebar on large screens, compact band on smaller viewports); empty traits are hidden, opening hours are summarized, and clicking a trait jumps to the matching tab; tickets show the linked event name with an open-in-new-tab action
- Bookable edit keeps the page header, tab navigation, and overview fixed while only the form content scrolls
- Bookable tags and flags live under Allgemein, with clearer labels: public info for bookers vs. internal tags for filtering/grouping
- New bookables default to free time selection (Freie Zeitwahl) as booking type; new tickets default to time-independent (Zeitunabhängig)

### Changed

- Member details show a warning when supervisor booking notifications are disabled for the tenant

## [4.2.0] — 2026-07-17

### Added

- Cancellation refund tiers: define refund rules per tenant, preview what customers get back, and show the expected refund during self-cancellation (including mails and cancellation documents)
- When cancelling a series (or a single booking from a series), optional customer bank details can be collected for the cancellation PDF
- Series bookings are easier to spot in the Kanban board and can be opened directly from the card; the booking overview can be filtered by single or series bookings
- Supervisor booking notifications: configure who is notified about new bookings (users, roles, or email addresses) per tenant member
- Percentage booking discounts for users and roles replace the previous free-booking lists; discounts also apply in bundle checkout
- Cancellation PDF templates support refund information, with an option to load the standard template in the visual editor

### Changed

- Custom fields: clearer editor and list with live preview; on bookables, field values and definitions are combined in one „Eigene Felder“ tab
- Cancelled bookings can be reactivated via the status switch in booking edit

### Fixed

- Reactivating a cancelled booking keeps the original price instead of resetting it to 0 €
- Bundle checkout shows the payment step only when there is something left to pay after discounts (including paid add-ons)
- Supervisor booking notifications can be turned on or off in booking settings; the related mail snippet is customizable
- Member and user search matches name and email more reliably (case-insensitive substring search)
- Saving a user or profile no longer overwrites booking contact names

## [4.1.3] — 2026-07-03

### Added

- Series bookings in booking details can now have collective invoices created, with a choice between collective and single invoice — consistent with the existing collective receipt flow
- Collective invoices for series bookings can also be created and downloaded from the series booking overview
- PDF templates for receipts, invoices, and cancellations: choose how booking details are displayed (compact overview, single line, or detailed table)
- Per tenant, control which booking information (number, period, payment date, payment method) appears in the PDF table — hidden fields remain available for placement elsewhere in the template
- PDF template editor: preview with page breaks, optional header/footer on every page, and improved variable selection

### Changed

- PDF template settings for layout and booking fields are combined in one place under payment and receipt settings

### Fixed

- Tenant-selection redirect hardened against open-redirect vectors (protocol-relative and backslash paths)

## [4.1.2] — 2026-07-02

### Added

- Lead-time configuration (preparation lead time and service hours) for fixed time-window and block-period bookables in the bookable editor

### Changed

- Lead-time editor placement: time-window and block-period configuration appears before lead-time settings for those booking types
- Booking buffer settings remain available only for free time-selection (`schedule`) bookables

## [4.1.1] — 2026-07-01

### Fixed

- Free bookings labeled as „Kostenfrei“ instead of „Bezahlt“ across admin UI, checkout status, exports, and the booking-manager JS widget (DEV-776)
- Payment status chip contrast for free bookings in booking details and public booking status view
- `isFreeBooking` detection tightened to `priceEur` only; checkout pending filter and completion helpers aligned with shared payment status rules

## [4.1.0] — 2026-06-30

### Added

- Admin UI for booking lead time: service hours, preparation lead time, and weekday-based configuration on the bookable editor
- Capacity buffer fields in the lead-time editor (before/after booking), with enable switch and preset durations
- Shared lead-time utilities (`bookingLeadTime.js`) for field normalization and buffer configuration

### Fixed

- Lead-time editor initialization and service-hours time menus for existing entries
- Lead-time section stays expanded after save; UI state decoupled from unrelated bookable fields (`isLeadTimeRelated`)
- SaveBar layering when editing lead-time settings
- Buffer cannot remain enabled without configured before/after values

### Changed

- Booking buffer UI separated from lead-time section with its own enable switch (`isBufferRelated`)
- Lead-time cards aligned with the elevation-2 card pattern used elsewhere in the editor

## [4.0.1] — 2026-06-29

### Added

- Redesigned bookable edit page with dedicated view and routing

### Fixed

- Reject handling for bookable edit workflows

## [4.0.0] — 2026-06-29

- Initial stable release of the v4.x admin UI (Vue 2 / Vuetify)
- Bookable and booking management, checkout configuration, and integration with the v4 backend API

## Earlier releases

See git tags `v4.0.0-rc.*` for release-candidate history.

[4.2.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.3...v4.2.0
[4.1.3]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.2...v4.1.3
[4.1.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.0...v4.1.1
[4.1.2]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.1...v4.1.2
[4.1.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.1...v4.1.0
[4.0.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/releases/tag/v4.0.0
