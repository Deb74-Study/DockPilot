#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit first, then publish."
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "Current branch is '$CURRENT_BRANCH'. Switch to 'main' to publish Pages."
  exit 1
fi

echo "Pushing main to origin to trigger client-only Pages deployment..."
git push origin main
echo "Publish trigger sent. GitHub Actions will build and deploy dist/client."

if [[ -x "./open_latest_pages_run.command" ]]; then
  ./open_latest_pages_run.command || true
else
  echo "Tip: add ./open_latest_pages_run.command to open the run URL automatically."
fi
