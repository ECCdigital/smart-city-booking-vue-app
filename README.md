# Smart City Booking — Admin UI

![Vue.js](https://img.shields.io/badge/Vue.js-blue)
![Node.js](https://img.shields.io/badge/Node.js-blue)
![npm](https://img.shields.io/badge/npm-blue)
![Docker](https://img.shields.io/badge/Docker-blue)

**[Smart City Booking](https://smart-city-booking.de/)** makes your administration's offerings bookable online — from rooms and sports facilities to makerspaces. Operated and developed by the Biletado core team. Open source, GDPR-compliant, and ready to deploy.

This repository contains the **Admin UI** for administration, configuration, and the JS web interface for embedding bookables on external websites. It connects to the backend API (see [Ecosystem](#ecosystem)).

---

## Ecosystem

| Component | Repository | Role |
|-----------|------------|------|
| **Backend API** | [smart-city-booking-backend](https://github.com/ECCdigital/smart-city-booking-backend) | REST API, auth, bookings, tenants |
| **Storefront** | [smart-city-booking-store-front](https://github.com/ECCdigital/smart-city-booking-store-front) | Public booking UI — connects to the API (v4) |
| **Admin UI** | [smart-city-booking-vue-app](https://github.com/ECCdigital/smart-city-booking-vue-app) | Administration, configuration, and JS web interface for embedding |

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Storefront    │────▶│    Backend API       │◀────│     Admin UI     │
│  (public UI)    │     │  (backend repository)│     │ (this repository)│
└─────────────────┘     └──────────┬───────────┘     └──────────────────┘
                                   │
                                   ▼
                              ┌─────────┐
                              │ MongoDB │
                              └─────────┘
```

> **v3 users:** Continue on branch `version/3.x`. v3 typically uses the vue-app for both admin and public flows. v4 introduces the separate Storefront for public booking.

More details: [smart-city-booking-backend/docs/architecture.md](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/architecture.md)

---

## Versions & Branches

| Branch | Version line | Purpose |
|--------|--------------|---------|
| `develop` | **v4.x** (latest) | Active development and integration |
| `version/4.x` | **v4.x** (stable) | Maintenance, security fixes, production tag source |
| `version/3.x` | **v3.x** (LTS) | Maintenance and security fixes |

- v4 releases: tags `v4.x.x` from `version/4.x`
- v3 maintenance: tags `v3.x.x` from `version/3.x`

Breaking changes: [smart-city-booking-backend/docs/CHANGELOG.md](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/CHANGELOG.md)

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20+ (LTS recommended)
- [npm](https://www.npmjs.com/) v10+
- [Docker](https://www.docker.com/) v20+ (optional, for container deployments)
- A running [backend API](https://github.com/ECCdigital/smart-city-booking-backend) instance

### Installation

```bash
git clone https://github.com/ECCdigital/smart-city-booking-vue-app.git
cd smart-city-booking-vue-app
npm install
cp .env-example .env
```

Configure at least the backend URL in `.env`:

```bash
VUE_APP_SERVER_BASE_URL=http://localhost:8081
```

Start the development server (backend must be running):

```bash
npm run serve
```

The application will be available at [http://localhost:8080](http://localhost:8080) with hot-reload enabled.

---

## Configuration

Create a `.env` file in the project root by copying the provided example:

```bash
cp .env-example .env
```

Then adjust at least the following values:

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `VUE_APP_SERVER_BASE_URL` | Base URL of the backend API | `https://api.my-city.de` |
| `VUE_APP_NAME` | Application title shown in the browser | `My City – Booking Platform` |
| `VUE_APP_IS_PRODUCTION` | Enable production mode | `true` |
| `VUE_APP_CONTACT_ADDRESS` | Contact address (footer / imprint) | `City Office, Main St. 1, 12345 Sample City` |
| `VUE_APP_CONTACT_URL` | Link to the contact page | `https://www.my-city.de/contact` |
| `VUE_APP_ALLOWED_EXT_DEFAULT` | Allowed file extensions for uploads | `pdf,doc,docx,xls,xlsx` |
| `VUE_APP_ALLOWED_EXT_IMAGES` | Allowed file extensions for images | `jpg,jpeg,png,svg` |
| `VUE_APP_PRIMARY_COLOR` | Primary color (light theme, hex) | `#1976D2` |
| `VUE_APP_USERSNAP_API_KEY` | API key for the Usersnap feedback tool *(optional)* | |

> **Note:** All `VUE_APP_*` variables are embedded into the static files at **build time**. Any change requires a new build — unless you use the Docker image, which substitutes environment variables at container startup.

A complete overview of all variables (including light and dark theme colors and SSO settings) can be found in [`.env-example`](.env-example).

---

## Embedding on Your Own Website (JS Web Interface)

In addition to the standalone Vue application, this project ships a lightweight
**JavaScript web interface** that lets you embed bookable objects, events,
calendars, login/logout and user profile components directly into **any
existing website** (e.g. a city's CMS, WordPress, TYPO3, or a plain static
page) – no Vue knowledge required.

The source lives in
[`src/js-web-interface/booking-manager-js.js`](src/js-web-interface/booking-manager-js.js).
During the build it is minified to `booking-manager.min.js`:

| Command | Output location | Purpose |
| ------- | --------------- | ------- |
| `npm run build` | `./dist/cdn/current/booking-manager.min.js` | Production build (served as CDN) |
| `npm run test-build` | `./public/cdn/current/booking-manager.min.js` | Local testing |

When the frontend is deployed, the script is therefore reachable under
`https://<your-frontend-host>/cdn/current/booking-manager.min.js`.

For a conceptual overview and API usage from the backend perspective, see
[smart-city-booking-backend/docs/web-integration.md](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/web-integration.md).

### 1. Include the script

Add the script to your page (using the minified file in production, or the
unminified source during development):

```html
<!-- Production: minified version served from your frontend host -->
<script src="https://booking.my-city.de/cdn/current/booking-manager.min.js"></script>
```

### 2. Initialize the Booking Manager

```html
<script>
  const bm = new BookingManager();

  // Base URL of the backend API (same value as VUE_APP_SERVER_BASE_URL)
  bm.url = "https://api.my-city.de";

  // Tenant identifier of the tenant you want to embed the booking manager for
  bm.tenant = "my-tenant";

  // Initialize once the page has finished loading
  window.addEventListener("load", () => {
    bm.init();
  });
</script>
```

`init()` automatically loads the required [FullCalendar](https://fullcalendar.io/)
libraries from a CDN, fetches the relevant data from the backend and binds it
to the placeholder elements described below.

### 3. Place the components

Add the desired placeholder elements anywhere in your HTML. The Booking Manager
fills them with content based on their CSS class / `id` and `data-*`
attributes. You can use the **class** variants multiple times on the same page;
the `id` variants are kept for backwards compatibility and should only appear
once.

| Element (class / id) | Configuration attributes | Description |
| -------------------- | ------------------------ | ----------- |
| `.bm-bookable-list` | `data-type` (filter by type, optional), `data-ids` (comma-separated IDs, optional) | Renders a list of bookable objects. |
| `.bm-bookable-item` | `data-id` (fixed ID) **or** `data-id-param` (read ID from URL query parameter) | Renders the detail view of a single bookable object. |
| `.bm-event-list` | `data-ids` (comma-separated IDs, optional) | Renders a list of events. |
| `.bm-event-item` | `data-id` (fixed ID) **or** `data-id-param` (read ID from URL query parameter) | Renders the detail view of a single event. |
| `.bm-calendar` | `data-view` (`dayGridMonth` \| `timeGridWeek` \| …, default `dayGridMonth`) | Calendar showing all events. |
| `.bm-occupancy-calendar` | `data-id` (comma-separated bookable IDs), `data-view` (default `dayGridMonth`) | Calendar showing the occupancy of the given bookable object(s). |
| `.bm-availability-calendar` | `data-id` (comma-separated bookable IDs), `data-view` (default `dayGridMonth`) | Calendar showing when the given bookable object(s) are **not** available. |

**Example – list and detail page:**

```html
<!-- List of bookable rooms -->
<div class="bm-bookable-list" data-type="room"></div>

<!-- Detail view, reads the bookable id from the URL parameter "id"
     e.g. https://my-city.de/detail?id=123 -->
<div class="bm-bookable-item" data-id-param="id"></div>

<!-- Event calendar in week view -->
<div class="bm-calendar" data-view="timeGridWeek"></div>
```

### 4. Optional customization

The `BookingManager` instance exposes a few properties you can set **before**
calling `init()`:

```html
<script>
  const bm = new BookingManager();
  bm.url = "https://api.my-city.de";
  bm.tenant = "my-tenant";

  // Link template for calendar events ({id} is replaced with the event id)
  bm.calendarHref = "https://my-city.de/event?id={id}";

  // Extra FullCalendar options, merged into the default configuration
  bm.calendar = {
    locale: "de",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek",
    },
  };

  window.addEventListener("load", () => bm.init());
</script>
```

The loading indicator of the calendars can be styled via CSS custom properties:

```css
:root {
  --bm-calendar-loading-bg: rgba(255, 255, 255, 0.8);
  --bm-calendar-loading-color: #333;
  --bm-calendar-loading-opacity: 0.6;
  --bm-calendar-primary-color: #3498db;
}
```

### Build and deployment of the script host

To build and serve `booking-manager.min.js` in production, deploy this repository's
frontend (static build or Docker) so that `/cdn/current/booking-manager.min.js` is
reachable from your website. See [Production](#production) for build commands,
nginx configuration, and Docker deployment.

---

## Available npm Scripts

| Script | Description |
| ------ | ----------- |
| `npm run serve` | Dev server with hot-reload |
| `npm run build` | Production build to `./dist` incl. minified JS web interface |
| `npm start` | Serve in production mode (Node, 4 GB heap) |
| `npm run test-build` | Build JS web interface to `./public/cdn` for local testing |
| `npm run format:check` | Prettier – check formatting |
| `npm run format:write` | Prettier – apply formatting |
| `npm run lint:check` | ESLint – report problems |
| `npm run lint:fix` | ESLint – auto-fix problems |

---

## Production

For backend deployment (Docker, secrets, process management), see [smart-city-booking-backend/docs/deployment.md](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/deployment.md).

### Option 1 – Static Build (Web Server)

1. **Install dependencies:**

   ```bash
   npm ci
   ```

2. **Create a production build:**

   ```bash
   npm run build
   ```

   This generates fully static files (HTML, CSS, JS) in the `./dist` directory that can be served by any web server.

3. **Serve via web server:**

   Copy the contents of `./dist` to the document root of your web server (e.g. nginx, Apache, Caddy). Since this is a Vue SPA, the server must be configured to fall back to `index.html` for all routes.

   **Example – nginx:**

   ```nginx
   server {
       listen       80;
       server_name  booking.my-city.de;
       root         /var/www/smart-city-booking;
       index        index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Option 2 – Docker

The included `Dockerfile` uses a **multi-stage build**:

1. **Stage 1 (builder)** – Node 18: installs dependencies and creates the production build.
2. **Stage 2** – nginx-alpine: serves the static files. At container startup, the bundled `substitute_environment_variables.sh` script injects environment variables into the built files.

**Build the image:**

```bash
docker build -t smart-city-booking-frontend .
```

**Run the container:**

```bash
docker run -d \
  -p 8080:80 \
  -e VUE_APP_SERVER_BASE_URL=https://api.my-city.de \
  -e VUE_APP_NAME="My City – Booking Platform" \
  -e VUE_APP_IS_PRODUCTION=true \
  -e VUE_APP_CONTACT_ADDRESS="City Office, Main St. 1, 12345 Sample City" \
  -e VUE_APP_CONTACT_URL=https://www.my-city.de/contact \
  --name booking-frontend \
  smart-city-booking-frontend
```

> **Advantage:** Thanks to the substitution script you can build **a single image** and use it across different environments (staging, production, …) by simply changing the environment variables.

**Docker Compose (example snippet):**

```yaml
services:
  frontend:
    build: .
    ports:
      - "8080:80"
    environment:
      VUE_APP_SERVER_BASE_URL: https://api.my-city.de
      VUE_APP_NAME: "My City – Booking Platform"
      VUE_APP_IS_PRODUCTION: "true"
      VUE_APP_CONTACT_ADDRESS: "City Office, Main St. 1, 12345 Sample City"
      VUE_APP_CONTACT_URL: https://www.my-city.de/contact
```

---

## Documentation

| Topic | Description |
|-------|-------------|
| [Architecture](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/architecture.md) | System components, data flow, version lines |
| [Web Integration](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/web-integration.md) | Embed bookables & events in existing websites (JS web interface) |
| [Deployment](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/deployment.md) | Production setup, Docker, operations |
| [API Reference](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/api/README.md) | Endpoints, permissions, examples |
| [Authentication](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/api/authentication.md) | Auth routes and JWT configuration |
| [Changelog](https://github.com/ECCdigital/smart-city-booking-backend/blob/develop/docs/CHANGELOG.md) | Version history and breaking changes |

---

## License

GPL-3.0 — see [LICENSE.md](LICENSE.md)
