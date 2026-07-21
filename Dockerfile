# Admin UI image (nginx) with optional embedded Admin BFF (Node).
# Runtime: VUE_APP_AUTH_MODE=direct|bff — BFF starts in-process when mode is bff
# (or ADMIN_BFF_ENABLED=true). Same image for all instances.

# --- Optional BFF dependencies ---
FROM node:20-alpine AS bff-deps
WORKDIR /bff
COPY bff/package.json bff/package-lock.json ./
RUN npm ci --omit=dev
COPY bff/src ./src

# --- Vue Admin UI build ---
FROM node:18-alpine AS ui-builder
WORKDIR /app
RUN npm cache clean --force
COPY . .
RUN npm ci
RUN npm run build

# --- Runtime: nginx + node (for embedded BFF) ---
FROM nginx:alpine
WORKDIR /app

# Node runtime for optional embedded BFF (musl, matches alpine)
RUN apk add --no-cache nodejs

COPY --from=ui-builder /app/dist .
COPY --from=bff-deps /bff /opt/admin-bff

COPY build_utils/substitute_environment_variables.sh /substitute_environment_variables.sh
COPY build_utils/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /substitute_environment_variables.sh /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
