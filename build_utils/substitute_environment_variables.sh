#!/bin/sh

ROOT_DIR=/app

# Replace env vars in files served by NGINX
for file in $ROOT_DIR/js/*.js* $ROOT_DIR/index.html $ROOT_DIR/precache-manifest*.js;
do
  sed -i "s|VUE_APP_SERVER_BASE_URL_PLACEHOLDER|$VUE_APP_SERVER_BASE_URL|g" $file
  sed -i "s|VUE_APP_NAME_PLACEHOLDER|$VUE_APP_NAME|g" $file
  sed -i "s|VUE_APP_IS_PRODUCTION_PLACEHOLDER|$VUE_APP_IS_PRODUCTION|g" $file
done
# Starting NGINX
nginx -g 'daemon off;'
