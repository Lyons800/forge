#!/usr/bin/env bash
# check-control-plane.sh — hard-block agent edits to control-plane paths in CI
#
# CONTROL PLANE SCRIPT — do not weaken or remove patterns.
# This script is the enforcement mechanism for the control-plane guard.
# It runs in CI on claude/* branches and BLOCKS any PR that touches a control-plane path.
# The script protects ITSELF so the agent cannot weaken its own gate.
#
# Control-plane paths (blocked if ANY file matches):
#   CONSTITUTION.md         — agent rulebook
#   control/                — auth config, policies
#   atlas.hcl               — database schema migration config
#   scripts/check-migrations.sh  — migration guard
#   scripts/check-control-plane.sh — this script (self-protecting)
#   .github/                — CI workflows
#   tests/                  — test suite (guards live here)
#   src/lib/auth.ts         — auth library
#
# Usage:
#   ./scripts/check-control-plane.sh --files "<newline-separated list>"
#     (for unit tests — pass file list directly)
#
#   git diff --name-only origin/$BASE...HEAD | ./scripts/check-control-plane.sh --stdin
#     (for CI — reads file list from stdin)

set -euo pipefail

# Control-plane regexes — a path is blocked if it matches ANY of these
CONTROL_PLANE_PATTERNS=(
  '^CONSTITUTION\.md$'
  '^control/'
  '^atlas\.hcl$'
  '^scripts/check-migrations\.sh$'
  '^scripts/check-control-plane\.sh$'
  '^\.github/'
  '^tests/'
  '^src/lib/auth\.ts$'
  # drizzle/schema.ts contains the control-plane auth tables (user, session, account,
  # verification). Blocking all edits to this file ensures no agent can alter auth
  # table structure. Tradeoff (v1): agents may not add app-plane tables directly to
  # schema.ts; instead propose schema changes for human review.
  '^drizzle/schema\.ts$'
)

MODE=""
FILES_INPUT=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --files)
      MODE="files"
      FILES_INPUT="$2"
      shift 2
      ;;
    --stdin)
      MODE="stdin"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "Usage: $0 --files <newline-separated-list> | --stdin" >&2
  exit 2
fi

# Collect files into an array
declare -a FILES=()

if [[ "$MODE" == "files" ]]; then
  while IFS= read -r line; do
    # Trim surrounding whitespace
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    # Strip a leading "./" prefix so "./CONSTITUTION.md" matches "CONSTITUTION.md"
    line="${line#./}"
    [[ -n "$line" ]] && FILES+=("$line")
  done <<< "$FILES_INPUT"
elif [[ "$MODE" == "stdin" ]]; then
  while IFS= read -r line; do
    # Trim surrounding whitespace
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    # Strip a leading "./" prefix so "./CONSTITUTION.md" matches "CONSTITUTION.md"
    line="${line#./}"
    [[ -n "$line" ]] && FILES+=("$line")
  done
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No files to check."
  exit 0
fi

BLOCKED=0

for f in "${FILES[@]}"; do
  for pattern in "${CONTROL_PLANE_PATTERNS[@]}"; do
    if echo "$f" | grep -qE "$pattern"; then
      echo "❌ CONTROL-PLANE EDIT BLOCKED: $f"
      BLOCKED=1
      break
    fi
  done
done

echo ""
if [[ $BLOCKED -ne 0 ]]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "BLOCKED: This PR modifies one or more control-plane paths."
  echo ""
  echo "Control-plane paths are off-limits to autonomous agents (claude/* branches)."
  echo "Changes to these paths require human review and must be made from a"
  echo "non-claude branch with CODEOWNERS approval."
  echo ""
  echo "Blocked paths include: CONSTITUTION.md, control/, atlas.hcl,"
  echo "scripts/check-migrations.sh, scripts/check-control-plane.sh,"
  echo ".github/, tests/, src/lib/auth.ts"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo "All changed files are in the app plane. Control-plane guard passed."
exit 0
