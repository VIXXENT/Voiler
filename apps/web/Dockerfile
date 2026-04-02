# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: builder
# Builds the TanStack Start SSR bundle (Nitro) for @voiler/web
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace manifest files first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY tsconfig.json ./

# Copy package.json for every workspace package used during the web build
COPY packages/config-ts/package.json  packages/config-ts/
COPY apps/api/package.json            apps/api/
COPY apps/web/package.json            apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy full source for the web app and its build-time workspace deps
COPY packages/config-ts/  packages/config-ts/
COPY apps/api/             apps/api/
COPY apps/web/             apps/web/

# VITE_API_URL is baked into the client bundle at build time
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the SSR bundle — outputs to apps/web/.output/
RUN pnpm --filter @voiler/web build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: runner
# Lean production image — Nitro server is self-contained in .output/
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# The Nitro bundle in .output/ includes all server dependencies
COPY --from=builder /app/apps/web/.output .output

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
