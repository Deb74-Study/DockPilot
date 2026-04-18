#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE=".dockpilot-local.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found. If a server is running, stop it manually."
  exit 0
fi

PID="$(cat "$PID_FILE")"

if [[ -z "$PID" ]]; then
  echo "PID file is empty. Removing stale file."
  rm -f "$PID_FILE"
  exit 0
fi

if kill -0 "$PID" >/dev/null 2>&1; then
  kill "$PID"
  echo "Stopped DockPilot local server (PID $PID)."
else
  echo "Process $PID is not running. Cleaning stale PID file."
fi

rm -f "$PID_FILE"
