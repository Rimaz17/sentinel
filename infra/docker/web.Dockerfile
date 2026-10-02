# syntax=docker/dockerfile:1

# The web container: the frontend's production build, served by nginx, which
# also passes /api to the API. Built from the repository root:
#   docker build -f infra/docker/web.Dockerfile .
#
# Typecheck, lint and tests run in CI's frontend job; this builds only.

FROM node:22-alpine AS build
WORKDIR /build

# Dependencies first, so they are installed again only when the lockfile changes.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
RUN npm run build


FROM nginx:1.28-alpine

COPY infra/docker/web.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80
