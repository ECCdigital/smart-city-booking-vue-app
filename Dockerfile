# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Name the node stage "builder"
FROM node:current-alpine AS builder
# Set working directory
WORKDIR /app

# Copy all files from current directory to working dir in image
COPY . .
# install node modules and build assets
RUN npm ci --omit=dev
RUN npm run build

# nginx state for serving content
FROM nginx:alpine
# Set working directory to nginx asset directory
WORKDIR /app

# Copy static assets from builder stage
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/nginx.conf

COPY build_utils/substitute_environment_variables.sh /substitute_environment_variables.sh
RUN chmod +x /substitute_environment_variables.sh
ENTRYPOINT ["/substitute_environment_variables.sh"]
