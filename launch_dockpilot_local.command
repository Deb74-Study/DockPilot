#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LANDING_PAGE="fpadevDockPilot.html"
LOG_FILE=".dockpilot-local.log"
PID_FILE=".dockpilot-local.pid"
API_LOG_FILE=".dockpilot-api.log"
API_PID_FILE=".dockpilot-api.pid"
DEFAULT_PORT="5500"
API_PORT="3001"

if [[ ! -f "$LANDING_PAGE" ]]; then
  echo "Landing page not found: $LANDING_PAGE"
  exit 1
fi

# 1. Start Docker PostgreSQL container if Docker is running and container is stopped
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    DB_STATUS="$(docker ps --filter "name=dockpilot-db" --format "{{.Status}}" 2>/dev/null || true)"
    if [[ -z "$DB_STATUS" ]]; then
      echo "Starting local PostgreSQL container (dockpilot-db)..."
      if docker ps -a --filter "name=dockpilot-db" --format "{{.Names}}" | grep -qx "dockpilot-db"; then
        docker start dockpilot-db >/dev/null 2>&1 || true
      elif docker compose version >/dev/null 2>&1; then
        docker compose up -d dockpilot-db >/dev/null 2>&1 || true
      fi
    fi
  fi
fi

# 2. Start Node.js API server on port 3001 if not already running
if ! lsof -iTCP:"$API_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Starting local PostgreSQL API server on port $API_PORT..."
  (
    cd "$SCRIPT_DIR/server"
    PORT="$API_PORT" node server.js >"$SCRIPT_DIR/$API_LOG_FILE" 2>&1 &
    echo $! > "$SCRIPT_DIR/$API_PID_FILE"
  )
else
  echo "Local API server is already running on port $API_PORT."
fi

# 3. Start local Python web server
pick_port() {
  local port="$1"
  while lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

PORT="$(pick_port "$DEFAULT_PORT")"

if [[ "$PORT" == "$DEFAULT_PORT" ]]; then
  echo "Starting local web server on port $PORT..."
else
  echo "Port $DEFAULT_PORT is in use. Starting local web server on port $PORT..."
fi

python3 -m http.server "$PORT" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

URL="http://127.0.0.1:${PORT}/${LANDING_PAGE}"
echo "Opening: $URL"
open "$URL"

echo ""
echo "DockPilot local launcher is active."
echo "- Web Server PID: $SERVER_PID (Port $PORT)"
echo "- API Server: http://localhost:$API_PORT"
echo "- Log files: $SCRIPT_DIR/$LOG_FILE, $SCRIPT_DIR/$API_LOG_FILE"
echo "- Stop command: ./stop_dockpilot_local.command"
