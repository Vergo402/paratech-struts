# #471 sync quarantine — QA proof in the running app (emulator harness)

Driver: qa-driver, 2026-10-12 21:27 – 21:57 local (01:27 – 01:57 UTC 10-13), branch `v4-redesign` working tree (uncommitted #471 fix: `syncService.ts`, `operationStore.ts`, `db.ts`, `overridden.ts`, `useOverridden.ts`).
Recipe followed: `.superpowers/sdd/v4-phase-j-step1-p1-p8/qa-471-brief.md` + the "Fix round 2" recipe in `task-1-report.md` (primary path = revoke your own membership).
No source edits, no git commands, no sub-agents. Everything below was driven through the preview browser pane (real mouse clicks; the board status control is the BUTTON variant — the pane is a `hover: hover` mouse context, so the touch slider path was NOT exercised).

## Verdict

| # | Criterion (brief step 4/5/6) | Result | Proof |
|---|---|---|---|
| 1a | Strike 1 shows the "retrying" banner right away | PASS on intent; **literal string differs from the brief**: the app renders `1 change haven’t synced yet — retrying` (the brief/recipe write `hasn't`) — see Finding 10 | recorder: `Syncing 1 change…` +0.09 s → `retrying` +0.13 s; screens 13, 21, 30 (t+1.6 s), 05 (t+5 s), 14 (t+6.6 s) |
| 1b | Within ~25 s banner reads `Synced — 1 of your changes had no effect` | PASS — **20.19 s** (change 1), 20.16 s (change 2) | recorder + server-side ledger (strikes at +0 / +5.03 / +20.04 s, `write_rejected` at +20.06 s); screens 06b, 15 |
| 1c | Expanded row = `#<n> · <label> — now <status>` / `Rejected by the department server — not shared with the team.` / `HH:MM · this device` | PASS | text capture `#1 · QA Window — now Equipment Assigned` / line / `21:39 · this device`; screens 07, 10, 16 |
| 2 | Shore point snapped back to the cloud status | PASS | recorder lane Strut Set → Equipment Assigned at +20.19 s; screens 06b (Board lane), 08 (Division chip `ASSIGNED`), 09/10 (/command tally Equipment Assigned 1, Strut Set 0) |
| 3 | No `pending sync` cell lit on the Command rail | PASS, **but the check is vacuous for a status change** (see Findings 1) — proven with a ResourceAssigned positive control: cell LIT while retrying, GONE at +20.15 s | screens 09/10 (status change, never lit), 21 + 22 (lit, `1 pending sync`), 23 (gone) |
| 4 | `Got it` clears; reload BEFORE keeps the row; reload AFTER does not bring it back | PASS | screens 09/10 (reload before: row kept), 11 (Got it: cleared), 12 (reload after: quiet); IDB after Got it: `quarantine`=1 stays, meta `fieldshore_rejected`=`"[]"` |
| 5 | IndexedDB `quarantine` = 1 and `events` no longer contains the id | PASS | `idb-after-quarantine-1.json`: `fieldshore-dept-a1109487-…` v20, quarantine 1 row (`45418fbb…`, ShorePointStatusChanged, `to: strutset`, reason `Error: PERMISSION_DENIED: Permission denied`), events 3 rows, `quarantinedIdInEvents:[false]`; owner REST: id absent from `orgs/<dept>/events/<op>`; `/diagnostics/sync` has one `write_rejected` per quarantined event |
| 6 | Console errors: nothing new from the sync layer | PASS | see "Console" below — no error-level sync message, no unhandled rejection (page recorder `errs: []` in every run) |
| 7 | Negative control: another change after `Got it` also ends as a rejected row (no forever-"retrying") | PASS — **20.16 s** | screens 13–16; IDB quarantine = 2 (`idb-after-quarantine-2.json`); ledger shows the same 5.0 s / 15.0 s spacing |
| 8 | Restore: PUT member node back + reload → banner quiet, new changes sync | PASS (with one nuance) | the unacknowledged row from change 2 correctly survived the reload (screens 17/18) until `Got it` (screen 19 quiet); change 3 then synced in 53 ms (screen 20) and landed in the cloud (`7767240c… ShorePointStatusChanged to=strutset`); none of the quarantined ids was re-sent |

Extra runs (beyond the brief, each answers "is the wedge really gone / is anything lost"):

| Run | What | Result |
|---|---|---|
| B | Two changes queued behind a refused head (add shore point #2, then #1 → Cutting), membership still revoked | PASS, no wedge: first quarantined at +20.19 s, second at **+140.3 s** (strikes at +20 / +80 / +140 s on the capped 60 s backoff); banner ended `Synced — 2 of your changes had no effect` with rows `#1 · QA Window — now Strut Set` and `#2 · QA Window 2 — not on the board` (screens 25–28). Ledger shows the second commit's trigger flush logged `flush-failed` at +2 s but added NO strike (strikes only on timer passes) |
| C | Transient refusal that recovers: change made while revoked, membership restored 12 s later | PASS: nothing quarantined — the 3rd timer pass (+20.1 s) uploaded the event (`310dce34 ResourceAssigned` in the cloud), ledger has only 2 `flush-failed` and no new `write_rejected`; banner and rail went quiet (screens 30–31) |

## Harness (exact)

- `preview_start {name: "fieldshore-emulators"}` → serverId `c19b5e4c-26cf-48d2-9878-1ec51b8b4885`, port 9000 (Auth :9099 + RTDB :9000, `npm run emulators`, loads committed `database.rules.json`). Probe after start: RTDB 200, Auth 200.
- `preview_start {name: "fieldshore-v4-emu"}` → serverId `b769dd53-4cf7-40d3-90b7-f5e9d7e43769`, http://localhost:5200 (`npm run dev:emu`).
- Throwaway account on the local emulator: display name `QA Driver`, email `qa471@example.test` (password not recorded). Department `QA Dept 471` (invite `6GNV-NE3U`), operation `QA Op 471` with "Utilize Pending Card" ON, shore point #1 `QA Window` (T-Shore, 8′4″ → 100″).
- Setup deviation from the brief: a pending point's pending→deployed step is owned by the deploy flow (`status.ts` comment), not a `ShorePointStatusChanged`, so before revoking I ran Assign Equipment → Deploy → "Deploy off-book (untracked)" → Confirm & deploy (empty dept inventory). The change under test is the next plain status step, `Set Strut Set` (Equipment Assigned → Strut Set).
- IDs: deptId `a1109487-1a15-4688-8f0e-54ce6cce16c3`, uid `nqqhIJewhFypCWuacZai5YoT1vb8`, opId `8bd2633d-f789-4f70-9465-c8c3c8d1e33f`, ns `fieldshore-database-default-rtdb` (the app's `databaseURL` host, `src/data/auth/firebase.ts:11`). RTDB traffic is a WebSocket, so the ids came from the owner REST reads below (and `indexedDB.databases()` for the bucket name), not `read_network_requests`.
- Before revoking I proved setup had reached the cloud: owner `GET orgs/<dept>/events/<op>.json` listed `OperationCreated`, `ShorePointAdded`, `EquipmentDeployed` (3 events), banner quiet, `/command` baseline clean (screens 01–03).

## Commands (full transcript with timestamps and responses: `commands-and-timings.txt`)

```
# revoke (21:39:10 local) — response `null [HTTP 200]`; members.json afterwards `null`
curl -s -X DELETE "http://127.0.0.1:9000/orgs/<dept>/members/<uid>.json?ns=fieldshore-database-default-rtdb" -H 'Authorization: Bearer owner'
# original node saved first (member-node-original.json): {"displayName":"QA Driver","joinedAt":1791855213608,"role":"admin"}
# restore — response echoes the node [HTTP 200]
curl -s -X PUT "…/members/<uid>.json?ns=…" -H 'Authorization: Bearer owner' --data-binary @member-node-original.json
# ledger (app can't read it; owner can)
curl -s "http://127.0.0.1:9000/diagnostics/sync.json?ns=fieldshore-database-default-rtdb" -H 'Authorization: Bearer owner'
# cloud event list
curl -s "http://127.0.0.1:9000/orgs/<dept>/events/<op>.json?ns=…" -H 'Authorization: Bearer owner'
# screenshots: tool-results .jpg -> PNG
sips -s format png <src>.jpg --out <name>.png
```
In-page helpers (saved here): `recorder.js` (MutationObserver banner/rail/lane log with stamps, errors, visibilitychange) and `idb-read.js` (raw `indexedDB.open` of `fieldshore-dept-<deptId>`).

## Timelines (server-side ledger = client stamp of each `flush-failed` / `write_rejected`, UTC)

| Change | click | strike 1 | strike 2 | strike 3 | `write_rejected` | banner flips |
|---|---|---|---|---|---|---|
| 1 status → Strut Set | 01:39:31.378 | 31.508 | 36.534 (+5.03) | 51.550 (+15.02) | 51.570 | 51.568 (+20.19 s) |
| 2 same again after Got it + reload | 01:42:59.643 | 59.756 | 04.773 (+5.02) | 19.790 (+15.02) | 19.803 | 19.803 (+20.16 s) |
| 4 ResourceAssigned `FF Lopez` | 01:47:20.086 | 20.180 | 25.184 | 40.222 | 40.244 | 40.240 (+20.15 s) |
| B-A shore point #2 added | 01:49:51.054 | 51.173 | 56.200 | 50:11.227 (+15.03) | 50:11.247 | 50:11.246 (+20.19 s) |
| B-B #1 → Cutting (queued behind A) | 01:49:53.079 | 50:11.250 | 51:11.311 (+60.06) | 52:11.339 (+60.03) | 52:11.354 | 52:11.353 (+140.3 s) |
| C transient (restored 01:55:39) | 01:55:27.165 | 27.272 | 32.280 | — uploaded 47.286 | none | quiet 47.305 (+20.14 s) |

Page `visibilityState` was `visible` for every timed window (screenshots keep the hidden pane awake; the recorder logged no `visibilitychange` during runs 1/2/4/B/C), so the 5 s / 15 s / 60 s timers were not throttled — the ledger spacing (5.02–5.03 s, 15.02 s, 60.03–60.06 s) confirms it.

## Console / network

- `read_console_messages` baseline (before any revocation): errors = 3× `Failed to load resource: net::ERR_CONNECTION_REFUSED`, 7× `…400 (Bad Request)` (network buffer had rotated, so I could not attribute them; they predate every step of this run), 3× `Uncaught (in promise) AbortError: Transition was skipped`.
- After the whole session the error list differs only by more `Uncaught (in promise) AbortError: Transition was skipped` (one per full reload, 9 total) — a View Transitions skip on navigation in a hidden/unfocused pane, not the sync layer.
- New warnings, all expected consequences of the revoked membership: `@firebase/database: FIREBASE WARNING: set at /orgs/<dept>/events/<op>/<id> failed: permission_denied` (3 per refused event, plus `update at /orgs/<dept>/events failed` when 2+ events were queued and the pass tried the chunk write first), and `… set at /orgs/<dept>/deviceOwners/<deviceUid> failed: permission_denied` once per boot while revoked (01:41:38, 01:42:15, 01:49:13).
- Nothing at error level from `syncService`/store, and my in-page `unhandledrejection`/`error` listeners captured nothing in any run.
- `read_network_requests`: only Auth emulator `accounts:lookup` (200) is visible over HTTP; the RTDB writes are WebSocket frames, so the refused writes are evidenced by the SDK warnings and the ledger instead.

## Findings / surprises (none are failures of #471)

1. **The brief's Command-rail check cannot discriminate for a status change.** The rail's `pending sync` figure counts only queued `ResourceAssigned` / `ResourceCleared` events (`pendingResourceKeyOf`, `syncService.ts:140-144`), never `ShorePointStatusChanged`. With a status change that cell is dark before and after any fix. I therefore added run 4 (add individual `FF Lopez` to Operations Section Chief): `1 pending sync` lit while `retrying` (screens 21, 22), cleared at the quarantine (screen 23), Ops Section Chief snapped back to `Unassigned`, and the expanded row reads `FF Lopez assigned to Operations Section Chief` / the rejected line / `21:47 · this device`. Suggest the gate recipe use this variant for the rail line.
2. **Copy nit:** that ResourceAssigned row title describes the attempted action (reads as if the assignment happened); the line under it says it was rejected, and status rows read `— now <cloud status>`, which is clearer. Low priority.
3. **Time-to-quiet scales with the backlog:** each additional refused event waits two more 60 s timer retries, so n refused changes need ≈ 20 s + 120 s × (n−1) (run B: 140 s for two). During that time the banner says `retrying` even though the first event was already quarantined, and its row stays hidden until the queue fully drains (banner priority: retrying > no-effect notice). This matches the implementer's accepted R3/CRITICAL-1 notes; flagging so the owner knows what a firefighter would see.
4. **Transient window is ~20 s:** run C shows a refusal that clears inside the 20 s window loses nothing; one that outlasts it moves the change to `quarantine` (kept in IndexedDB, recoverable in v4.1) and tells the user.
5. After restore + reload the unacknowledged notice persists (by design, "persistent quiet state until acknowledged"), so the banner is only fully quiet after `Got it`; the brief's "banner should be quiet" holds after that.
6. `deviceOwners/<uid>` set is refused on every boot while membership is revoked (console warning, not queued, no UI) — outside #471.
7. Screenshot lag: the pane is hidden, and the capture can show the previous frame (screen 04a is a pre-click frame at +0.1 s; 06a at +20.2 s still shows `retrying` although the DOM had flipped at +20.19 s). I took the timing truth from the in-page recorder and the ledger, and used the later screenshots (06b +24.3 s, 15 +23.7 s) as the visual proof. The brief's "immediately" frame: the `retrying` banner is on screen from +0.13 s, so the earliest truthful screenshots are 13/21/30 (+1.6 s).
8. Unrelated layout/a11y observations: at 1024 px the Board view's document is wider than the viewport (`scrollWidth` 1234 > 1024), so a click/focus scrolls the whole shell sideways (nav slid off-screen in screens 07, 16, 18); and a visually hidden live region still read `Shore point — now Strut Set.` after the snap-back (seen once in `body.innerText`).
9. Leftovers: the emulator wrote `database-debug.log` and `firebase-debug.log` into the repo root (git-ignored by `*.log`); the pane's IndexedDB for localhost:5200 now holds the QA sign-in and the `fieldshore-dept-a1109487-…` bucket (harmless; emulator data itself is gone when the servers stop).

10. **Copy bug, predates #471:** the stuck banner hard-codes `haven’t` after `changes(n)` (`src/app/shell/SyncBanner.tsx:67`), so a single change reads `1 change haven’t synced yet — retrying` (should be `hasn’t`). `SyncBanner.tsx` is not in the #471 diff; `SyncBanner.test.tsx:67` pins the current wording. Not a regression, but a reviewer comparing the brief's literal string will see the mismatch.

## Not tested / limits

- Touch/slider status control; real Firebase (this was the emulator only; rules = committed `database.rules.json`); the deny-event-writes-only fallback recipe (not needed, revocation behaved as the report describes); a pre-fix comparison (no source edits allowed, so "wedge gone" is shown by every refused change reaching quarantine, not by A/B against the old build).
- The 400 / connection-refused console errors at baseline are unattributed.

## Evidence index (PNG, 800×600 pane captures)

01 baseline Division view `ASSIGNED` · 02 /command baseline (no pending sync) · 03 board baseline, pre-change
04a stale frame (pre-click) · 04b +0.5 s `Syncing 1 change…` · 05 +5 s `retrying`, card in Strut Set lane · 06a +20.2 s STALE frame · **06b +24.3 s `Synced — 1 of your changes had no effect`, card back in Assigned**
**07 expanded row (title / line / `21:39 · this device`)** · 08 Division chip `ASSIGNED` after snap-back
09 reload at /command before Got it: banner kept, no pending-sync cell · 10 same, expanded row persisted · 11 Got it → cleared · 12 reload after Got it → quiet
13 change 2 +1.6 s `retrying` · 14 +6.6 s still `retrying` · **15 +23.7 s `Synced — 1 of your changes had no effect`** · 16 expanded second row
17 after restore + reload: unacknowledged row persists · 18 expanded · 19 after Got it: quiet · 20 change 3 synced, banner quiet
21 ResourceAssigned +1.6 s `retrying`, rail **1 pending sync** lit · 22 +6.6 s still lit · 23 +23.7 s banner `Synced…`, rail cell gone · 24 expanded row `FF Lopez assigned to Operations Section Chief`
25 backlog +3.5 s `2 changes haven’t synced yet — retrying` · 26 +26.7 s first quarantined, `1 change… retrying` · 27 +157 s `Synced — 2 of your changes had no effect` · 28 expanded two rows
29 final restore, change synced, banner quiet · 30 transient run +1.6 s · 31 transient run +24.6 s, quiet, `FF Lopez` kept
Data: `idb-after-quarantine-1.json`, `idb-after-quarantine-2.json`, `idb-after-quarantine-4-resource.json`, `idb-after-backlog-run.json`, `member-node-original.json`, `commands-and-timings.txt`, `recorder.js`, `idb-read.js`.

## Teardown

Both preview servers stopped with `preview_stop` (`fieldshore-v4-emu` b769dd53…, `fieldshore-emulators` c19b5e4c…). Port check at 21:59:52 and again at 22:00:02 local: `lsof` on :9000 :9099 :5200 :4400 :4500 shows nothing listening, `curl` probes refused (`000`), and no firebase/java/vite process remains — :9000 is free for the next gate run (raw output at the end of `commands-and-timings.txt`).
