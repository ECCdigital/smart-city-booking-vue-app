#!/bin/sh

ROOT_DIR=/app

replace_env_var() {
  local env_var=$1
  local placeholder=$2
  local default_value=$3
  env_var=${env_var:-$default_value}
  for file in $ROOT_DIR/js/*.js* $ROOT_DIR/index.html $ROOT_DIR/precache-manifest*.js $ROOT_DIR/css/*.css;
    do
        [ -f "$file" ] || continue
        sed -i "s|$placeholder|$env_var|g" $file
    done
}

# ==========================================
# Nginx Config
# ==========================================
LOCATION_PATH="${BASE_URL%/}"
LOCATION_PATH="${LOCATION_PATH:-/}"
STRIP_PREFIX="${STRIP_PREFIX:-true}"

if [ "$LOCATION_PATH" = "/" ] || [ "$STRIP_PREFIX" = "true" ]; then

cat > /etc/nginx/nginx.conf <<'NGINXEOF'
user  nginx;
worker_processes  1;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;
events { worker_connections 1024; }
http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
  access_log  /var/log/nginx/access.log  main;
  sendfile on;
  keepalive_timeout 65;
  server {
    listen 80;
    server_name localhost;
    location / {
      root   /app;
      index  index.html;
      try_files $uri $uri/ /index.html;
    }
  }
}
NGINXEOF
echo "==> Generated nginx.conf (location /)"

else

cat > /etc/nginx/nginx.conf <<NGINXEOF
user  nginx;
worker_processes  1;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;
events { worker_connections 1024; }
http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  log_format  main  '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
  access_log  /var/log/nginx/access.log  main;
  sendfile on;
  keepalive_timeout 65;
  server {
    listen 80;
    server_name localhost;

    location = ${LOCATION_PATH} {
      return 301 ${LOCATION_PATH}/;
    }

    location ${LOCATION_PATH}/ {
      alias /app/;
      index index.html;
      try_files \$uri \$uri/ ${LOCATION_PATH}/index.html;
    }
  }
}
NGINXEOF
echo "==> Generated nginx.conf (location ${LOCATION_PATH}/)"

fi

# ==========================================
# Replace VUE_APP_* env vars
# ==========================================
replace_env_var "$VUE_APP_SERVER_BASE_URL" "VUE_APP_SERVER_BASE_URL_PLACEHOLDER"
replace_env_var "$VUE_APP_NAME" "VUE_APP_NAME_PLACEHOLDER"
replace_env_var "$VUE_APP_IS_PRODUCTION" "VUE_APP_IS_PRODUCTION_PLACEHOLDER"

replace_env_var "$VUE_APP_CONTACT_ADDRESS" "VUE_APP_CONTACT_ADDRESS_PLACEHOLDER"
replace_env_var "$VUE_APP_CONTACT_URL" "VUE_APP_CONTACT_URL_PLACEHOLDER"

replace_env_var "$VUE_APP_PRIMARY_COLOR" "VUE_APP_PRIMARY_COLOR_PLACEHOLDER" "#0099DB"
replace_env_var "$VUE_APP_SECONDARY_COLOR" "VUE_APP_SECONDARY_COLOR_PLACEHOLDER" "#FFCC00"
replace_env_var "$VUE_APP_ACCENT_COLOR" "VUE_APP_ACCENT_COLOR_PLACEHOLDER" "#e5f5fc"
replace_env_var "$VUE_APP_ERROR_COLOR" "VUE_APP_ERROR_COLOR_PLACEHOLDER" "#FF5252"
replace_env_var "$VUE_APP_INFO_COLOR" "VUE_APP_INFO_COLOR_PLACEHOLDER" "#2196F3"
replace_env_var "$VUE_APP_SUCCESS_COLOR" "VUE_APP_SUCCESS_COLOR_PLACEHOLDER" "#4CAF50"
replace_env_var "$VUE_APP_WARNING_COLOR" "VUE_APP_WARNING_COLOR_PLACEHOLDER" "#FB8C00"
replace_env_var "$VUE_APP_BODY_COLOR" "VUE_APP_BODY_COLOR_PLACEHOLDER" "#707070"
replace_env_var "$VUE_APP_DARKGREY_COLOR" "VUE_APP_DARKGREY_COLOR_PLACEHOLDER" "#3b3b3b"

replace_env_var "$VUE_APP_PRIMARY_COLOR_DARK" "VUE_APP_PRIMARY_COLOR_DARK_PLACEHOLDER" "#0099DB"
replace_env_var "$VUE_APP_SECONDARY_COLOR_DARK" "VUE_APP_SECONDARY_COLOR_DARK_PLACEHOLDER" "#FFCC00"
replace_env_var "$VUE_APP_ACCENT_COLOR_DARK" "VUE_APP_ACCENT_COLOR_DARK_PLACEHOLDER" "#282828"
replace_env_var "$VUE_APP_ERROR_COLOR_DARK" "VUE_APP_ERROR_COLOR_DARK_PLACEHOLDER" "#FF5252"
replace_env_var "$VUE_APP_INFO_COLOR_DARK" "VUE_APP_INFO_COLOR_DARK_PLACEHOLDER" "#2196F3"
replace_env_var "$VUE_APP_SUCCESS_COLOR_DARK" "VUE_APP_SUCCESS_COLOR_DARK_PLACEHOLDER" "#4CAF50"
replace_env_var "$VUE_APP_WARNING_COLOR_DARK" "VUE_APP_WARNING_COLOR_DARK_PLACEHOLDER" "#FB8C00"
replace_env_var "$VUE_APP_BODY_COLOR_DARK" "VUE_APP_BODY_COLOR_DARK_PLACEHOLDER" "#707070"
replace_env_var "$VUE_APP_DARKGREY_COLOR_DARK" "VUE_APP_DARKGREY_COLOR_DARK_PLACEHOLDER" "#f5f5f5"

replace_env_var "$VUE_APP_USERSNAP_API_KEY" "VUE_APP_USERSNAP_API_KEY_PLACEHOLDER" ""

echo "==> Starting nginx"
nginx -g 'daemon off;'
