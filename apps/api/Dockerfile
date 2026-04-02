# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: builder
# Compiles the full monorepo workspace required by @voiler/api
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Build tools required by native module argon2
RUN apk add --no-cache python3 make g++

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace manifest files first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY tsconfig.json ./

# Copy package.json for every workspace package used by the API
COPY packages/config-ts/package.json   packages/config-ts/
COPY packages/config-env/package.json  packages/config-env/
COPY packages/domain/package.json      packages/domain/
COPY packages/core/package.json        packages/core/
COPY packages/schema/package.json      packages/schema/
COPY apps/api/package.json             apps/api/

# Install all dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Copy full source for packages the API depends on
COPY packages/config-ts/   packages/config-ts/
COPY packages/config-env/  packages/config-env/
COPY packages/domain/      packages/domain/
COPY packages/core/        packages/core/
COPY packages/schema/      packages/schema/
COPY apps/api/             apps/api/

# Build API and all its workspace dependencies in dependency order
RUN pnpm turbo build --filter=@voiler/api

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: runner
# Lean production image — only compiled output + prod node_modules
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace manifests required for pnpm to resolve the workspace graph
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for all packages present in the runner
COPY packages/config-ts/package.json   packages/config-ts/
COPY packages/config-env/package.json  packages/config-env/
COPY packages/domain/package.json      packages/domain/
COPY packages/core/package.json        packages/core/
COPY packages/schema/package.json      packages/schema/
COPY apps/api/package.json             apps/api/

# Install production dependencies only (includes native argon2 rebuild)
RUN apk add --no-cache python3 make g++ \
  && pnpm install --frozen-lockfile --prod \
  && apk del python3 make g++

# Copy compiled output from builder
COPY --from=builder /app/packages/config-env/dist  packages/config-env/dist
COPY --from=builder /app/packages/domain/dist      packages/domain/dist
COPY --from=builder /app/packages/core/dist        packages/core/dist
COPY --from=builder /app/packages/schema/dist      packages/schema/dist
COPY --from=builder /app/apps/api/dist             apps/api/dist

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
