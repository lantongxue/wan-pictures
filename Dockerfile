# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Build the React frontend (Vite -> dist/)
# ==============================================================================
FROM node:24-alpine AS frontend-builder

WORKDIR /src

# Glob keeps the build working from a fresh clone without package-lock.json
# (it is git-ignored in this repo). A stale lock falls back to npm install.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Build the Go backend (CGO + libvips for thumbnail generation)
# ==============================================================================
FROM golang:1.27-trixie AS backend-builder

# govips needs libvips headers and pkg-config at compile time
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        pkg-config \
        libvips-dev \
        librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src/backend

# Cache module downloads independently of source changes
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
RUN CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ==============================================================================
# Stage 3: Runtime — nginx (frontend + reverse proxy) + redis + Go backend
# ==============================================================================
FROM debian:trixie-slim AS runtime

# libvips42t64 pulls in the common format codecs (jpeg/png/webp/heif/jxl);
# librsvg2-2 adds SVG support. nginx serves the SPA, redis backs the
# fail-closed upload rate limiter and the view-count queue.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        tzdata \
        curl \
        nginx \
        redis-server \
        libvips42t64 \
        librsvg2-2 \
        libheif-plugin-libde265 \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default

COPY --from=backend-builder /out/server /app/server
COPY --from=frontend-builder /src/dist/ /usr/share/nginx/html/
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh

# Keep DB and uploads under a single volume: /app/data. The backend writes
# uploads to ./uploads (relative to /app), so it is symlinked into the volume.
RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/data/uploads \
    && ln -s /app/data/uploads /app/uploads

WORKDIR /app

ENV GIN_MODE=release \
    PORT=8080 \
    DB_DRIVER=sqlite \
    DB_DSN=/app/data/wanpictures.db

VOLUME ["/app/data"]

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
