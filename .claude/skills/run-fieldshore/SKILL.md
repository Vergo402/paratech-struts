---
name: run-fieldshore
description: "Build, launch, test, and drive the FieldShore v4 app — the Vite/TS/React PWA under src/ on the v4-redesign branch. Use whenever someone says 'run fieldshore', 'start the v4 app', 'launch the dev server', 'screenshot the app', 'drive the UI', 'verify my change in the browser', or 'does it still build/test'. Headless gate = .claude/skills/run-fieldshore/smoke.sh; interactive driving = the preview MCP. v4-redesign branch only."
---

# Run FieldShore (v4 app)

FieldShore is a **dual-app repo**. This skill drives **v4** — the Vite 6 + TypeScript + React 18 PWA rooted at `src/app/` (the active work on `v4-redesign`, not yet deployed). The legacy **v3** app (root `index.html` / `app.js`, ships to GitHub Pages) is just static files — serve it with `npx serve -l 8095 .` and stop reading; it's not what this skill is for.

Two verified ways to drive v4:
- **Headless gate** (CI / fresh clone / no browser): `.claude/skills/run-fieldshore/smoke.sh` — typecheck + the current vitest suite + proves the dev server serves the app shell.
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
npm test            # vitest run — the current suite (smoke.sh prints the real count)
npm run build       # tsc --noEmit && vite build → dist/ + PWA service worker
```

**Commit gate:** any commit that intentionally changes component behavior runs `npx vitest run` + `npx tsc --noEmit` first — and when changing a contract, grep tests for assertions pinning the old behavior and move them in the SAME commit (a red test left behind reads as a regression to the next session). Gate commands run bare — never piped (`| tail` etc. eats the exit code); filter a saved output file afterward.

## Interactive driving — preview MCP (clicks + screenshots)

`preview_start` reads `.claude/launch.json`. The dev server pins **:5199** (`strictPort`): if it's free, start `fieldshore-v4-dev`; if :5199 is already taken, start **`fieldshore-v4-verify`** (autoPort — boots a throwaway instance on a free port). Then drive the returned `serverId`:

- `preview_snapshot` → accessibility tree (best for verifying text/structure).
- `preview_screenshot` → visual JPEG.
- `preview_console_logs level=error` → runtime errors.
- **Switch tabs with `preview_eval` running `location.assign('/operations')`, NOT a click** — the nav is a TanStack Router `<Link>` the MCP's click can't drive. Routes: `/quickfind /operations /inventory /command /settings`.

All five routes are live, drivable screens (Phase I shipped Quick Find, Operations, Inventory, Command, Settings). Local data is **IndexedDB** (Dexie); cloud sync + auth exist — to get past auth gates locally, seed the `fieldshore_session` Dexie meta row with `role:'admin'` but identity `{kind:'guest'}` and `departmentId` null (a seeded member gets downgraded by the auth reconcile; a departmentId switches the Dexie bucket away from seeded data).

### Verification tricks (battle-tested)
- **Dropdown OPTIONS (PickerSurface/Popover): don't trust `ref_N` clicks** — overlays resort/highlight between `read_page` and click, landing the wrong row. Screenshot, click by coordinate, then read back the applied-summary text to confirm the selection. Buttons/radios outside dropdowns are ref-safe.
- **Theme-token CSS (box-shadow/filter): check COMPUTED values in ≥2 themes** — `var(--a), var(--b)` where one theme resolves a token to `none` is an invalid shadow list and the whole declaration drops silently (passes tests/lint). Mirror `.fs-card`'s two-rule split instead of comma-joining.
- **Wheel scrolls nothing but clicks work, over a portaled surface inside a Modal** → suspect the dialog scroll-lock (react-remove-scroll kills wheel at document-bubble over portals), not CSS. Diagnose event deaths empirically: phase-recorder listeners (elCapture/elBubble/docCapture/docBubble) + one synthetic cancelable event pinpoint where it dies before you write an ordering-dependent fix.
- **Test times out ONLY in full parallel runs** → time it solo first (`npx vitest run <file> -t '<name>'`). Solo ≪1s + no waitFor/timers = CPU contention, not a race — scope `{ timeout: N }` (~3× worst observed) on that test; don't hunt phantom races. Race-hunting is for assertion failures and real async waits.
- **Scroll-cinematic / rAF-gated canvas pages (GSAP pins, Lenis, three.js): the preview MCP captures black frames** — teleport-scroll leaves rAF frozen while the DOM tree reads "visible". Probe liveness first (`document.hidden`, a 10-frame rAF tick count); if frozen, drive with headless Playwright (cached Chromium, `docs/v4-design/13-slice/capture-screenshots.mjs` camera pattern) and use small continuous scroll deltas, never big `scrollTo` jumps. A DOM snapshot showing an element visible is not proof it painted.
- **Layout/ref effects** (`useLayoutEffect`, canvas refs) must be verified in a `vite preview` prod build — dev StrictMode double-invoke masks single-pass bugs that only show on beta.

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
- **`localStorage is not available` during `npm test`** — harmless jsdom/node noise; the suite still passes.
- **`npm run build` warns "chunks larger than 500 kB"** — a hint, not an error; build succeeds and emits the PWA `sw.js`.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `preview_start` → "Port 5199 is in use … not a preview server" | Start the `fieldshore-v4-verify` config (autoPort). Don't kill a :5199 process you didn't start. |
| `smoke.sh` FAILs at the dev-server step | Read `/tmp/fieldshore-dev.log` (it prints the tail) — usually a port grab or a Vite config error. |
| Blank page / no Operations data | IndexedDB seed didn't run; hard-reload. Seed is `src/data/store/seed.ts` (covered by `seed.test.ts`). |
