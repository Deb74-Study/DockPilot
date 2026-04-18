#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LANDING_PAGE="DockPilot_landing.html"
LOG_FILE=".dockpilot-local.log"
PID_FILE=".dockpilot-local.pid"
DEFAULT_PORT="5500"

if [[ ! -f "$LANDING_PAGE" ]]; then
  echo "Landing page not found: $LANDING_PAGE"
  exit 1
fi

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
echo "- Server PID: $SERVER_PID"
echo "- Log file: $SCRIPT_DIR/$LOG_FILE"
echo "- Stop command: ./stop_dockpilot_local.command"
