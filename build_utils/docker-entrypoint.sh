#!/bin/sh
# Single Admin UI image entrypoint:
# - Direct (default): nginx + static SPA only
# - BFF: also start embedded Admin BFF and proxy /admin/api → it
set -e

AUTH_MODE=$(printf '%s' "${VUE_APP_AUTH_MODE:-direct}" | tr '[:upper:]' '[:lower:]')
BFF_ENABLED="${ADMIN_BFF_ENABLED:-}"

if [ -z "$BFF_ENABLED" ]; then
  if [ "$AUTH_MODE" = "bff" ]; then
    BFF_ENABLED="true"
  else
    BFF_ENABLED="false"
  fi
fi

start_embedded_bff() {
  export PORT="${ADMIN_BFF_PORT:-3001}"

  if [ -z "${API_BASE_URL:-}" ] && [ -n "${VUE_APP_SERVER_BASE_URL:-}" ]; then
    export API_BASE_URL="$VUE_APP_SERVER_BASE_URL"
  fi

  if [ -z "${API_BASE_URL:-}" ]; then
    echo "ERROR: BFF mode requires API_BASE_URL or VUE_APP_SERVER_BASE_URL" >&2
    exit 1
  fi

  # Default nginx → local BFF (override with ADMIN_BFF_UPSTREAM for an external BFF)
  if [ -z "${ADMIN_BFF_UPSTREAM:-}" ]; then
    export ADMIN_BFF_UPSTREAM="http://127.0.0.1:${PORT}"
  fi

  if [ -z "${BFF_PUBLIC_PATH:-}" ]; then
    export BFF_PUBLIC_PATH="${VUE_APP_BFF_BASE_URL:-/admin/api}"
  fi

  if [ -z "${ADMIN_SPA_BASE_PATH:-}" ]; then
    # BASE_URL may be "/admin" or "/admin/"
    _spa="${BASE_URL:-/admin}"
    _spa="${_spa%/}"
    export ADMIN_SPA_BASE_PATH="${_spa}"
  fi

  if [ -z "${VUE_APP_BFF_BASE_URL:-}" ]; then
    export VUE_APP_BFF_BASE_URL="${BFF_PUBLIC_PATH}"
  fi

  echo "==> Embedded Admin BFF enabled"
  echo "    API_BASE_URL=${API_BASE_URL}"
  echo "    PORT=${PORT}"
  echo "    BFF_PUBLIC_PATH=${BFF_PUBLIC_PATH}"
  echo "    ADMIN_BFF_UPSTREAM=${ADMIN_BFF_UPSTREAM}"
  echo "    PUBLIC_ORIGIN=${PUBLIC_ORIGIN:-"(unset)"}"

  node /opt/admin-bff/src/index.js &
  BFF_PID=$!

  # Brief readiness wait (BFF is lightweight)
  i=0
  while [ "$i" -lt 50 ]; do
    if node -e "fetch('http://127.0.0.1:${PORT}/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      2>/dev/null; then
      echo "==> Admin BFF ready on :${PORT}"
      break
    fi
    i=$((i + 1))
    sleep 0.1
  done

  if ! kill -0 "$BFF_PID" 2>/dev/null; then
    echo "ERROR: Embedded Admin BFF failed to start" >&2
    exit 1
  fi

  trap 'kill "$BFF_PID" 2>/dev/null || true' TERM INT
}

if [ "$BFF_ENABLED" = "true" ] || [ "$BFF_ENABLED" = "1" ] || [ "$BFF_ENABLED" = "yes" ]; then
  start_embedded_bff
else
  echo "==> Admin BFF disabled (Direct auth mode)"
fi

exec /substitute_environment_variables.sh
