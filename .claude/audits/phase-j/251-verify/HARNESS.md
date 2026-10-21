# #251 QA harness — read before every pass

Source of truth for launching and seeding: `.claude/skills/run-fieldshore/SKILL.md` ("Two devices / Firebase emulators"). Facts below are the Phase J Step 1 lessons (skill-observations #98–#112); follow them exactly.

## Launch

- Emulators: `npm run emulators` (Auth :9099 + RTDB :9000, project `fieldshore-database`, loads the committed `database.rules.json`). Start it in the background if `lsof -i :9000` shows nothing; reuse it if already up.
- App: `npm run dev:emu` (Vite `--mode emulators`, :5200). Use the preview tools / browser pane, never `npm run dev` on :5199 for these passes.
- Never run `npm run test:rules` while an emulator holds :9000.
- Real sign-ups work against the emulator: `/auth` → Create Account (display name, email `qa251-<spec>-<n>@example.test`, password ≥ 6 chars) → Create department / Join department. Use a fresh department per spec so passes don't contaminate each other. Do not repeat passwords in your final message.

## Two devices

- Device A = `http://localhost:5200`, device B = `http://127.0.0.1:5200` — separate origins, separate storage.
- Clean an origin by navigating to `/favicon.svg` on it, then clearing IndexedDB/localStorage/caches/service workers from there, then navigating back.
- Offline: `goOffline(rtdb)` on the app's firebase module **and** `window.dispatchEvent(new Event('offline'))` (and the reverse to come back). Read app stores through their exact module URL (import from the dev server path); reinstall helpers after each reload.
- File uploads (CSV import): build a `File`, put it in a `DataTransfer`, assign to the input's `files`, dispatch a bubbling `change`.
- TanStack `<Link>` may not respond to synthetic clicks: navigate with `location.assign(...)` when a tab tap doesn't route. Sheet scrim-close may need a reload.
- Emulator REST reads need the app's namespace (`?ns=fieldshore-database-default-rtdb`) plus `Authorization: Bearer owner`; a wrong namespace returns a harmless-looking `null`.

## Evidence discipline

- At start: record `git rev-parse --short HEAD` and the console-message count as a baseline mark; "no new console errors" means none after the mark, attributed by message text.
- Screenshots: copy each into `.claude/audits/phase-j/251-verify/<NN>/shots/` with a numbered name (`01-…png`). If a screenshot lands in a tool-results file, copy it from there.
- A negative control must be able to fail; pair it with a matched positive control.
- UI proof needs three probes where relevant: exit-animation text flash, a stale frame right after a click, and Sunlight-theme contrast.

## Verdicts

Every Testable criterion in BRIEF.md gets exactly one verdict:

- **PASS** — the build does what the criterion says, with proof (screenshot path, DOM text, IndexedDB/REST read).
- **FAIL** — a build bug: the criterion is still in force and the build is wrong. Give repro steps.
- **SPEC-DRIFT** — the build follows a later decision the brief missed. Name the decision if you can find it.
- **NOT-BUILT** — the feature the criterion describes does not exist in the build.

## Report hand-off

You may not be able to write files under `.claude/`. Put the full report in your final message between the lines `=====REPORT-BEGIN=====` and `=====REPORT-END=====` (Markdown: header with date, HEAD, origins used; a verdict table `| # | Criterion | Verdict | Proof |`; then FAIL repro steps; then SPEC-DRIFT list; then console notes). After the end marker, a summary under 150 words. Stop the dev server and emulators you started when done.

## Lessons from earlier passes (read these)

- One Playwright persistent profile per account/device; drive scripts live in the session scratchpad. Non-localhost LAN origins (192.168.x) are insecure contexts with no `caches` — don't use them.
- Route the Auth emulator with a **regex** (`ctx.route(/:9099\//, …)`); the glob `'**:9099/**'` silently matches nothing.
- `goOffline` does not survive a cold reload. For an offline cold load: abort Auth by regex route, close the :9000 WebSocket with `page.routeWebSocket`, and force `navigator.onLine=false` with an init script; run a guest control under the same conditions.
- Magic links: `GET http://localhost:9099/emulator/v1/projects/fieldshore-database/oobCodes`, fetch the link with `redirect:'manual'`, `page.goto` the 303 `Location`.
- Pages reload on sign-in, sign-out and dept create/join; catch transient text ("Signing you in…") with an init-script poller writing to `sessionStorage`.
- A fresh account gets a first-run coach dialog ("Measure the opening", Skip/Next) on the tab shell — skip it; not a finding.
- Known console noise in the dev build: `Transition was aborted because of invalid state` on route changes, and one unattributed 404 on a profile's first clean load.
- No broadcast/cast surface exists in v4.0 (Deferred, #496 / ADR-040) — any broadcast criterion is Deferred, not NOT-BUILT.
