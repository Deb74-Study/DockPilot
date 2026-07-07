#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Error: neither 'docker compose' nor 'docker-compose' is available."
  exit 1
fi

if ! "${COMPOSE_CMD[@]}" ps dockpilot-db >/dev/null 2>&1; then
  echo "Starting dockpilot-db..."
  "${COMPOSE_CMD[@]}" up -d dockpilot-db
fi

DB_STATUS="$("${COMPOSE_CMD[@]}" ps --status running --services 2>/dev/null | grep -x 'dockpilot-db' || true)"
if [[ -z "$DB_STATUS" ]]; then
  echo "Starting dockpilot-db..."
  "${COMPOSE_CMD[@]}" up -d dockpilot-db
fi

if [[ $# -gt 0 ]]; then
  "${COMPOSE_CMD[@]}" exec -T dockpilot-db psql -U dockpilot -d dockpilot -c "$*"
else
  echo "Opening psql shell for dockpilot-db (dockpilot@dockpilot)..."
  "${COMPOSE_CMD[@]}" exec dockpilot-db psql -U dockpilot -d dockpilot
fi
