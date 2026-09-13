#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE=".dockpilot-local.pid"
API_PID_FILE=".dockpilot-api.pid"

stop_pid_file() {
  local file="$1"
  local name="$2"

  if [[ ! -f "$file" ]]; then
    return
  fi

  local pid="$(cat "$file" 2>/dev/null || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" 2>/dev/null || true
    echo "Stopped $name (PID $pid)."
  fi
  rm -f "$file"
}

stop_pid_file "$PID_FILE" "DockPilot local web server"
stop_pid_file "$API_PID_FILE" "DockPilot local API server"

# Also clean up any orphan listener on port 3001 if left behind
API_PORT_PID="$(lsof -tiTCP:3001 -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$API_PORT_PID" ]]; then
  kill "$API_PORT_PID" 2>/dev/null || true
  echo "Stopped local API process on port 3001 (PID $API_PORT_PID)."
fi

echo "All DockPilot local services stopped."
