---
name: run-fieldshore
description: "Build, launch, test, and drive the FieldShore v4 app — the Vite/TS/React PWA under src/ on the v4-redesign branch. Use whenever someone says 'run fieldshore', 'start the v4 app', 'launch the dev server', 'screenshot the app', 'drive the UI', 'verify my change in the browser', or 'does it still build/test'. Headless gate = .claude/skills/run-fieldshore/smoke.sh; interactive driving = the preview MCP. v4-redesign branch only."
---

# Run FieldShore (v4 app)

FieldShore is a **dual-app repo**. This skill drives **v4** — the Vite 6 + TypeScript + React 18 PWA rooted at `src/app/` (the active work on `v4-redesign`, not yet deployed). The legacy **v3** app (root `index.html` / `app.js`, ships to GitHub Pages) is just static files — serve it with `npx serve -l 8095 .` and stop reading; it's not what this skill is for.

Two verified ways to drive v4:
- **Headless gate** (CI / fresh clone / no browser): `.claude/skills/run-fieldshore/smoke.sh` — typecheck + 376 unit tests + proves the dev server serves the app shell.
- **Interactive** (clicks, screenshots, real UI): the **preview MCP**, via the launch configs in `.claude/launch.json`.

All paths are relative to the repo root. Verified on Node **v26** / npm **11.12**, macOS.

## Prerequisites
Node ≥ 18 and npm — nothing else. No system packages, no browser binary needed for the headless gate. If `node_modules` is absent, `npm install` (the smoke script auto-installs when missing).

## Headless gate — start here

```bash
bash .claude/skills/run-fieldshore/smoke.sh
```
Runs from anywhere in the repo (it `cd`s to the git root). Self-assigns a **free port**, so it never collides with a dev server already on :5199. Ends in `ALL GREEN ✅` (~11s); on failure it prints the tail of `/tmp/fieldshore-dev.log`. The three gated commands, individually runnable:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest run — 45 files, 376 tests (~7s)
npm run build       # tsc --noEmit && vite build → dist/ + PWA service worker (~1s)
```

## Interactive driving — preview MCP (clicks + screenshots)

`preview_start` reads `.claude/launch.json`. The dev server pins **:5199** (`strictPort`): if it's free, start `fieldshore-v4-dev`; if :5199 is already taken, start **`fieldshore-v4-verify`** (autoPort — boots a throwaway instance on a free port). Then drive the returned `serverId`:

- `preview_snapshot` → accessibility tree (best for verifying text/structure).
- `preview_screenshot` → visual JPEG.
- `preview_console_logs level=error` → runtime errors.
- **Switch tabs with `preview_eval` running `location.assign('/operations')`, NOT a click** — the nav is a TanStack Router `<Link>` the MCP's click can't drive. Routes: `/quickfind /operations /inventory /command /settings`.

In this vertical slice only **Operations** is the real screen (boots with a seeded demo op); the other four tabs render a "not built yet — Phase I" placeholder. Data is **seeded IndexedDB** (Dexie) — no backend or login (data/sync is a local stub in this slice).

## Run (human path)
```bash
npm run dev    # Vite on http://localhost:5199 ; host:true → http://<mac>.local:5199 from a phone on the same Wi-Fi
```
Ctrl-C to stop. Useless headless — for automated checks use the gate or the preview MCP above.

## Gotchas (battle scars from authoring this)
- **`Port 5199 is in use` from `preview_start fieldshore-v4-dev`** — the config pins :5199. Free it, or start **`fieldshore-v4-verify`** (autoPort). `smoke.sh` sidesteps this by self-assigning a free port.
- **Console floods with `[vite] failed to connect to websocket`** — benign. That's HMR's websocket failing to tunnel through the preview proxy, not an app bug; the UI renders fine. Ignore it when reading `preview_console_logs`.
- **Tab nav ignores `preview_click`** — TanStack `<Link>`. Use `location.assign(path)` via `preview_eval`. (Buttons inside a screen click normally.)
- **Installed an npm dep and the dev server doesn't see it?** Restart `npm run dev` — Vite won't re-optimize deps on HMR.
- **`localStorage is not available` during `npm test`** — harmless jsdom/node noise; suite still reports 376 passed.
- **`npm run build` warns "chunks larger than 500 kB"** — a hint, not an error; build succeeds and emits the PWA `sw.js`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `preview_start` → "Port 5199 is in use … not a preview server" | Start the `fieldshore-v4-verify` config (autoPort). Don't kill a :5199 process you didn't start. |
| `smoke.sh` FAILs at the dev-server step | Read `/tmp/fieldshore-dev.log` (it prints the tail) — usually a port grab or a Vite config error. |
| Blank page / no Operations data | IndexedDB seed didn't run; hard-reload. Seed is `src/data/store/seed.ts` (covered by `seed.test.ts`). |
