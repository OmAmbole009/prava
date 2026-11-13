# ==============================================================================
# PRAVA FINANCIAL CLOUD - PRODUCTION DOCKERFILE
# Multi-stage lightweight build for cloud hosting (Render, Railway, AWS, VPS)
# ==============================================================================

# Stage 1: Builder
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency files and patches
COPY package*.json pnpm-lock.yaml* ./
COPY patches/ ./patches/

# Install dependencies (including devDependencies required for vite & esbuild)
RUN npm ci --include=dev --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend and compile backend into /app/dist
RUN npm run build

# Run this target as a one-off job before deploying the application image.
FROM builder AS migrator

ENV NODE_ENV=production

CMD ["npm", "run", "db:migrate"]

# Stage 2: Production Runner
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# DATABASE_URL, JWT_SECRET and APP_ORIGIN must be supplied at runtime. The server
# refuses to start in production without them (see server/_core/security.js).

# Copy package configurations
COPY package*.json ./

# Install only production runtime dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy compiled bundles from builder.
# Production state lives in the configured database and private object storage;
# the ephemeral .storage_cache directory is never shipped into the image.
COPY --from=builder /app/dist ./dist

# Expose default application port
EXPOSE 3000

# Container healthcheck for cloud orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start Prava production server
CMD ["npm", "start"]
