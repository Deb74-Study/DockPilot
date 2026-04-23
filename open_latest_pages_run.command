#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

REMOTE_URL="$(git remote get-url origin)"
REPO_PATH="$(echo "$REMOTE_URL" | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#\.git$##')"

if [[ "$REPO_PATH" != */* ]]; then
  echo "Could not parse GitHub repo from origin URL: $REMOTE_URL"
  exit 1
fi

OWNER="${REPO_PATH%%/*}"
REPO="${REPO_PATH#*/}"
SHA="$(git rev-parse HEAD)"
API_URL="https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?branch=main&event=push&per_page=20"
ACTIONS_URL="https://github.com/${OWNER}/${REPO}/actions"

JSON="$(curl -fsSL "$API_URL" 2>/dev/null || true)"

if [[ -z "$JSON" ]]; then
  echo "Could not fetch latest runs from GitHub API. Opening Actions page instead."
  open "$ACTIONS_URL"
  exit 0
fi

RUN_URL="$(node -e "const payload=process.argv[1]||'{}'; const sha=process.argv[2]||''; let data={}; try{data=JSON.parse(payload);}catch{} const runs=Array.isArray(data.workflow_runs)?data.workflow_runs:[]; const isPages=(r)=>String(r.path||'').endsWith('/deploy-pages.yml'); const pick=runs.find(r=>r.head_sha===sha&&isPages(r))||runs.find(r=>r.head_sha===sha)||runs.find(r=>isPages(r))||runs[0]; if(pick&&pick.html_url) process.stdout.write(pick.html_url);" "$JSON" "$SHA")"

if [[ -n "$RUN_URL" ]]; then
  echo "Opening latest run: $RUN_URL"
  open "$RUN_URL"
else
  echo "No matching run found yet. Opening Actions page: $ACTIONS_URL"
  open "$ACTIONS_URL"
fi
