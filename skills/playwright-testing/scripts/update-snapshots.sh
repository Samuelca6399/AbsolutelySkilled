#!/usr/bin/env bash
# Safely update Playwright screenshot baselines with git diff summary.
# Usage: bash scripts/update-snapshots.sh [test-file-or-pattern]
#
# What it does:
#   1. Shows which snapshot files currently exist
#   2. Runs tests with --update-snapshots
#   3. Shows a git diff summary of changed snapshots
#   4. Lists new/deleted/modified snapshot files
#   5. Prompts before staging changes (unless --yes flag)

set -euo pipefail

AUTO_STAGE=false
TEST_PATTERN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --yes) AUTO_STAGE=true; shift ;;
    -h|--help)
      echo "Usage: update-snapshots.sh [test-file-or-pattern] [--yes]"
      echo ""
      echo "  --yes    Auto-stage changed snapshots without prompting"
      exit 0
      ;;
    *) TEST_PATTERN="$1"; shift ;;
  esac
done

# Count existing snapshots
SNAP_DIRS=$(find . -type d -name "*-snapshots" 2>/dev/null | head -20)
SNAP_COUNT=$(find . -name "*.png" -path "*-snapshots/*" 2>/dev/null | wc -l | tr -d ' ')
echo "==> Found $SNAP_COUNT existing snapshot files"

if [ -n "$SNAP_DIRS" ]; then
  echo "    Snapshot directories:"
  echo "$SNAP_DIRS" | while read -r dir; do
    count=$(find "$dir" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    echo "      $dir ($count files)"
  done
fi

echo ""
echo "==> Running tests with --update-snapshots..."

if [ -n "$TEST_PATTERN" ]; then
  npx playwright test "$TEST_PATTERN" --update-snapshots 2>&1 || true
else
  npx playwright test --update-snapshots 2>&1 || true
fi

echo ""
echo "==> Snapshot changes:"

# Show git status for snapshot files
CHANGED=$(git diff --name-only -- '*-snapshots/*.png' 2>/dev/null || true)
NEW=$(git ls-files --others --exclude-standard -- '*-snapshots/*.png' 2>/dev/null || true)
DELETED=$(git diff --name-only --diff-filter=D -- '*-snapshots/*.png' 2>/dev/null || true)

CHANGED_COUNT=$(echo "$CHANGED" | grep -c '.' 2>/dev/null || echo "0")
NEW_COUNT=$(echo "$NEW" | grep -c '.' 2>/dev/null || echo "0")
DELETED_COUNT=$(echo "$DELETED" | grep -c '.' 2>/dev/null || echo "0")

echo "    Modified: $CHANGED_COUNT"
echo "    New:      $NEW_COUNT"
echo "    Deleted:  $DELETED_COUNT"

if [ "$CHANGED_COUNT" = "0" ] && [ "$NEW_COUNT" = "0" ] && [ "$DELETED_COUNT" = "0" ]; then
  echo ""
  echo "    No snapshot changes detected."
  exit 0
fi

echo ""

if [ -n "$CHANGED" ]; then
  echo "  Modified snapshots:"
  echo "$CHANGED" | while read -r f; do
    if [ -n "$f" ]; then
      size=$(wc -c < "$f" 2>/dev/null | tr -d ' ')
      echo "    $f (${size}B)"
    fi
  done
fi

if [ -n "$NEW" ]; then
  echo "  New snapshots:"
  echo "$NEW" | while read -r f; do
    if [ -n "$f" ]; then
      echo "    $f"
    fi
  done
fi

echo ""

if $AUTO_STAGE; then
  git add -- '*-snapshots/*.png'
  echo "==> Staged all snapshot changes."
else
  echo "Review the changes above, then stage with:"
  echo "  git add -- '*-snapshots/*.png'"
fi
