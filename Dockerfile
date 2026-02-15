# --- build stage ---
FROM node:20-bookworm AS build

# Native build tools for node-gyp addons (sweph)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable

# Copy full monorepo
COPY . .

# Build client
WORKDIR /app/client
RUN pnpm install --frozen-lockfile --ignore-scripts=false
RUN pnpm build

# Build server + ensure native addon is built
WORKDIR /app/server
RUN pnpm install --frozen-lockfile --ignore-scripts=false
RUN pnpm rebuild sweph
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
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
