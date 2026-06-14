#!/usr/bin/env bash
# ─── Export EarthMind X local DB → Neon PostgreSQL ───────────────────────────
# Usage:
#   ./scripts/export-to-neon.sh "postgresql://user:pass@host.neon.tech/earthmind_x?sslmode=require"
#
# Prerequisites: pg_dump and psql installed (brew install libpq)

set -euo pipefail

LOCAL_DB="postgresql://earthmind:earthmind_dev@localhost:5432/earthmind_x"
NEON_DB="${1:-}"
DUMP_FILE="/tmp/earthmind_x_$(date +%Y%m%d_%H%M%S).sql"

if [[ -z "$NEON_DB" ]]; then
  echo "Usage: $0 <neon-connection-string>"
  echo "Example: $0 'postgresql://user:pass@ep-abc123.us-east-2.aws.neon.tech/earthmind_x?sslmode=require'"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EarthMind X → Neon Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "1/3 Dumping local database..."
pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  "$LOCAL_DB" > "$DUMP_FILE"

echo "    Dump size: $(wc -c < "$DUMP_FILE" | numfmt --to=iec)"
echo "    Saved to: $DUMP_FILE"

echo ""
echo "2/3 Importing to Neon..."
psql "$NEON_DB" < "$DUMP_FILE"

echo ""
echo "3/3 Verifying row counts..."
psql "$NEON_DB" -c "
SELECT
  (SELECT COUNT(*) FROM cities)           AS cities,
  (SELECT COUNT(*) FROM fire_detections)  AS fire_detections,
  (SELECT COUNT(*) FROM flood_predictions) AS flood_predictions,
  (SELECT COUNT(*) FROM earth_risk)       AS earth_risk;"

echo ""
echo "✅ Migration complete. Update DATABASE_URL in your Render and .env files."
echo "   Cleanup: rm $DUMP_FILE"
