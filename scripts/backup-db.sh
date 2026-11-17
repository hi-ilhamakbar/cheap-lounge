#!/usr/bin/env bash
# Daily logical backup of the PostgreSQL database.
# Usage: DIRECT_URL=postgresql://... ./scripts/backup-db.sh [backup-dir]
# Schedule with cron (e.g. 0 2 * * *) on a trusted machine, and copy the output to off-site
# storage (S3 / GCS / Backblaze). Managed hosts (Neon, Supabase, RDS) also provide
# point-in-time recovery — enable it in addition to this script.
set -euo pipefail
: "${DIRECT_URL:?DIRECT_URL must be set}"
DIR="${1:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
mkdir -p "$DIR"
FILE="$DIR/cheap-lounge-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --no-owner --dbname="$DIRECT_URL" --file="$FILE"
echo "Backup written: $FILE"
find "$DIR" -name 'cheap-lounge-*.dump' -mtime +"$KEEP_DAYS" -delete
# Restore: pg_restore --clean --no-owner --dbname="$DIRECT_URL" "$FILE"
