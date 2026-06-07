#!/usr/bin/env bash
# check-migrations.sh — hard-block destructive schema migrations in CI
#
# CONTROL PLANE SCRIPT — do not weaken or remove patterns.
# This script is the enforcement mechanism for the Atlas migrate-lint gate.
# It runs in CI and BLOCKS any migration containing a destructive operation.
#
# Detected patterns (case-insensitive):
#   DROP TABLE, DROP COLUMN, DROP SCHEMA
#   ALTER TABLE ... RENAME COLUMN, ALTER TABLE ... RENAME TO
#
# AUTH TABLE PROTECTION:
#   The auth tables (user, session, account, verification) are core control-plane
#   tables managed by Better Auth (control/auth/auth.config.ts). Destructive
#   operations against these tables are ALWAYS blocked by the patterns above.
#   These tables must NEVER be added to any allowlist — they are forever protected.
#   No autonomous agent may DROP or RENAME them.
#
# Usage:
#   ./scripts/check-migrations.sh [--git-base <branch>] [--latest <n>] <migrations-dir>
#
# In CI for PRs:  --git-base <base_branch>   (only checks new files in the PR)
# In CI for push: --latest 1                 (checks the most recent N files)

set -euo pipefail

MIGRATIONS_DIR="drizzle/migrations"
MODE=""
GIT_BASE=""
LATEST_N=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --git-base)
      MODE="git"
      GIT_BASE="$2"
      shift 2
      ;;
    --latest)
      MODE="latest"
      LATEST_N="$2"
      shift 2
      ;;
    *)
      MIGRATIONS_DIR="$1"
      shift
      ;;
  esac
done

# Patterns that indicate a destructive operation.
# These are intentionally strict: false positives are acceptable, false negatives are not.
DESTRUCTIVE_PATTERNS=(
  'DROP[[:space:]]+TABLE'
  'DROP[[:space:]]+COLUMN'
  'DROP[[:space:]]+SCHEMA'
  'RENAME[[:space:]]+COLUMN'
  'RENAME[[:space:]]+TO'
  'ALTER[[:space:]]+TABLE[[:space:]]+[^;]+[[:space:]]+RENAME'
)

# Collect files to check
declare -a FILES_TO_CHECK=()

if [[ "$MODE" == "git" ]]; then
  echo "🔍 Checking migrations added vs origin/$GIT_BASE..."
  # Fetch base branch ref if not already present
  git fetch origin "$GIT_BASE" --depth=1 2>/dev/null || true
  while IFS= read -r f; do
    [[ "$f" == *.sql ]] && FILES_TO_CHECK+=("$f")
  done < <(git diff --name-only --diff-filter=A "origin/${GIT_BASE}...HEAD" -- "$MIGRATIONS_DIR/" 2>/dev/null || \
           git diff --name-only --diff-filter=A "origin/${GIT_BASE}" HEAD -- "$MIGRATIONS_DIR/" 2>/dev/null || \
           echo "")
elif [[ "$MODE" == "latest" ]]; then
  echo "🔍 Checking latest $LATEST_N migration file(s)..."
  while IFS= read -r f; do
    FILES_TO_CHECK+=("$f")
  done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" | sort | tail -"$LATEST_N")
else
  echo "Error: must specify --git-base <branch> or --latest <n>" >&2
  exit 1
fi

if [[ ${#FILES_TO_CHECK[@]} -eq 0 ]]; then
  echo "✅ No new SQL migration files to check."
  exit 0
fi

echo "Checking ${#FILES_TO_CHECK[@]} file(s): ${FILES_TO_CHECK[*]}"

FOUND_DESTRUCTIVE=0

for file in "${FILES_TO_CHECK[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "  Skipping (not found): $file"
    continue
  fi
  echo ""
  echo "Scanning: $file"
  for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
    # grep -nE: case-insensitive, line number, extended regex
    if grep -nEi "$pattern" "$file"; then
      echo "  ❌ DESTRUCTIVE PATTERN DETECTED: $pattern"
      FOUND_DESTRUCTIVE=1
    fi
  done
done

echo ""
if [[ $FOUND_DESTRUCTIVE -ne 0 ]]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "BLOCKED: Destructive schema migration detected."
  echo ""
  echo "The migration contains an operation that would permanently destroy data."
  echo "This build is intentionally hard-blocked to prevent data loss."
  echo ""
  echo "If this change is genuinely necessary:"
  echo "  1. Ensure data has been migrated or is intentionally discarded"
  echo "  2. Get explicit human approval (not agent approval)"
  echo "  3. Remove or rename the migration file to bypass this check ONLY"
  echo "     after the above steps are complete and reviewed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo "✅ No destructive changes detected."
exit 0
