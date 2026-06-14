#!/usr/bin/env bash
# ─── EarthMind X — Start Everything ─────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")"

echo ""
echo "  ███████╗ █████╗ ██████╗ ████████╗██╗  ██╗███╗   ███╗██╗███╗   ██╗██████╗      ██╗  ██╗"
echo "  ██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██║  ██║████╗ ████║██║████╗  ██║██╔══██╗     ╚██╗██╔╝"
echo "  █████╗  ███████║██████╔╝   ██║   ███████║██╔████╔██║██║██╔██╗ ██║██║  ██║      ╚███╔╝ "
echo "  ██╔══╝  ██╔══██║██╔══██╗   ██║   ██╔══██║██║╚██╔╝██║██║██║╚██╗██║██║  ██║      ██╔██╗ "
echo "  ███████╗██║  ██║██║  ██║   ██║   ██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██████╔╝     ██╔╝ ██╗"
echo "  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝      ╚═╝  ╚═╝"
echo ""
echo "  Digital Twin Earth — AI-Powered Disaster Intelligence Platform"
echo "────────────────────────────────────────────────────────────────────────"

# Check ANTHROPIC_API_KEY
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo ""
  echo "  ⚠️  ANTHROPIC_API_KEY not set — EarthGPT will be unavailable."
  echo "     Set it before starting:  export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
fi

# ── Ensure the existing local postgres container is running ───────────────────
echo "  → Checking database container (earthmind-postgres)..."
if docker inspect earthmind-postgres > /dev/null 2>&1; then
  STATUS=$(docker inspect -f '{{.State.Status}}' earthmind-postgres)
  if [[ "$STATUS" != "running" ]]; then
    echo "    Starting existing earthmind-postgres container..."
    docker start earthmind-postgres
    # Wait a moment for postgres to be ready
    sleep 3
  else
    echo "    earthmind-postgres is already running."
  fi
else
  echo ""
  echo "  ✘  No earthmind-postgres container found."
  echo "     Start your local postgres container first, then re-run ./start.sh"
  echo "     e.g.:  docker run -d --name earthmind-postgres \\"
  echo "              -e POSTGRES_USER=earthmind \\"
  echo "              -e POSTGRES_PASSWORD=earthmind_dev \\"
  echo "              -e POSTGRES_DB=earthmind_x \\"
  echo "              -p 5432:5432 postgres:16-alpine"
  echo ""
  exit 1
fi

echo ""
echo "  → Building and starting all services..."
echo "    (first build takes 3–5 min; subsequent starts take ~10s)"
echo ""

# Export key for docker-compose
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-your-key-here}"

docker compose up --build -d

echo ""
echo "  Waiting for services to be healthy..."
sleep 5

# Wait for frontend to be available
for i in {1..30}; do
  if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo "────────────────────────────────────────────────────────────────────────"
echo "  ✅  EarthMind X is running"
echo ""
echo "  Frontend   →  http://localhost:5173"
echo "  Backend    →  http://localhost:3001/health"
echo "  AI Service →  http://localhost:8000/health"
echo "  Database   →  localhost:5432 (earthmind_x)"
echo ""
echo "  Stop:  docker compose down"
echo "  Logs:  docker compose logs -f"
echo "────────────────────────────────────────────────────────────────────────"
echo ""
