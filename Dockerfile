# syntax=docker/dockerfile:1.7
# SignalBench web image. Build context is the repo root (npm workspaces).
#
#   docker build --build-arg COMMIT_SHA=$(git rev-parse HEAD) -t signalbench/web .
#   docker run --rm -p 3000:3000 signalbench/web
#
# Market data is fetched and every backtest runs during the build, so each
# image is a self-contained, reproducible snapshot. Fresh data means a new image.

ARG NODE_VERSION=22-alpine

# ---- deps: install once, cached on the lockfile ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/data/package.json packages/data/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

# ---- build: fetch candles, run backtests, build Next ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG COMMIT_SHA=dev
ARG SB_HISTORY_DAYS=365
# Absolute URL used for canonical links, the sitemap and Open Graph images. Pages are prerendered, so it is fixed at build time.
ARG SITE_URL=https://signalbench.sholaayeni.xyz
ENV COMMIT_SHA=${COMMIT_SHA} SB_HISTORY_DAYS=${SB_HISTORY_DAYS} SITE_URL=${SITE_URL}
# A new value per build (CI passes the run id) keeps the layer cache from reusing old market data.
ARG DATA_BUILD_ID=local
RUN echo "data build ${DATA_BUILD_ID}" && npm run fetch && npm run backtest && npm run build

# ---- runtime: standalone server only, non-root ----
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ARG COMMIT_SHA=dev
ENV COMMIT_SHA=${COMMIT_SHA}
LABEL org.opencontainers.image.source="https://github.com/ayenisholah/signalbench" \
      org.opencontainers.image.revision="${COMMIT_SHA}" \
      org.opencontainers.image.licenses="MIT"

RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/data ./apps/web/data

USER app
EXPOSE 3000
WORKDIR /app/apps/web
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
