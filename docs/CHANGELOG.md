# Changelog

Notable changes for the Smart City Booking Admin UI.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Releases are tagged `v4.x.x` from branch `version/4.x`.

## [Unreleased]

### Added

- Series bookings in the Kanban board are now visually marked with a chip and accent border; the series can be opened directly from the card (DEV-626)
- Booking overview filter for booking type: all, single bookings only, or series bookings only — accessible via filter button in the search field (DEV-626)
- Admin UI for supervisor booking notifications (DEV-779): manage `bookingNotificationRecipients` per tenant member (user, role, email; max. 10) in the member detail dialog
- Bookable permissions: per-user and per-role booking discounts with percentage field (0–100) replace the previous free-booking lists (DEV-781)
- Bundle checkout: role/user booking discounts shown via `bookingDiscountPercent`; opt-out uses `bookWithoutDiscount` instead of `bookWithPrice` (DEV-781)
- Tenant cancellation refund tiers with policy previews, admin overrides, and per-booking series breakdowns (DEV-786)
- Persisted cancellation refund audit on bookings with read-only display in booking details and edit views (DEV-786)

### Changed

- Custom fields: simplified editor and list layout with live preview, clearer labels, and read-only inherited fields
- Bookable edit: custom field values and definitions merged into a single „Eigene Felder“ tab
- Cancelled bookings can be reactivated via the status switch in booking edit (DEV-786)

### Fixed

- Reactivating a cancelled booking no longer resets the booking price to 0 € (DEV-786)

### Fixed

- Bundle checkout: payment step is shown when additional bookables require payment, even if the lead bookable is free via role discount (DEV-781)
- Bundle checkout: payment step no longer appears when the discounted checkout total is zero (DEV-781)
- Tenant feature flag `notifySupervisorsOnBooking` toggle in booking settings
- Overridable mail snippet `supervisor-booking-notification` in tenant mail configuration

### Fixed

- Member and instance user search now uses case-insensitive substring matching on name and email instead of fuzzy matching, preventing unrelated results (DEV-784)


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

[4.1.3]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.2...v4.1.3
[4.1.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.0...v4.1.1
[4.1.2]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.1.1...v4.1.2
[4.1.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.1...v4.1.0
[4.0.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/releases/tag/v4.0.0
