# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

# The admin is a static bundle, so the API address is baked in at build time.
ARG VITE_API_URL=""
ARG VITE_PUBLIC_ROOT_DOMAIN="example.com"
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PUBLIC_ROOT_DOMAIN=$VITE_PUBLIC_ROOT_DOMAIN
RUN pnpm --filter admin... build

FROM nginx:1.27-alpine AS runtime
COPY infra/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
