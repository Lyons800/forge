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
#   tests/                  — test suite (guards live here; see policy below)
#   src/lib/auth.ts         — auth library
#   drizzle/schema.ts       — control-plane auth tables
#
# Policy for tests/ paths (anti-reward-hacking):
#   Engine MAY add new test files (status A) — new coverage is always welcome.
#   Engine MUST NOT modify (M), delete (D), or rename (R) existing tests —
#   that would let it weaken or remove gates to prod.
#
# All other control-plane paths: any change (A/M/D/R) is blocked.
#
# Usage:
#   ./scripts/check-control-plane.sh --files "<newline-separated list>"
#     (for unit tests — pass bare file paths; every path is treated as a blocked change)
#
#   git diff --name-only origin/$BASE...HEAD | ./scripts/check-control-plane.sh --stdin
#     (legacy stdin mode — reads bare paths, same as --files)
#
#   git diff --name-status origin/$BASE...HEAD | bash scripts/check-control-plane.sh --name-status
#     (CI mode — reads STATUS<TAB>PATH lines; applies per-status policy)

set -euo pipefail

# Control-plane regexes — a path is controlled if it matches ANY of these
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

# tests/ is a special sub-pattern: additions are allowed, but M/D/R are blocked.
TESTS_PATTERN='^tests/'

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
    --name-status)
      MODE="name-status"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "Usage: $0 --files <newline-separated-list> | --stdin | --name-status" >&2
  exit 2
fi

# ─────────────────────────────────────────────────────────────────────────────
# --name-status mode: reads "STATUS<TAB>PATH" lines from stdin.
# git diff --name-status can emit:
#   A   path
#   M   path
#   D   path
#   R100\told-path\tnew-path   (rename)
# Policy:
#   tests/ + status A → allowed (new test file)
#   tests/ + status M/D/R → blocked (must not weaken/remove existing tests)
#   any other control-plane path + any status → blocked
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$MODE" == "name-status" ]]; then
  BLOCKED=0
  while IFS= read -r raw_line; do
    # Trim whitespace
    line="${raw_line#"${raw_line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue

    # Split on first tab to get STATUS and the rest
    status="${line%%	*}"
    rest="${line#*	}"

    # Normalise rename status: R100 → R
    status="${status:0:1}"

    # For renames git emits: R<score><TAB>old<TAB>new
    # After our first split: status=R*, rest="old<TAB>new"
    # We check BOTH old and new paths for renames, but per policy R is always
    # blocked for tests (removing the original) and always blocked for other
    # control-plane paths.
    if [[ "$status" == "R" ]]; then
      old_path="${rest%%	*}"
      new_path="${rest#*	}"
      paths=("$old_path" "$new_path")
    else
      paths=("$rest")
    fi

    for path in "${paths[@]}"; do
      # Strip leading ./
      path="${path#./}"

      # Check if path is under tests/
      if echo "$path" | grep -qE "$TESTS_PATTERN"; then
        # tests/ path: allow A, block M/D/R
        if [[ "$status" != "A" ]]; then
          echo "❌ CONTROL-PLANE EDIT BLOCKED: [$status] $path"
          BLOCKED=1
        fi
        # status A under tests/ → allowed, no action
      else
        # All other control-plane paths: block any status
        for pattern in "${CONTROL_PLANE_PATTERNS[@]}"; do
          if echo "$path" | grep -qE "$pattern"; then
            echo "❌ CONTROL-PLANE EDIT BLOCKED: [$status] $path"
            BLOCKED=1
            break
          fi
        done
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
    echo ".github/, src/lib/auth.ts, drizzle/schema.ts"
    echo "tests/ — modifications/deletions are blocked; additions (A) are allowed."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi

  echo "All changed files are in the app plane. Control-plane guard passed."
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# --files and --stdin modes: bare path lists, no status info.
# Every path is treated as a "change" — the original behavior.
# Used by existing unit tests which assert control-plane paths are blocked.
# ─────────────────────────────────────────────────────────────────────────────

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
