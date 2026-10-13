# #475 QA proof: a second cut claimed by the same saw no longer vanishes

Run: 2026-10-13, 02:45 to 03:10 local. Branch `v4-redesign`, with no git commands run. Tool vocabulary was the Claude desktop Browser pane (`mcp__Claude_Browser__*`). The harness was the emulators (Auth :9099, RTDB :9000) plus `dev:emu` on :5200, with my own dedicated browser tab (tab-4) and `tabId` passed on every call.
Evidence folder: `/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/step1-fixes/475/`

## Verdicts

| # | Criterion | Result |
|---|---|---|
| 1 | SP1 hero ("Cut this now"), SP2 Up next badge 1, "2 cuts in queue" | **PASS** (shot 01, json 01) |
| 2 | SP1 Cut Done then Send to Runner. Saw A auto-claims SP2, "1 cut in queue" | **PASS** (shot 02, json 02). SP1 stays at `status runner` with `sawId` "A" (tag survives Cutting to Runner). |
| 3, as originally written | Both cuts' `sawId` "A" | **SUPERSEDED, not a FAIL.** Per your mid-run message, a Runner to Cutting step-back now drops `sawId`, so SP1 is untagged and the duplicate-tag state cannot arise from the UI. |
| 3, corrected | Both cuts visible; SP2 stays the hero tagged A; bounced SP1 untagged under Up next row 1 badge 1; "2 cuts in queue"; no single-saw "last cut" copy | **PASS** (shots 03, 03a, json 03). |
| 4, corrected | + Add saw: B claims SP1 (the bounced cut), never SP2; Up next 0; "Nothing waiting — every cut is claimed." | **PASS** (shots 04, 04b, json 04) |
| 5 | Negative control, untagged cuts behave as before | **PASS**, in a two-saw variant (shots 05a, 05, json 05a, 05) |
| 6 | Phone 375×812 repeat of step 3 | **PASS** (shots 06, 06a, json 06) |
| 7 | Baseline note | Stated below. |
| 8 | Sync-layer console errors; servers stopped | **PASS for sync.** 13 HMR-storm React errors occurred before my clean reload (listed below). Servers stopped, ports free. |
| X1 | Probe (non-UI): real duplicate-tag state | **PASS** (shot 07, json 07) |
| X2 | Probe recovery: a free saw claims the duplicate-tagged cut | **PASS** (shot 08, json 08) |
| X3 | Phone multi-saw layout with a duplicate-tagged cut | **PASS** (shots 09, 09a, json 09) |

## What each check can and cannot prove

- **Corrected steps 3 and 4 prove the follow-on, not `saw.ts`.** They show the reducer drops the tag on Runner to Cutting. The step 3 store read has SP2 `sawId` A, SP1 `sawId` absent, `cuttingDone` true, and its FIFO stamp `cuttingStartedAt` 1791874436871 kept. They would pass with the old `saw.ts` too, because an untagged bounced cut was never stranded.
- **The `saw.ts` change is proven in the real app only by the probe (X1 to X3).** That is the original symptom: a cut tagged to a saw that already has a hero.
- **Probe method (store-level, not UI).** I committed the same event a second device's claim would write, through the app's own `operationStore.commit`. It was `CuttingClaimed(Q, "A")` while P held Saw A (id 9678e9f4-7627-4685-aabb-aca78085bbfc, commit `ok:true`, uploaded with `receivedAt`).
- **Store after the probe.** Queue tags were SP1 B, P A, Q A, so Saw A had two tagged cuts.
- **Screen after the probe (shot 07).** "3 cuts in queue"; hero A is P (45½″); hero B is SP1; Up next 1 lists Q (36½″); there is no "Nothing waiting" copy; every queue cut appears exactly once.
- **Counterfactual.** I ran the live queue through the app's loaded `assignSaws` and through a pre-fix filter I reconstructed from the implementer's description.
  - Current logic returned Up next `[Q]`.
  - The reconstruction returned `[]`, which would strand Q while the count says 3.
  - The reconstruction is illustrative only, not a real old build (see step 7).
- **Recovery (X2).** I sent SP1 to Runner from Saw B's hero. Saw B then auto-claimed Q and the reducer re-tagged it A to B (hero B = Q, Up next 0, "every cut is claimed", 2 cuts in queue).
- **Phone multi-saw (X3).** I created R, tagged it to A with the same probe, then used 375×812 with touch emulation.
  - The select screen showed "1 waiting in the shared queue" on both stations.
  - Scoped to Saw A: hero P, Up next 1 = R (57½″), and the muted line "Saw B is on its own cut (SP-4) — not in your queue." Count 3 equals hero + row + that muted sentence, which is by design (#390).
  - Document `scrollWidth` 375 equals `clientWidth` 375, and the station is 359/359.

## Steps driven (all through the UI with a mouse, unless labelled)

**Setup**
- Sign-up at `/auth` as `qa475@example.test`; the password is not recorded anywhere.
- Fence check before typing any credential: `USE_EMULATORS` true, Auth 127.0.0.1:9099, RTDB 127.0.0.1:9000 insecure, project `fieldshore-database`. The sign-up POST went to `http://127.0.0.1:9099/...accounts:signUp`.
- Department "QA Dept 475" (Admin), apparatus "Rescue 475", stock 3× LS 304 and 3× LS 406, operation "QA Op 475" with "Utilize Pending Card" off (one-step inline deploy).
- Points: SP1 (#1, 5 ft 0 in, LS 406, cut 51½″), SP2 (#2, 3 ft 6 in, LS 304, cut 33½″), then P (#3, 4 ft 6 in, 45½″), Q (#4, 3 ft 9 in, 36½″), R (#5, 5 ft 6 in, 57½″).
- The Area and Label fields carry the point names so the station subtitle reads "Div 1 · SP1 · T-Shore".
- Each point went Set Strut Set, then Send to Cutting Station, from the Board view, so nothing is claimed until the station is opened.

**Step 1.** SP1 then SP2 reached Cutting (shot 01a, tab count 2). The station showed the hero "Cut this now" 51½″ (SP1), "UP NEXT 1" row 1 = SP2 33½″, and "2 cuts in queue". Store: SP1 `sawId` A, SP2 untagged.

**Step 2.** Mark Cut Done then Send to Runner on the hero.
- Saw A auto-claimed SP2 (hero 33½″), and the count read "1 cut in queue".
- Up next 0 with the single-saw copy "Nothing waiting — this is the last cut.", which is correct for one cut.
- SP1 appeared in the "Sent to runner" tail.

**Step 3.** On the Board, SP1's Back button in the Runner lane (announcement "Shore point — back to Cutting Station."), then the station.
- It showed hero SP2 33½″, Up next 1 with row 1 = SP1 51½″, and "2 cuts in queue".
- No new claim event fired, so Saw A kept SP2.
- Reconciliation: store cutting ids = SP1 and SP2, on-screen ids = SP2 and SP1, each exactly once, count equals on-screen.

**Step 4.** + Add saw.
- Events: `SawAdded` B, then `CuttingClaimed(SP1, B)`.
- Hero A = SP2; hero B = SP1 (51½″, "✓ Cut done", offering Send to Runner and Clear Cut Done).
- Up next 0, "Nothing waiting — every cut is claimed.", count 2. Store: SP1 `sawId` B, SP2 `sawId` A.
- The second hero sits below the fold at 1024 wide (shot 04b is the scrolled view).

**Step 5.** I ran it with both saws busy, a stricter control than the brief's single-saw wording.
- P then Q went to Cutting while A had SP2 and B had SP1. The station showed Up next 2 with P and Q both untagged, and no claim events for either (shot 05a).
- I then finished Saw A's cut (Mark Cut Done and Send to Runner on SP2, the first of two "Send to Runner" buttons in DOM order, confirmed by the ref being the same node).
- Result (shot 05): `CuttingClaimed(P, A)`; hero A = P; hero B still SP1 (store `sawId` B, not stolen); Up next 1 = Q (store `sawId` absent); "3 cuts in queue".
- This control can fail: a mis-tag or a steal would change the store and the screen. The matched positive control is step 1 (an untagged SP2 behind Saw A's hero at badge 1).

**Step 6.** Done in the step-3 state, before step 4, because the roster is append-only and the single-saw layout is only available then.
- Mobile preset 375×812 (Android UA, 5 touch points, sliders instead of buttons), reload, Cutting radio.
- "2 cuts in queue", hero SP2 33½″ with slider labels, Up next 1 row = SP1 51½″, no "Nothing waiting" copy.
- `scrollWidth` 375 equals `clientWidth` 375 (station 359 equals 359).

## Step 7: baseline note

No pre-fix A/B is possible in this tree. Before the fix, the duplicate-tag state showed one hero, Up next badge 0 and "Nothing waiting — this is the last cut." while the count said 2. That comes from the implementer's RED output and `src/core/operation/saw.test.ts`; I did not observe it in the running app. My in-page reconstruction of the pre-fix filter is illustrative only.

## Before and after the follow-on hot reload

**Landing window.** Your follow-on landed at 02:47:24 (`shorepoint/reducer.ts`), with further writes at 02:47:31 (`saw.ts`, `CuttingStation.tsx`) and 02:49:59 (`reducer.ts`).

**Before the settle check (inside the landing window).**
- Run before the settle check: sign-up, department, inventory, operation start, and creation plus deploy of SP1 and SP2 (about 02:46 to 02:52).
- That tab had absorbed the hot updates. These steps do not depend on saw or cutting logic, and the events were re-folded by the final code afterwards.

**After the settle check.**
- The stability check: mtimes and hashes were identical at 02:51:27 and 02:52:29 (62 s apart), and again at 02:56:28.
- I then reloaded the tab (~02:53). The page ran the final code (module stamp `t=1791874199653`).
- All numbered steps (1 to 8), the probe and the phone checks ran on the reloaded page.

**Fingerprints.**
- `00-env-start.txt` holds the pre-follow-on hashes (`saw.ts` 6e545672…, `CuttingStation.tsx` dd1f2186…).
- `00-env-after-followon.txt` holds the post-settle hashes (`saw.ts` b90da512…, `CuttingStation.tsx` 56b48812…, `shorepoint/reducer.ts` 900c08dd…).
- `00-env-end.txt` shows all five files unchanged, and nothing under `src/` was written during steps 1 to 8.

## Deviations from the brief, with reasons

- **Dev server before emulators.** This lets stale origins be wiped before an emulator exists to receive stale writes. Both origins were already empty.
- **Step 6 before step 4.** The roster is append-only (only `SawAdded` exists), so the single-saw phone layout is only reachable in the step-3 state.
- **Step 5 in the two-saw state.** The roster cannot return to one saw; step 1 serves as the single-saw positive control.
- **One-step deploy (Pending Card off).** This was a shorter route to Cutting, and the 464 run had used two-step.
- **Probe and phone multi-saw checks are extras.** I added them because corrected steps 3 and 4 no longer discriminate `saw.ts` (see above).

## Step 8: console, network, sync

**Sync-layer**
- No permission-denied, no Firebase warnings, nothing about quarantine, sync, rejected, or WebSocket anywhere in the buffer.
- End state: local Dexie rows 36 equals 36 events in the emulator database (read with an admin bearer at `orgs/<dept>/events/<op>`).
- Every cloud event carries `receivedAt`. Quarantine 0, unsent 0, rejected 0, overridden 0, no sync banner.

**Console, tab-4 only (fresh tab, so the buffer is this run's)**
- 13 errors, all React/HMR artifacts from your edit storm:
  - 3 `createRoot()` warnings (about calling it on a container already passed to `createRoot()`).
  - 4 `removeChild` NotFoundError entries, each followed by an "error occurred in <MatchImpl|CatchBoundaryImpl|AuthRoute>" entry.
  - 1 "FieldShore crashed", caught by the ErrorBoundary, which recovered.
  - 1 AbortError "Transition was skipped".
  - 4 more entries of the same two kinds.
- Attribution: the component stacks name `main.tsx?t=1791874044696`, `?t=1791874051838` and `?t=1791874199653`, which match your three edit times (02:47:24, 02:47:31, 02:49:59). Vite logged "Could not Fast Refresh" for `main.tsx`, so it re-executed and called `createRoot` twice.
- 4 Dexie `BulkError` `[log]` lines: `events.bulkAdd()` rejected by the unique `id` index, which `db.ts` documents as the expected result of a duplicate append. They sit before my reload in buffer order. Cause is a hypothesis: an HMR-recreated store re-ingesting cloud echoes already on disk.
- After my clean reload nothing new appeared. Verified by counts: onlyErrors N stayed 13, and the total went 340 to 343 across another reload, opening the station and flipping to Board. The three added lines were Vite connecting, Vite connected, and the React DevTools info line.

**Network.** Every Firebase request seen targeted 127.0.0.1:9099; no real-Google host was contacted. The pane keeps only recent requests and RTDB uses a WebSocket, so the store-versus-cloud comparison above is the sync proof.

## Surprises and notes

- **Double claim on first mount.** The station's first mount emitted two `CuttingClaimed(SP1, A)` events 61 ms apart, both in the cloud. It is idempotent in the fold. It is likely the React StrictMode double effect in the dev server, but I did not check a production build.
- **Hero choice follows queue order, not claim order.** In a duplicate-tag state the hero is the first tagged cut in the FIFO queue. My probes had claim order equal to queue order, so I did not exercise a mid-cut hero flip. The follow-on removes the UI route to it; a cross-device claim race could still produce it.
- **Phone count semantics.** On the phone scoped view, "3 cuts in queue" includes the other saw's cut as a muted sentence rather than a row (by design, #390).
- **Wrong RTDB namespace.** My first "RTDB root is null" check used the wrong namespace (`fieldshore-database`; the app uses `fieldshore-database-default-rtdb`). The emulator process was brand new, so it was empty regardless, and the later REST reads use the right one.

## Not tested

- Production build behaviour (StrictMode double-fire, layout effects).
- A second physical device or a real claim race between two devices.
- A real touch device (touch is emulated).
- The phone sliders themselves (I only read the phone layout, not operated the sliders).

## Teardown

- Wiped localhost:5200 site data from `/favicon.svg` (5 IndexedDB databases and 1 localStorage key removed, then verified empty).
- Closed tab-4; both servers stopped via `preview_stop`; ports 5200, 9000, 9099, 4000, 4400, 4500 and 5001 confirmed free with `lsof`.
- Left as found: tab-1 (parked on `http://127.0.0.1:5200/favicon.svg`) and the `seed` tab.
- Created `qa475@example.test` and one throwaway department, both emulator-only.
- Logged four task-observer observations (107 to 110) to `/Users/alex/.claude/skill-observations/log.md`.

## Evidence index (`.claude/audits/phase-j/step1-fixes/475/`)

- **Screenshots:** `00` to `09a`, in step order. Phone shots are 06, 06a, 09, 09a. Probe shots are 07 and 08.
- **Captured text:** `captured-text/00` to `09` (`*.json`) and `10-console-network-sync-and-cloud.txt`.
- **Fingerprints:** `00-env-start.txt`, `00-env-after-followon.txt`, `00-env-end.txt`.
- **Run log:** `commands.log`, a timestamped record of every step.
