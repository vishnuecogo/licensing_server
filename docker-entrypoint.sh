#!/bin/bash
set -eu

echo "🚀 Starting Evachatbot Licensing Server..."

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Wait for database to be ready
log "Waiting for database to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
    log "Database is unavailable - sleeping"
    sleep 2
done

log "Database is ready!"

# Run database migrations
log "Running database migrations..."
cd /app && python -m alembic upgrade head

# Run post-migration seeding
log "Running post-migration seeding..."
cd /app && python scripts/run_migrations.py

log "Starting FastAPI server..."
exec "$@"
