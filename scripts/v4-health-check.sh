#!/usr/bin/env bash
# v4 health check — full pre-push diagnostic sweep
# Runs: typecheck / lint / prisma / build / dev-server route smoke / live-prod smoke
#
# Usage:
#   bash scripts/v4-health-check.sh
#
# Full output → v4-health-check.log
# Paste-friendly digest → stdout

set -uo pipefail

LOG="v4-health-check.log"
: > "$LOG"

# ── helpers ─────────────────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0
RESULTS=()
FAIL_DETAILS=()

LIVE_URL="${LIVE_URL:-https://martinezfitness559.com}"
DEV_URL="${DEV_URL:-http://localhost:3000}"
DEV_PORT="${DEV_PORT:-3000}"

color() { printf "\033[%sm%s\033[0m" "$1" "$2"; }
green()  { color 32 "$1"; }
red()    { color 31 "$1"; }
yellow() { color 33 "$1"; }
gray()   { color 90 "$1"; }

record() {
  local name="$1" status="$2" detail="${3:-}"
  RESULTS+=("$(printf "%-10s │ %s" "$status" "$name")")
  if [ "$status" = "FAIL" ]; then
    FAIL=$((FAIL+1))
    FAIL_DETAILS+=("▶ $name")
    [ -n "$detail" ] && FAIL_DETAILS+=("    $detail")
  elif [ "$status" = "PASS" ]; then
    PASS=$((PASS+1))
  else
    SKIP=$((SKIP+1))
  fi
}

log_run() {
  local name="$1"; shift
  echo "" >> "$LOG"
  echo "────────────────────────────────────────" >> "$LOG"
  echo "▸ $name" >> "$LOG"
  echo "  $ $*" >> "$LOG"
  echo "────────────────────────────────────────" >> "$LOG"
  "$@" >> "$LOG" 2>&1
}

# curl wrapper: prints HTTP status + size, expects 2xx or 3xx or specific expected codes
check_url() {
  local name="$1" url="$2" expected_regex="${3:-^(2|3)[0-9][0-9]$}" headers="${4:-}"
  local result
  if [ -n "$headers" ]; then
    result=$(curl -sS -o /dev/null -w '%{http_code}|%{size_download}|%{time_total}' -L --max-redirs 3 --max-time 15 -H "$headers" "$url" 2>/dev/null)
  else
    result=$(curl -sS -o /dev/null -w '%{http_code}|%{size_download}|%{time_total}' -L --max-redirs 3 --max-time 15 "$url" 2>/dev/null)
  fi
  local code size time
  IFS='|' read -r code size time <<< "$result"
  echo "  $name  →  HTTP $code  ($size bytes, ${time}s)" >> "$LOG"
  if [[ "$code" =~ $expected_regex ]]; then
    record "$name" "PASS" "HTTP $code"
  else
    record "$name" "FAIL" "HTTP $code (expected match $expected_regex)"
  fi
}

header() {
  echo "" | tee -a "$LOG"
  echo "════════════════════════════════════════════════════════════════" | tee -a "$LOG"
  echo "  $1" | tee -a "$LOG"
  echo "════════════════════════════════════════════════════════════════" | tee -a "$LOG"
}

# ── PHASE 0: Environment ───────────────────────────────────────────
header "0 · ENVIRONMENT"
{
  echo "node:        $(node --version 2>&1)"
  echo "npm:         $(npm --version 2>&1)"
  echo "git branch:  $(git rev-parse --abbrev-ref HEAD 2>&1)"
  echo "git commit:  $(git rev-parse --short HEAD 2>&1)"
  echo "pwd:         $(pwd)"
  echo ""
  echo "package.json deps of interest:"
  node -e "const p=require('./package.json');for(const k of ['next','react','prisma','@prisma/client','next-auth','next-themes','resend','stripe','lucide-react']){const v=(p.dependencies?.[k]||p.devDependencies?.[k]||'-');console.log('  '+k.padEnd(24)+' '+v)}"
} | tee -a "$LOG"

# ── PHASE 1: Prisma ────────────────────────────────────────────────
header "1 · PRISMA · schema + migrations + client"

log_run "prisma validate" npx prisma validate
if [ $? -eq 0 ]; then record "prisma validate" "PASS"; else record "prisma validate" "FAIL" "see log"; fi

log_run "prisma generate" npx prisma generate
if [ $? -eq 0 ]; then record "prisma generate" "PASS"; else record "prisma generate" "FAIL" "see log"; fi

log_run "prisma migrate status" npx prisma migrate status
STATUS_EXIT=$?
if [ $STATUS_EXIT -eq 0 ]; then record "migrate status (in sync)" "PASS"; else record "migrate status (in sync)" "FAIL" "exit $STATUS_EXIT — pending migrations?"; fi

# Quick DB connectivity + phase-8 table check
# NOTE: script lives inside the project so tsx can resolve @prisma/client from node_modules
cat > .v4hc-db-check.ts << 'TSEOF'
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const counts = {
    users: await p.user.count(),
    workouts: await p.workout.count(),
    foodEntries: await p.foodEntry.count(),
    messages: await p.message.count(),
  };
  let phase8: Record<string, number> = {};
  try {
    phase8 = {
      featureFlags: await p.featureFlag.count(),
      programs: await p.program.count(),
      coachNotes: await p.coachNote.count(),
      subscriptions: await p.subscription.count(),
    };
  } catch (e) {
    console.log('PHASE8_MIGRATION_MISSING:', (e as Error).message);
  }
  console.log('COUNTS', JSON.stringify({ ...counts, ...phase8 }));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(2); }).finally(() => p.$disconnect());
TSEOF

log_run "db connectivity + table counts" npx tsx .v4hc-db-check.ts
DB_EXIT=$?
if [ $DB_EXIT -eq 0 ]; then record "db connectivity (Railway)" "PASS"; else record "db connectivity (Railway)" "FAIL" "exit $DB_EXIT"; fi
rm -f .v4hc-db-check.ts

# ── PHASE 2: Types + Lint ──────────────────────────────────────────
header "2 · TYPES + LINT"

log_run "tsc --noEmit" npx tsc --noEmit
if [ $? -eq 0 ]; then record "typescript (tsc --noEmit)" "PASS"; else record "typescript (tsc --noEmit)" "FAIL" "see log"; fi

if npm run --silent lint --if-present >> "$LOG" 2>&1; then
  record "eslint" "PASS"
elif [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
  record "eslint" "FAIL" "see log"
else
  record "eslint" "SKIP" "no lint script"
fi

# ── PHASE 3: Build ─────────────────────────────────────────────────
header "3 · BUILD"

log_run "next build" npm run build
BUILD_EXIT=$?
if [ $BUILD_EXIT -eq 0 ]; then record "next build (production)" "PASS"; else record "next build (production)" "FAIL" "exit $BUILD_EXIT"; fi

# ── PHASE 4: Local dev server smoke ────────────────────────────────
header "4 · LOCAL DEV SERVER · route smoke"

# Kill any previous dev server on the port
if lsof -i ":$DEV_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $DEV_PORT already in use — killing existing listener" | tee -a "$LOG"
  lsof -i ":$DEV_PORT" -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "Starting dev server in background (logs → $LOG)…" | tee -a "$LOG"
( npm run dev >> "$LOG" 2>&1 ) &
DEV_PID=$!

# Wait for it to be ready
READY=0
for i in $(seq 1 40); do
  if curl -sS -o /dev/null --max-time 1 "$DEV_URL" 2>/dev/null; then
    READY=1
    break
  fi
  sleep 1.5
done

if [ $READY -eq 1 ]; then
  record "dev server startup" "PASS"

  # Public routes: expect 200
  check_url "GET /"                       "$DEV_URL/"                      '^200$'
  check_url "GET /auth/signin"            "$DEV_URL/auth/signin"           '^200$'
  check_url "GET /auth/signup"            "$DEV_URL/auth/signup"           '^200$'
  check_url "GET /design"                 "$DEV_URL/design"                '^200$'
  check_url "GET /contact"                "$DEV_URL/contact"               '^200$'
  check_url "GET /programs"               "$DEV_URL/programs"              '^200$'
  check_url "GET /shop"                   "$DEV_URL/shop"                  '^200$'

  # Protected routes: expect redirect to /auth/signin (so after -L follows, we still land on /auth/signin → 200)
  check_url "GET /client (unauth → signin)"  "$DEV_URL/client"            '^200$'
  check_url "GET /trainer (unauth → signin)" "$DEV_URL/trainer"           '^200$'
  check_url "GET /admin (unauth → signin)"   "$DEV_URL/admin"             '^200$'
  check_url "GET /trainer/builder (unauth)"  "$DEV_URL/trainer/builder"   '^200$'

  # Legacy routes still reachable
  check_url "GET /client/dashboard (legacy)" "$DEV_URL/client/dashboard"  '^200$'
  check_url "GET /trainer/dashboard (legacy)" "$DEV_URL/trainer/dashboard" '^200$'
  check_url "GET /admin/legacy (relocated)"   "$DEV_URL/admin/legacy"     '^200$'

  # APIs: unauthenticated expect 401 (success means auth is guarding correctly)
  check_url "POST /api/messages (expect 401)"      "$DEV_URL/api/messages"      '^401$'
  check_url "GET /api/coach-notes (expect 401)"    "$DEV_URL/api/coach-notes"   '^40[01]$'
  check_url "GET /api/feature-flags (expect 401)"  "$DEV_URL/api/feature-flags" '^40[13]$'
  check_url "GET /api/programs (expect 401)"       "$DEV_URL/api/programs"      '^401$'
  check_url "GET /api/food-search?q=chicken (401)" "$DEV_URL/api/food-search?q=chicken" '^401$'
  check_url "GET /api/health"                       "$DEV_URL/api/health"       '^(2|3)[0-9][0-9]$'

  # 404 handling
  check_url "GET /this-does-not-exist (expect 404)" "$DEV_URL/this-does-not-exist" '^404$'
else
  record "dev server startup" "FAIL" "didn't respond after 60s"
fi

# Shut down dev server
if kill -0 "$DEV_PID" 2>/dev/null; then
  kill "$DEV_PID" 2>/dev/null || true
  sleep 1
  kill -9 "$DEV_PID" 2>/dev/null || true
fi
# Also kill anything left on the port
if lsof -i ":$DEV_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  lsof -i ":$DEV_PORT" -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
fi

# ── PHASE 5: Live production smoke ─────────────────────────────────
header "5 · LIVE PRODUCTION · $LIVE_URL"

check_url "prod /"               "$LIVE_URL/"              '^200$'
check_url "prod /auth/signin"    "$LIVE_URL/auth/signin"   '^200$'
check_url "prod /auth/signup"    "$LIVE_URL/auth/signup"   '^200$'
check_url "prod /contact"        "$LIVE_URL/contact"       '^200$'
check_url "prod /shop"           "$LIVE_URL/shop"          '^200$'
check_url "prod /api/health"     "$LIVE_URL/api/health"    '^(2|3)[0-9][0-9]$'

# ── Summary ────────────────────────────────────────────────────────
header "SUMMARY"

{
  echo ""
  echo "  PASS: $PASS"
  echo "  FAIL: $FAIL"
  echo "  SKIP: $SKIP"
  echo ""
  echo "─── results ───────────────────────────────────────────────────"
  for r in "${RESULTS[@]}"; do echo "  $r"; done
  if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "─── failures detail ───────────────────────────────────────────"
    for d in "${FAIL_DETAILS[@]}"; do echo "  $d"; done
    echo ""
    echo "Full log: $LOG  (tail with: tail -200 $LOG)"
  fi
} | tee -a "$LOG"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
