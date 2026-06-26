FROM node:18-alpine AS builder
WORKDIR /app

RUN npm cache clean --force
COPY . .
RUN npm ci
RUN npm run build

FROM nginx:alpine
WORKDIR /app

COPY --from=builder /app/dist .

COPY build_utils/substitute_environment_variables.sh /substitute_environment_variables.sh
RUN chmod +x /substitute_environment_variables.sh
ENTRYPOINT ["/substitute_environment_variables.sh"]
