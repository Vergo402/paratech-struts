# #464 QA proof: deploy-after-delete race, two devices, local Firebase emulators

Date 2026-10-12 (UTC 03:09 to 03:32 on 2026-10-13). Branch v4-redesign. Driver: qa-driver (Sonnet 5.5) using the preview/browser tools.
Verdict: **PASS** on every criterion in the brief; the negative control also PASSES. One half of one criterion (B's End Operation) is N/A and is marked so.

## 0. Criteria table

| # | Criterion | Result | Evidence (folder `.claude/audits/phase-j/step1-fixes/464/`) |
|---|---|---|---|
| 1 | BOTH devices: point #1 only in the Deleted section (`aria-label="Deleted shore points"`), in no lane | PASS | A: `07-A-step4-...png`, `16-A-step6-...png`, `captured-text/step6-A-after-B-reconnect.json`. B: `13-B-step6-...png`, `14-B-step6-Deleted-section-expanded-...png`, `captured-text/step6-B-after-reconnect.json` (lanesWithCards [], Deleted region count 1) |
| 1b | "with no equipment shown" | PASS, but see note | The Deleted row is a slim row that cannot show equipment whatever the point holds, so it proves nothing alone. The real proof is the optional restore on A: announcement "Shore point #1 restored — Pending Equipment." and a Pending card with "Assign Equipment" and no strut (`20-A-optional-restore-...png`, `captured-text/optional-restore-A.json`), synced to B (`21-B-...png`), plus inventory 0 deployed on both (row 2). This restore result is what separates fixed from old behavior: with the deploy folded onto the deleted point it would read "restored — Equipment Assigned". |
| 2 | BOTH devices: Inventory shows nothing deployed (strip 0, no "{n} deployed") | PASS | A (full page load): `17-A-...png`, `captured-text/step6-A-inventory.txt` ("4 on hand / 0 deployed", LS 406 2/2). B: `18-B-...png`, `captured-text/step6-B-inventory.txt` (same). |
| 2b | End Operation shows no "still hold equipment" warning | PASS on A, N/A on B | A: `19-A-...png` + `captured-text/step6-endop-dialogs.txt` (dialog text has no hold warning; Cancel clicked, operation not ended). B's board has no End Operation button: it is gated on `manageOperations` (`OperationsBoard.tsx:1556`) and B joined with the Default role; button list captured. Positive control (so absence is not a dead check): after the negative control the same dialog on A reads "1 shore point still hold equipment — Rescue 464 (1)" (`25-A-negctl-end-operation-dialog-WARNING-...png`). |
| 3 | B banner `Synced — 1 of your changes had no effect`; expanded row `#1 · <label> — now Pending Equipment` / `Your deploy had no effect.`; B's optimistic Assigned state gone | PASS | `13-B-...png` (collapsed banner, all lanes 0), `15-B-step6-banner-expanded-row-...png`, `captured-text/step6-B-banner-expanded.json`: row title "#1 · West Wall Window — now Pending Equipment", line "Your deploy had no effect.", meta "23:21 · this device". Before reconnect B showed #1 in the Assigned lane (`10-B-...png`); after, lanes are empty. |
| 4 | A: no "had no effect" banner | PASS | `16-A-...png`; `.fs-sync-banner` absent on A (`bannerPresent:false`). |
| 5 | Optional restore announces Pending Equipment, then re-delete | PASS | Announcement captured from the aria-live status region; re-deleted afterwards (cloud log shows ShorePointRestored then ShorePointDeleted). |
| 6 | Emulator REST (owner auth): EquipmentDeployed IS in the cloud log, receivedAt later than the delete's | PASS | `rest/step6-after-reconnect-events.json`, `rest/final-events.json`: ShorePointDeleted c4268ac0 receivedAt 1791861627253 (03:20:27.253Z); EquipmentDeployed 13e1228d receivedAt 1791861755804 (03:22:35.804Z); gap 128.551 s. |
| 7 | No sync-layer console errors on either device | PASS | See section 5 for exactly what appeared. |
| 8 | Negative control: live deploy while connected lands on both | PASS | See section 4. |

## 1. Harness and deviations (read these)

- Servers: `preview_start fieldshore-emulators` (Auth 127.0.0.1:9099, RTDB 127.0.0.1:9000, reused:false), then `preview_start fieldshore-v4-emu` (Vite --mode emulators on :5200, reused:false). Ports were free before start (lsof) and free after (section 8).
- Two devices in one pane: A = `http://localhost:5200` (tab-1), B = `http://127.0.0.1:5200` (tab-2); separate IndexedDB and Firebase auth per origin. Viewport 1024x768, DPR 2, hover:hover; the pane reports `document.hidden === true` all run but screenshots painted real pixels.
- Emulator fence verified on BOTH origins before any sign-up: `USE_EMULATORS:true`, `auth.emulatorConfig` host 127.0.0.1 port 9099, RTDB repo host 127.0.0.1:9000 insecure. Emulator root was `null` (pristine) before sign-up.
- Stale state: BOTH origins held stale data and `preview_start` auto-opens localhost:5200 with it (localhost: 10 IndexedDB databases incl. 6 dept buckets; 127.0.0.1: 6 databases incl. 2 buckets from the #466 run). I wiped both (IndexedDB, localStorage, sessionStorage, service workers, caches) from `/favicon.svg`, a static non-app page on each origin, and verified empty. Do NOT use `/__qa_blank__.txt` for this: Vite's SPA fallback serves index.html there and boots the app. I also wiped both again at the end so the next run does not inherit this one.
- Offline simulation (deviation from "goOffline only"): `m.goOffline(m.rtdb)` PLUS `window.dispatchEvent(new Event('offline'))`. `src/data/sync/connectivity.ts` sets the banner's online flag only from window online/offline events (it does not follow `.info/connected`), so goOffline alone would leave the banner on "Syncing 1 change…". Reconnect: `m.goOnline(m.rtdb)`, polled until `.info/connected` was true (250 ms), then `window.dispatchEvent(new Event('online'))` (that event triggers `syncService.flush()`). `.info/connected` read false throughout the offline window (re-checked after the delete, after the deploy, and after returning to /operations).
- No page reload on B between going offline and reconnecting. B's offline inventory screen was reached with in-app navigation (`history.pushState` + `dispatchEvent(new PopStateEvent('popstate'))`); a `window.__qaNavMarker` set before going offline survived every hop and the reconnect, proving no reload. Before reconnecting I also read B's queued deploy event id from IndexedDB.
- Screenshots: the pane's `computer screenshot` JPEGs (800x600 frame) converted with `sips -s format png`. Captured-text files hold the DOM/IndexedDB/REST reads.
- Roles: A created the department (Admin, auto-IC "QA464 A (CHIEF)"); B joined by code with the Default role ("read everything and run field work"). Default role can deploy but has no End Operation.
- Git: two read-only commands, `git branch --show-current` (my role prompt requires it) and one unneeded `git check-ignore`. No state-changing git, no source edits, no subagents.
- REPORT.md: not attempted, because my role prompt forbids writing report .md files. Evidence dumps (screenshots, captured-text, rest, commands.log) are in the folder.
- Test accounts (emails only; one throwaway password generated at run time, not recorded here, deleted from the scratchpad): `qa464a@example.test` (A), `qa464b@example.test` (B). Emulator-only.

IDs: dept "QA Dept 464" `973cee22-17ca-49cb-8352-52253e1485bc`, invite code `3CGA-PQ99`; op "QA Op 464" `f2b1851a-29f0-4727-929f-1d59dcf32b3a` (Utilize Pending Card ON); point #1 "West Wall Window" T-Shore 60 in `50192746-cfaf-4402-94de-f02444e349fc`; point #2 "North Door" 42 in prefix `ee469d08`. Inventory: Rescue 464 with LS 304 x2 and LS 406 x2.

## 2. Timeline (UTC, 2026-10-13)

| Time | What |
|---|---|
| 03:19:49 | B offline: `.info/connected` true to false, store.online false, banner "Offline — will sync when you reconnect" (`06-B-...png`) |
| 03:20:27 | A deletes #1 (card expand, Delete, confirm). Cloud ShorePointDeleted c4268ac0-4961-4b7a-82f5-2f5459493154, receivedAt 1791861627253 (`07-A-...png`, `rest/step4-after-A-delete-events.json`) |
| 03:20:50 | Isolation proof: B still offline, still shows #1 in Pending, its IndexedDB has no ShorePointDeleted, quarantine 0 (`08-B-...png`, `captured-text/step4-B-isolation.json`) |
| 03:21:12 | B (offline) Assign Equipment, then one "Deploy" tap (LS 406 on Rescue 464, no review step or chooser: BOM is just the strut). Queued EquipmentDeployed 13e1228d-3e1e-40fb-ade6-aae1d970699f, receivedAt null, `at` 1791861672790. Banner "Offline — 1 change saved on this device — will sync when you reconnect"; #1 in the Assigned lane; Available Inventory panel LS 406 1/2; Inventory screen "3 on hand / 1 deployed", LS 406 "1 deployed" (`09`-`12-B-...png`, `captured-text/step5-*`) |
| 03:22:35 | B reconnects; the deploy uploads, receivedAt 1791861755804 (128.551 s after the delete) |
| 03:22:46 | B read ~10 s later: banner "Synced — 1 of your changes had no effect", no lane cards, Deleted 1, store online / pendingCount 0 / syncError false, quarantine 0 |
| 03:23:29 | A read: no banner, Deleted row "#1 West Wall Window", no lane cards; A's IndexedDB now holds the EquipmentDeployed from the cloud log; quarantine 0 |
| 03:25:50 | Optional restore on A: "Shore point #1 restored — Pending Equipment."; B sees #1 back in Pending; then A re-deletes #1 (03:26:31) |
| 03:26:53 | Negative control: A adds #2 North Door 42 in; B (online) deploys LS 304 (03:27:17) |

IndexedDB note: B's Dexie dump lists the deploy as seq 3 and the delete as seq 4. `seq` is the primary key and reflects LOCAL ARRIVAL order, not fold order (OperationCreated is seq 2 yet has an earlier receivedAt than ShorePointAdded at seq 1). The canonical fold sorts by `(receivedAt ?? +inf, at, id)`; see `src/data/store/operationStore.ts:24-27`. Canonical order here is Created, Added, Deleted, Deployed, i.e. delete first. By client clock the delete (at 03:20:27.172) is also earlier than the deploy (at 03:21:12.790).

Final cloud event log in canonical order (`rest/final-events.json`, offsets from OperationCreated): OperationCreated +0.0 s; ShorePointAdded #1 +19.3; ShorePointDeleted #1 +359.5; EquipmentDeployed #1 +488.1; ShorePointRestored #1 +678.9; ShorePointDeleted #1 +723.4; ShorePointAdded #2 +746.1; EquipmentDeployed #2 +769.7. Cloud inventory quantities unchanged (LS 304 2, LS 406 2; deployed is derived).

## 3. This result is tied to the #464 fix, not to #471 quarantine

Since #471 landed, a permanently rejected upload also lands in the same "had no effect" list, so the banner alone is not proof. What separates the two here: the EquipmentDeployed event was UPLOADED (it is in the cloud log with a server receivedAt) and received by A; both devices' IndexedDB `quarantine` tables have 0 rows; the emulator `/diagnostics` node is `null` (no flush-failed or quarantine records); the console shows no flush or quarantine lines; and the point's status stayed pending (restore announcement). The "no effect" outcome therefore comes from the fold, which is the #464 change in `shorePointReducer` (`if (sp.deletedAt != null) return sp;` in both StrutDeployed and EquipmentDeployed). I also confirmed in-page (`fetch('/@fs/.../src/core/shorepoint/reducer.ts')`) that the served module contains both guards (served lines 191 and 207), with no service worker and no caches on the origin.

## 4. Negative control (so "no deployed stock" cannot pass vacuously)

A added live Pending point #2 "North Door" (42 in, so LS 304 fits and LS 406 stays at 0). B, connected (`.info/connected` true), did Assign Equipment, Deploy (LS 304 from Rescue 464). Result: uploaded at once (event 7d013517, receivedAt 1791862037416); B board shows #2 in the Assigned lane (`22-B-negctl-...png`); A shows #2 in Assigned and #1 still in Deleted (`24-A-...png`); B Inventory "3 on hand / 1 deployed", LS 304 "1 deployed" 1/2, LS 406 2/2 (`23-B-...png`); A Inventory the same after a full load (`26-A-...png`). B's banner count stayed at 1 (the live deploy added no "no effect" row). A's End Operation dialog then showed the hold warning (`25-A-...png`). Left in place: op ACTIVE, #1 Deleted, #2 Assigned with LS 304 deployed; B's banner row never acknowledged ("Got it" not clicked). Everything was then wiped with the emulators.

## 5. Console and network

- B (tab-2, never reloaded from the offline window to the end): only vite debug lines, the React DevTools info line, and one `[error] Uncaught (in promise) AbortError: Transition was skipped`, logged at a full-page navigation before the offline step.
- A (tab-1): the same AbortError once, plus one `[error] Failed to load resource: ... 400 (Bad Request)` in the first boot group, before any sign-up. I could not attribute it to a URL (the network log had rolled over). INFERRED, not verified: a stale-session Auth call from the pre-wipe boot against the fresh emulator. The emulator logs (preview_logs and firebase-debug.log) show no errors.
- The AbortError traces to the CSS `@view-transition` rule in `src/app/styles.css:686` (cross-document view transition skipped because the pane's document is hidden on full page loads). Harness artifact, not a sync error.
- No `permission_denied`, no flush-failed, no quarantine diagnostics; `/diagnostics` is `null` at start, after the race, and at the end (`rest/step6-diagnostics.json`, `rest/final-diagnostics.json`).

## 6. Baseline (no pre-fix A/B possible in this tree)

Before the fix the reducer would have folded the deploy onto the deleted point: status `process` plus the full `deployedBom` under a deleted card, so both inventories would read "1 deployed" with no visible holder, End Operation would warn about held equipment for a card nobody can see, B would get no "had no effect" row, and Restore would announce "restored — Equipment Assigned". That is the implementer's RED run (the received object had `status: "process"` and the BOM while carrying `deletedAt`), pinned by name in: `src/core/shorepoint/reducer.test.ts` ("LEGACY deploy onto a soft-deleted Pending point is no effect", "EquipmentDeployed onto a soft-deleted Pending point is no effect"), `src/core/operation/reducer.test.ts` ("a deploy racing a soft delete never lands on the deleted point (#464)"), and the `... point is soft-deleted -> the identical state` witnesses in `src/core/operation/identity.test.ts`. I did not re-run them; the live run above is the user-visible half.

## 7. Surprises and UX notes

- The banner row title reads "#1 · West Wall Window — now Pending Equipment" while the card is actually in the Deleted section, not the Pending lane. It matches the brief's expected text, so PASS, but it is the implementer's concern #1: a user hunting for that card in Pending will not find it. A title or line mentioning the delete would help.
- B's offline sign: the banner only said "Offline — 1 change saved on this device" because I also dispatched the window `offline` event; with `goOffline` alone it would have said "Syncing 1 change…".
- The shore-point Delete control appears only after tapping the card to expand it; the Deleted section starts collapsed.
- Deploy is a single "Deploy" tap in the Assign Equipment sheet here (no review step, no missing-piece chooser, since the BOM has no plates).
- The first-run onboarding tour modal overlays /operations on each fresh origin (skipped once per device).

## 8. Teardown

`preview_stop` on both servers; `lsof` for TCP LISTEN on 9000, 9099, 5200, 4400, 4500 returned nothing and no firebase/vite/java processes remained; `preview_list` shows no running servers. Site data on both origins was wiped before stopping; tab-2 closed (tab-1 and the "seed" tab remain on dead pages). Scratchpad credentials file deleted. `database-debug.log` and `firebase-debug.log` in the repo root are emulator output and were left as found.

## 9. Commands and tool calls (representative)

- `preview_start {name: "fieldshore-emulators"}`, `preview_start {name: "fieldshore-v4-emu"}`; `preview_stop` x2.
- Wipe (each origin, from `/favicon.svg`): `indexedDB.databases()` + `deleteDatabase`, `localStorage.clear()`, `sessionStorage.clear()`, unregister service workers, delete caches.
- Fence check: `await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/auth/firebase.ts')` (USE_EMULATORS, `firebaseAuth.emulatorConfig`) and `.../sync/firebase.ts` (`rtdb._repo.repoInfo_.host`).
- Offline/online on B: `const m = await import('/@fs/.../src/data/sync/firebase.ts'); m.goOffline(m.rtdb); window.dispatchEvent(new Event('offline'))`; reconnect `m.goOnline(m.rtdb)`, poll `.info/connected` via `m.onValue(m.ref(m.rtdb,'.info/connected'), ...)`, then `window.dispatchEvent(new Event('online'))`. State reads: `syncStatusStore.store.getState()` from `.../sync/syncStatus.ts`; IndexedDB `fieldshore-dept-<id>` stores `events`, `quarantine`.
- No-reload navigation on B: `history.pushState({}, '', '/inventory'); window.dispatchEvent(new PopStateEvent('popstate'))`.
- REST (owner): `curl -s -H 'Authorization: Bearer owner' "http://127.0.0.1:9000/orgs/<dept>/events/<op>.json?ns=fieldshore-database-default-rtdb"`, also `.../orgs/<dept>/inventory.json` and `/diagnostics.json`.
- UI flow: /auth Create Account (A, B); /create-department "QA Dept 464"; B /join-department with the code; Inventory Add apparatus "Rescue 464", Add equipment LS 406 x2 and LS 304 x2; Start Operation "QA Op 464" (Utilize Pending Card on); + Shore Point (label, 5 ft 0 in); card expand, Delete, confirm; Assign Equipment, Deploy; Deleted section, Restore; End Operation dialog opened and Cancelled.

## 10. Observation candidates for the task-observer log (not written by me)

1. `run-fieldshore` SKILL.md, "Two devices / Firebase emulators" (repo fieldshore): (a) `preview_start` auto-opens localhost:5200 with stale state, so wipe each origin from a static non-app URL such as `/favicon.svg` (NOT a `.txt` path, which the SPA fallback boots as the app); (b) offline recipe is `goOffline(rtdb)` plus a dispatched `offline` event and reconnect `goOnline` then `online`, because connectivity.ts listens only to window events; (c) no-reload in-app navigation via `history.pushState` + `popstate` works with TanStack Router (verify with a window marker); (d) screenshots land as JPEGs under `~/.claude/projects/.../tool-results/`, convert with `sips`.
2. QA brief template: name the signed-in role for each device; the Default role has no End Operation, so any step needing it must run on the Admin device. Pair every "absent warning" criterion with a positive control.
3. Orchestrator briefs: subagent role prompts forbid writing report `.md` files; ask for the report in the final message (second run in a row where this came up).
