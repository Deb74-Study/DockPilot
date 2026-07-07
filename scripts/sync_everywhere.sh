#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_REF_FILE="$ROOT_DIR/supabase/.temp/project-ref"

RUN_BUILD=1
RUN_SUPABASE=1
RUN_GITHUB=1

usage() {
  cat <<'EOF'
Usage: ./scripts/sync_everywhere.sh [options]

Syncs DockPilot across the local build output, Supabase, GitHub, and GitHub Pages.

Options:
  --skip-build       Skip dist/client and dist/dev bundle builds.
  --skip-supabase    Skip remote Supabase migrations and function deploys.
  --skip-github      Skip git push / GitHub Pages trigger.
  --help             Show this help text.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      RUN_BUILD=0
      ;;
    --skip-supabase)
      RUN_SUPABASE=0
      ;;
    --skip-github)
      RUN_GITHUB=0
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

cd "$ROOT_DIR"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

note() {
  printf '\n==> %s\n' "$1"
}

note "DockPilot sync starting from $ROOT_DIR"

require_command git
require_command bash

if [[ "$RUN_BUILD" -eq 1 ]]; then
  note "Building client and dev bundles"
  bash ./scripts/build_bundle.sh client
  bash ./scripts/build_bundle.sh dev
fi

if [[ "$RUN_SUPABASE" -eq 1 ]]; then
  note "Pushing Supabase migrations and edge functions"
  require_command supabase

  if [[ ! -f "$PROJECT_REF_FILE" ]]; then
    echo "Supabase project ref not found at $PROJECT_REF_FILE" >&2
    exit 1
  fi

  PROJECT_REF="$(tr -d '[:space:]' < "$PROJECT_REF_FILE")"
  if [[ -z "$PROJECT_REF" ]]; then
    echo "Supabase project ref is empty." >&2
    exit 1
  fi

  supabase db push --linked --yes

  while IFS= read -r function_dir; do
    function_name="$(basename "$function_dir")"
    echo "Deploying Supabase function: $function_name"
    supabase functions deploy "$function_name" --project-ref "$PROJECT_REF" --use-api
  done < <(find "$ROOT_DIR/supabase/functions" -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | sort)
fi

if [[ "$RUN_GITHUB" -eq 1 ]]; then
  note "Pushing main to origin for GitHub + GitHub Pages"

  BRANCH_NAME="$(git branch --show-current)"
  if [[ -z "$(git remote get-url origin 2>/dev/null || true)" ]]; then
    echo "No git remote named origin is configured; skipping GitHub push." >&2
  elif [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree is not clean; skipping GitHub push so you can commit intentionally." >&2
  elif [[ "$BRANCH_NAME" != "main" ]]; then
    echo "Current branch is '$BRANCH_NAME'; skipping GitHub push because Pages deploys from main." >&2
  else
    git push origin main

    if [[ -x ./open_latest_pages_run.command ]]; then
      ./open_latest_pages_run.command || true
    fi
  fi
fi

note "DockPilot sync complete"