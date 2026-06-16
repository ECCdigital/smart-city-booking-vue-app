# Smart City Booking (Vue Frontend)

The **smart-city-booking** platform is an open-source software system designed
for Smart Cities and Smart Regions. It provides an efficient solution that
enables citizens, organizations, and businesses to book and manage resources
provided by public administrations.

This repository contains the **Vue frontend** of the application. The backend
including further documentation is maintained at:
[smart-city-booking-backend](https://github.com/ECCdigital/smart-city-booking-backend.git)

---

## Prerequisites

| Tool   | Version         | Note                            |
| ------ | --------------- | ------------------------------- |
| Node   | 18.x            | LTS recommended                 |
| npm    | ≥ 9             | ships with Node 18              |
| Docker | ≥ 20 (optional) | only for container deployments  |

---

## Configuration

Create a `.env` file in the project root by copying the provided example:

```bash
cp .env-example .env
```

Then adjust at least the following values:

| Variable                       | Description                                     | Example                                       |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------- |
| `VUE_APP_SERVER_BASE_URL`      | Base URL of the backend API                     | `https://api.my-city.de`                      |
| `VUE_APP_NAME`                 | Application title shown in the browser          | `My City – Booking Platform`                  |
| `VUE_APP_IS_PRODUCTION`        | Enable production mode                          | `true`                                        |
| `VUE_APP_CONTACT_ADDRESS`      | Contact address (footer / imprint)              | `City Office, Main St. 1, 12345 Sample City`  |
| `VUE_APP_CONTACT_URL`          | Link to the contact page                        | `https://www.my-city.de/contact`              |
| `VUE_APP_ALLOWED_EXT_DEFAULT`  | Allowed file extensions for uploads             | `pdf,doc,docx,xls,xlsx`                       |
| `VUE_APP_ALLOWED_EXT_IMAGES`   | Allowed file extensions for images              | `jpg,jpeg,png,svg`                            |
| `VUE_APP_PRIMARY_COLOR`        | Primary color (light theme, hex)                | `#1976D2`                                     |
| `VUE_APP_USERSNAP_API_KEY`     | API key for the Usersnap feedback tool *(optional)* |                                           |

> **Note:** All `VUE_APP_*` variables are embedded into the static files at
> **build time**. Any change requires a new build – unless you use the Docker
> image, which substitutes environment variables at container startup.

A complete overview of all variables (including light and dark theme colors) can
be found in [`.env-example`](.env-example).

---

## Deployment

### Option 1 – Static Build (Web Server)

1. **Install dependencies:**

   ```bash
   npm ci
   ```

2. **Create a production build:**

   ```bash
   npm run build
   ```

   This generates fully static files (HTML, CSS, JS) in the `./dist` directory
   that can be served by any web server.

3. **Serve via web server:**

   Copy the contents of `./dist` to the document root of your web server (e.g.
   nginx, Apache, Caddy). Since this is a Vue SPA, the server must be
   configured to fall back to `index.html` for all routes.

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

---

### Option 2 – Docker

The included `Dockerfile` uses a **multi-stage build**:

1. **Stage 1 (builder)** – Node 18: installs dependencies and creates the
   production build.
2. **Stage 2** – nginx-alpine: serves the static files. At container startup,
   the bundled `substitute_environment_variables.sh` script injects environment
   variables into the built files.

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

> **Advantage:** Thanks to the substitution script you can build **a single
> image** and use it across different environments (staging, production, …) by
> simply changing the environment variables.

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

## Embedding on Your Own Website (JS Web Interface)

In addition to the standalone Vue application, this project ships a lightweight
**JavaScript web interface** that lets you embed bookable objects, events,
calendars, login/logout and user profile components directly into **any
existing website** (e.g. a city's CMS, WordPress, TYPO3, or a plain static
page) – no Vue knowledge required.

The source lives in
[`src/js-web-interface/booking-manager-js.js`](src/js-web-interface/booking-manager-js.js).
During the build it is minified to `booking-manager.min.js`:

| Command             | Output location                                      | Purpose                       |
| ------------------- | --------------------------------------------------- | ----------------------------- |
| `npm run build`     | `./dist/cdn/current/booking-manager.min.js`         | Production build (served as CDN) |
| `npm run test-build`| `./public/cdn/current/booking-manager.min.js`       | Local testing                 |

When the frontend is deployed, the script is therefore reachable under
`https://<your-frontend-host>/cdn/current/booking-manager.min.js`.

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

| Element (class / id)                | Configuration attributes                                                                 | Description                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `.bm-bookable-list`                 | `data-type` (filter by type, optional), `data-ids` (comma-separated IDs, optional)       | Renders a list of bookable objects.                                   |
| `.bm-bookable-item`                 | `data-id` (fixed ID) **or** `data-id-param` (read ID from URL query parameter)           | Renders the detail view of a single bookable object.                  |
| `.bm-event-list`                    | `data-ids` (comma-separated IDs, optional)                                                | Renders a list of events.                                             |
| `.bm-event-item`                    | `data-id` (fixed ID) **or** `data-id-param` (read ID from URL query parameter)           | Renders the detail view of a single event.                           |
| `.bm-calendar`                      | `data-view` (`dayGridMonth` \| `timeGridWeek` \| …, default `dayGridMonth`)               | Calendar showing all events.                                          |
| `.bm-occupancy-calendar`            | `data-id` (comma-separated bookable IDs), `data-view` (default `dayGridMonth`)            | Calendar showing the occupancy of the given bookable object(s).       |
| `.bm-availability-calendar`         | `data-id` (comma-separated bookable IDs), `data-view` (default `dayGridMonth`)            | Calendar showing when the given bookable object(s) are **not** available. |

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

---

## Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/ECCdigital/smart-city-booking-vue-app.git
   cd smart-city-booking-vue-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure `.env`** (see [Configuration](#configuration))

4. **Start the dev server:**

   ```bash
   npm run serve
   ```

   The application will be available at
   [http://localhost:8080](http://localhost:8080) with hot-reload enabled.

---

## Available npm Scripts

| Script              | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `npm run serve`     | Dev server with hot-reload                                     |
| `npm run build`     | Production build to `./dist` incl. minified JS web interface   |
| `npm start`         | Serve in production mode (Node, 4 GB heap)                     |
| `npm run test-build`| Build JS web interface to `./public/cdn` for local testing     |
| `npm run format:check` | Prettier – check formatting                                |
| `npm run format:write` | Prettier – apply formatting                                 |
| `npm run lint:check`   | ESLint – report problems                                    |
| `npm run lint:fix`     | ESLint – auto-fix problems                                  |

---

## Contributing

We welcome and encourage active participation in this project. If you find a
bug, want to add a feature, or have suggestions, please open an **Issue** or
submit a **Pull Request**.

---

## License


This project is licensed under the
[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html). See the
[LICENSE.md](LICENSE.md) file for details.

