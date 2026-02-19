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

