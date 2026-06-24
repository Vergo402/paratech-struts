#!/usr/bin/env bash
# Headless proof-of-life for the FieldShore v4 app (src/, Vite + TS + React).
# No MCP, no browser, no new deps — just node + curl. Run from anywhere in the repo.
#
# Proves, in order: types compile · unit suite passes · the dev server actually
# boots and serves the app shell. Interactive driving (clicks, screenshots) is
# NOT this script's job — that's the preview MCP, documented in SKILL.md. This is
# the gate you can run in CI or on a fresh clone.
#
# ponytail: picks a free ephemeral port so it never collides with a dev server
# you (or Claude's preview MCP) already have on :5199. Upgrade path: none needed.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

step() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

[ -d node_modules ] || { step "npm install (node_modules missing)"; npm install; }

step "typecheck (tsc --noEmit)"
npm run typecheck

step "unit tests (vitest run)"
npm test

step "dev server serves the app shell"
PORT="$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{process.stdout.write(String(s.address().port));s.close()})')"
npm run dev -- --port "$PORT" >/tmp/fieldshore-dev.log 2>&1 &
DEV_PID=$!
# Kill the vite child AND the npm parent on any exit (npm doesn't always forward SIGTERM).
trap 'pkill -P "$DEV_PID" 2>/dev/null; kill "$DEV_PID" 2>/dev/null; true' EXIT

for _ in $(seq 1 40); do  # up to ~20s for Vite cold-start + dep optimize
  if curl -fsS "http://127.0.0.1:$PORT/" 2>/dev/null | grep -q '<title>FieldShore</title>'; then
    echo "OK — http://127.0.0.1:$PORT/ served <title>FieldShore</title> (HTTP 200)"
    echo
    echo "ALL GREEN ✅  (types · 1044 tests · dev server)"
    exit 0
  fi
  sleep 0.5
done

echo "FAIL — dev server never served the app shell on :$PORT within 20s" >&2
echo "--- last 20 lines of /tmp/fieldshore-dev.log ---" >&2
tail -20 /tmp/fieldshore-dev.log >&2
exit 1
