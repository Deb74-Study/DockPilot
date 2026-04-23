#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: ./scripts/build_bundle.sh <client|dev>"
  exit 1
fi

TARGET="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$ROOT_DIR/scripts/manifests/${TARGET}.txt"
OUT_DIR="$ROOT_DIR/dist/${TARGET}"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest not found: $MANIFEST"
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

while IFS= read -r relpath || [[ -n "$relpath" ]]; do
  relpath="${relpath%%#*}"
  relpath="${relpath## }"
  relpath="${relpath%% }"
  [[ -z "$relpath" ]] && continue

  src="$ROOT_DIR/$relpath"
  dst="$OUT_DIR/$relpath"

  if [[ ! -e "$src" ]]; then
    echo "Missing manifest entry: $relpath"
    exit 1
  fi

  if [[ -d "$src" ]]; then
    mkdir -p "$dst"
    cp -R "$src"/. "$dst"/
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
done < "$MANIFEST"

echo "Built $TARGET bundle at: $OUT_DIR"
