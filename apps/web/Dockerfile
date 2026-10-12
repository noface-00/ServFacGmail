# Build context: la raíz del monorepo (p. ej. `docker build -f apps/web/Dockerfile .`), porque el
# lockfile y la configuración del workspace de pnpm están ahí.
#
# Produce la imagen de Caddy que sirve el panel (estáticos en /srv/web) y hace de proxy de la API.
# El Caddyfile se monta desde docker-compose.yml.

# ==========================================
# Stage 1: build del panel (Vite)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /repo

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --filter @servfac/web

COPY apps/web/index.html apps/web/vite.config.js ./apps/web/
COPY apps/web/public ./apps/web/public
COPY apps/web/src ./apps/web/src

# Por defecto el panel llama a la API en el mismo dominio (/api, ver Caddyfile): sin CORS.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @servfac/web run build

# ==========================================
# Stage 2: Caddy con los estáticos
# ==========================================
FROM caddy:2-alpine

COPY --from=builder /repo/apps/web/dist /srv/web
