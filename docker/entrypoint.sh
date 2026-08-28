#!/bin/sh
# Start redis and the Go backend in one container; nginx runs as PID 1.
set -e

# --- Redis (upload rate limiting + view-count queue) -------------------------
mkdir -p /run/redis /var/log/redis
chown -R redis:redis /run/redis /var/log/redis
redis-server --daemonize yes \
    --bind 127.0.0.1 \
    --port 6379 \
    --save "" \
    --appendonly no \
    --logfile /var/log/redis/redis-server.log

# The backend's rate limiter is fail-closed, so wait until redis answers.
i=0
until redis-cli ping >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 50 ]; then
        echo "entrypoint: redis failed to become ready" >&2
        exit 1
    fi
    sleep 0.2
done

# --- Go backend ---------------------------------------------------------------
# Defaults are overridable via environment (e.g. docker run -e REDIS_ADDR=...)
export HOST="${HOST:-127.0.0.1}" \
       GIN_MODE="${GIN_MODE:-release}" \
       PORT="${PORT:-8080}" \
       DB_DRIVER="${DB_DRIVER:-sqlite}" \
       DB_DSN="${DB_DSN:-/app/data/wanpictures.db}" \
       REDIS_ADDR="${REDIS_ADDR:-127.0.0.1:6379}"

/app/server &
BACKEND_PID=$!

# Stop everything cleanly when nginx (PID 1) receives SIGTERM/SIGINT
trap 'kill "$BACKEND_PID" 2>/dev/null; redis-cli shutdown nosave 2>/dev/null || true' TERM INT

# --- nginx in the foreground ---------------------------------------------------
exec nginx -g "daemon off;"
