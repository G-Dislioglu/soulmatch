# --- build stage ---
FROM node:20-bookworm AS build

# Native build tools for node-gyp addons (sweph)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-setuptools \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN corepack enable

# Force native addons to build from source (important for .node)
ENV npm_config_build_from_source=true

# Prevent @playwright/test postinstall from downloading browser binaries.
# Playwright is a devDependency used only for local E2E tests; no browsers
# are needed in the Docker build and downloading them (~300 MB) would bloat
# the image and slow CI. Setting this var is the official skip mechanism.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy full monorepo
COPY . .

# Build client
WORKDIR /app/client
RUN pnpm install --frozen-lockfile --ignore-scripts=false
RUN pnpm build

# Build server + ensure native addon is built
WORKDIR /app/server
RUN pnpm install --frozen-lockfile --ignore-scripts=false

# Rebuild sweph and FAIL the build if the native binary is missing
RUN pnpm rebuild sweph
RUN ls -lah node_modules/sweph/build/Release/ || true
RUN test -f node_modules/sweph/build/Release/sweph.node

# Optional: hard runtime require test during build (also fails fast)
RUN node -e "require('sweph'); console.log('sweph require ok')"

RUN pnpm build

# --- runtime stage ---
FROM node:20-bookworm AS run

WORKDIR /app
RUN corepack enable

# Copy only runtime artifacts
COPY --from=build /app/server /app/server
COPY --from=build /app/client/dist /app/client/dist

WORKDIR /app/server

ENV NODE_ENV=production
# IMPORTANT: Do NOT override PORT on Render (Render injects it)
# ENV PORT=3001

# Optional: EXPOSE is not required by Render, but keep for clarity
EXPOSE 10000

CMD ["node", "dist/index.js"]
