# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copy package configuration and Prisma schema first so `postinstall` (prisma generate) has
# something to generate against.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN pnpm run build

# ==========================================
# Stage 2: Production Runner Stage
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

# openssl is required by Prisma's schema engine (used by `prisma migrate deploy`) on Alpine
RUN apk add --no-cache openssl

# Copy package files and Prisma schema first so `postinstall` (prisma generate) has
# something to generate against.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Expose port (default is 3005)
EXPOSE 3005

# Healthcheck using Node.js native fetch (supported in Node 18+)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3005) + '/health').then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"

# Apply pending Prisma migrations before starting the server (DATABASE_URL is only
# available as a runtime env var in Dokploy, not at build time).
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm start"]
