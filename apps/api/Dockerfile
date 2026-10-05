# Build context: the monorepo root (e.g. `docker build -f apps/api/Dockerfile .`), since the
# pnpm lockfile and workspace config live there.

# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /repo

RUN corepack enable

# Copy workspace manifests and the Prisma schema first so `postinstall` (prisma generate) has
# something to generate against.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install all dependencies (including devDependencies) for the API package only
RUN pnpm install --frozen-lockfile --filter @servfac/api

# Copy source code and TypeScript config
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src/ ./apps/api/src/

# Compile TypeScript to JavaScript
RUN pnpm --filter @servfac/api run build

# ==========================================
# Stage 2: Production Runner Stage
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /repo

ENV NODE_ENV=production

RUN corepack enable

# openssl is required by Prisma's schema engine (used by `prisma migrate deploy`) on Alpine
RUN apk add --no-cache openssl

# Copy workspace manifests and the Prisma schema first so `postinstall` (prisma generate) has
# something to generate against.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install only production dependencies for the API package
RUN pnpm install --frozen-lockfile --prod --filter @servfac/api

# Copy compiled code from builder
COPY --from=builder /repo/apps/api/dist ./apps/api/dist

WORKDIR /repo/apps/api

# Expose port (default is 3005)
EXPOSE 3005

# Healthcheck using Node.js native fetch (supported in Node 18+)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3005) + '/health').then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"

# Apply pending Prisma migrations before starting the server (DATABASE_URL is only
# available as a runtime env var in Dokploy, not at build time).
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm start"]
