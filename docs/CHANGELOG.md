# Changelog

Notable changes for the Smart City Booking Admin UI.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Releases are tagged `v4.x.x` from branch `version/4.x`.

## [4.1.0] — 2026-06-30

### Added

- Admin UI for booking lead time (DEV-630, phase 1): service hours, preparation lead time, and weekday-based configuration on the bookable editor
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

[4.1.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.1...v4.1.0
[4.0.1]: https://github.com/ECCdigital/smart-city-booking-vue-app/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/ECCdigital/smart-city-booking-vue-app/releases/tag/v4.0.0
