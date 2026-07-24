# JS Web Interface (BookingManager)

## Overview

In addition to the Vue SPA, this project ships a standalone **JavaScript web interface** for embedding bookables, events, and calendars on external websites (CMS, WordPress, static pages).

| Item | Path |
|------|------|
| Source | `src/js-web-interface/booking-manager-js.js` |
| Production output | `dist/cdn/current/booking-manager.min.js` |
| Local test output | `public/cdn/current/booking-manager.min.js` |

Built via `uglifyjs` as part of `npm run build` and `npm run test-build`.

## Constraints

- **Vanilla JS** — no Vue, no build-time bundler for the embed script itself
- **Standalone** — must work when included via `<script>` tag on any website
- **CDN dependencies** — loads FullCalendar from CDN at runtime in `init()`
- **Backend API** — fetches data from the same REST API (`bm.url` = backend base URL)

## BookingManager API

```javascript
const bm = new BookingManager();
bm.url = "https://api.example.com";   // backend base URL
bm.tenant = "my-tenant";              // tenant identifier
bm.init();                           // load libraries, fetch data, bind placeholders
```

### Placeholder elements

The manager fills DOM elements by CSS class / `id` and `data-*` attributes:

| Element | Attributes | Renders |
|---------|------------|---------|
| `.bm-bookable-list` | `data-type`, `data-ids` | List of bookables |
| `.bm-bookable-item` | `data-id` or `data-id-param` | Single bookable detail |
| `.bm-event-list` | `data-ids` | List of events |
| `.bm-event-item` | `data-id` or `data-id-param` | Single event detail |
| `.bm-calendar` | `data-view` | Event calendar |
| `.bm-occupancy-calendar` | `data-id`, `data-view` | Occupancy calendar |
| `.bm-availability-calendar` | `data-id`, `data-view` | Availability calendar |

### Customization

Set properties **before** `init()`:

- `calendarHref` — link template for calendar events (`{id}` placeholder)
- `calendar` — extra FullCalendar options merged into defaults

CSS custom properties control loading indicator and primary color (`--bm-calendar-primary-color`, etc.).

## Development rules

- Keep the script self-contained — no imports from Vue app code
- Minify with uglifyjs (existing build pipeline) — don't switch bundlers without reason
- Test locally with `npm run test-build` and include from `public/cdn/current/`
- API changes must stay compatible with external embeds — breaking changes need migration notes in `docs/CHANGELOG.md`
- Human-facing embed documentation lives in `README.md` (Embedding section)

## Backend reference

Conceptual overview from the backend perspective:
[smart-city-booking-backend/docs/web-integration.md](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/web-integration.md)
