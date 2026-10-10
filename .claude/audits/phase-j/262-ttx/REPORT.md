# #262 Tabletop exercise — run report

**Date:** 2026-10-09/10 · **Scenario:** Level IV, URM strip-mall partial collapse, 822 Dixwell Ave, Hamden CT (Millbrook inventory) · **Operator:** Fable (main loop) with a three-device Playwright driver; Alex signed in on the beta for the two live-backend probes · **Gate owner:** Alex (this report recommends; it does not close #262).

## 1. Scope and environment

| Item | Value |
|---|---|
| App under test | `v4-redesign` @ `cd8bdd4` (includes the pre-TTX safety mini-batch `2b8c5c5..06d98cc` and the emulator wiring `74780f0`) |
| Backend, probes 1–7, 10, 12 | Local Firebase emulators — Auth 127.0.0.1:9099, Realtime Database 127.0.0.1:9000, namespace `fieldshore-database-default-rtdb`, rules = this branch's `database.rules.json` (sha256 `5fca2650…`), firebase-tools 15.23.0 |
| Backend, probes 8–9 (live half) | The beta channel `fieldshore-database--beta-2rs8x80s.web.app` against the live `fieldshore-database` project, in the built-in browser pane under Alex's own sign-in |
| Devices | A = Incident Commander's phone, B = second member's phone (Playwright iPhone 13 emulation, touch → status slider), C = cold reader, 1280×800 desktop (mouse → button path). Chrome 154 via Playwright 1.53 `channel:'chrome'` |
| Accounts | Three self-sign-ups on the Auth emulator (BC R. Alvarez = A/creator/Admin, Capt. D. Brennan = B, Lt. K. Chen = C); passwords in a gitignored fixture, never printed |
| Prod fence | Every context aborted `*.firebaseio.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `*.firebaseapp.com`: **0 hits** |
| Driver run | `driver.mjs`: 68 steps OK, 0 skipped; 96 captures; 15 evidence dumps; `results.json`, `run-log.txt` |

**Scene built before any probe:** department created and joined by code; Millbrook CSV imported (12 rows, Engine 1/2 + Rescue 1 provisioned) plus BC-1 added; operation "Dixwell Ave Strip Mall Collapse" at 822 Dixwell Ave; 5 single T-Shores (Alpha–Echo) + one 3-Post (Foxtrot) = 8 cards; Engine 1 → Shoring Group Supervisor, Lt. M. Okafor → Safety Officer; Alpha/Bravo/Charlie deployed, Charlie to Strut Set, Foxtrot's three legs to Cutting Station.

## 2. Coverage matrix

| # | Checklist item | A | B | C | Network conditions exercised | Result |
|---|---|---|---|---|---|---|
| 1a | Transfer to a named member, recipient offline at initiation | ✓ | ✓ offline→online | ✓ | B offline during initiation | **PASS** |
| 1b | Transfer to a rig with 4-digit code; wrong code; single-device hand-the-tablet (#401) | ✓ | ✓ | ✓ | online | **PASS** |
| 1c | Cancel-vs-accept race, initiator offline | ✓ offline→online | ✓ | ✓ | A offline during cancel | **FAIL** (F1) |
| 2 | Brief at realistic elapsed (02:41) and >24 h (1d 03:12) | ✓ | ✓ | ✓ | online | **PASS** |
| 3 | Span-of-control badge at 6 and 8 direct reports | ✓ | ✓ | ✓ | online | **PASS** |
| 4 | Sync race: opposite status moves from the same base | ✓ offline→online | ✓ | ✓ | A offline | **FAIL** (F2) |
| 5/11 | Quick View cold read of connectors | — | — | ✓ | late join | **PARTIAL** (F5) |
| 6 | Concurrent HIGH hazards logged offline on two phones | ✓ offline→online | ✓ offline→online | ✓ | A and B offline | **PASS** chip/log · **FAIL** card badge (F4) |
| 7 | Broadcast wall-board (C-13) | — | — | — | — | **N/A** — never built, deferred past v4.0 (#496) |
| 8 | Places suggestions on the beta | beta pane | — | — | live | **PASS** after the Maps-key allowlist fix (first attempt blocked by key config) |
| 9 | Feedback lands | ✓ emulator | — | — | emulator + live (beta pane) | **PASS** both |
| 10 | Inventory CSV round trip | ✓ | — | — | online | **PASS** (12 rows, identical IDs, counts unchanged) |
| 12 | C-1 probe: concurrent deploy of one pending point | ✓ | ✓ | ✓ | online, simultaneous | **PARTIAL** (F3) |

Not exercised: a fourth device cold-joining after the races (would show whether a full-log replay double-applies F3's duplicate deploy); physical signal loss (simulated by cutting the database socket, verified via `.info/connected` = false on each offline step).

## 3. External-dependency probes

| Dependency | Where | Result |
|---|---|---|
| Google Maps JS + Places | emulator run (:5200) | Script loads (key in build); Places RPC **403** — key referrer-locked to the beta host, expected locally |
| Google Maps JS + Places | beta | **RefererNotAllowedMapError** until Alex added the beta host to the **Maps** key; then 5 suggestions ("822 Dixwell Avenue, Hamden, CT, USA") |
| Firebase web API key | beta + REST probe | Identity Toolkit answered "Requests from referer … are blocked" for every origin except the beta host: the website restriction intended for the Maps key had been applied to the Firebase browser key. Sign-in from phones, old links, the live domains and local dev was broken until Alex added the live domains and `localhost:5199/5200` (**ops incident, F8**) |
| what3words | not called by the scene (no Capture location taps) | known 402 QuotaExceeded in prod until the plan is bought (#492) |
| Firebase emulators | all three devices | 200 websockets; `.info/connected` toggled correctly on every offline/online step |

## 4. Per-probe evidence

Captures are `NN-<probe>-<device>.jpg` in this folder; data dumps in `evidence/`.

- **1a** `30-38`: B's offline banner; A's "Transfer pending → Capt. D. Brennan"; C sees only the pending state; B's targeted "You are being given command" after reconnect; IC = Brennan on all three; audit log Initiated + Accepted.
- **1b** `39-45, 58-61`: code 7973 on B; C "Tap if this is you" → wrong code rejected ("That code doesn't match — check it with the outgoing commander.") → right code → IC = Engine 1 on all three; C hands to its own account and accepts on the same device → IC = Lt. K. Chen on all three.
- **1c** `62-68` + `late-recheck`: A cancelled offline, B accepted online; after reconnect **A = Lt. K. Chen, B = C = Capt. D. Brennan**; unchanged after 30 s and reload.
- **2** `46-57`: Ops header "02:41:05 elapsed", Command "2h 41m", brief "Elapsed 02:41:11", on A, B, C; C at 1d 03:12 / 27h 12m. No truncation.
- **3** `16-21`: "Span 6 · caution" then "Span 8 · over" on the node and the node sheet, on A, B, C.
- **4** `69-74` + `late-recheck`: **A: Alpha Strut Set, Rescue 1 AT 56-88 0/2 · B, C: Alpha Pending, Rescue 1 AT 56-88 1/2**; unchanged after 30 s and reload.
- **5/11** `86-89`: Bravo shows "Not recorded" (header/footer) and "6″ Swivel Base" ×2; Foxtrot leg shows 6×6 wood and "Not recorded" plates; **Charlie shows no connector rows at all**.
- **6** `75-85`: both hazards in the log on all three ("A teammate"/"You" attribution correct); "2 open · HIGH" on Operations, Command and the entry chip on A, B, C; no card badge anywhere.
- **8** `beta-probes/08-*.jpg`, `probe8-places-beta.json`; **9** `evidence/9.json`, `beta-probes/probe9-feedback-beta.json`, `live-feedback.json`.
- **10** `04-08`, `evidence/10.json`, `p10-export-1.csv` = `p10-export-2.csv`.
- **12** `22-29`, `evidence/12.json`: two `EquipmentDeployed` events in the shared log 5 ms apart for the same inventory row; A holds only its own, B and C only B's; boards and Quick View identical.

## 5. Findings

Every finding below was challenged by three independent reviewers (test-harness-artifact lens, root-cause lens, fireground-impact lens; verdicts in `evidence/verification-verdicts.json`). **None was refuted.** Severity is the main loop's call after reading all three.

| # | Finding | Severity | Blocks cutover | Issue |
|---|---|---|---|---|
| F1 | Transfer cancel-vs-accept race leaves two Incident Commanders of record, permanently and silently (A: Lt. K. Chen; B, C: Capt. D. Brennan). Root cause: events fold in each device's local append order; the Accepted/Cancelled fold is non-commutative; no canonical order, no conflict signal. | **Critical** | yes | #499 |
| F2 | Opposite status moves from the same base (offline Strut Set vs online return-to-Pending) diverge permanently **and split inventory** (Rescue 1 AT 56-88 0/2 vs 1/2). Same root cause as F1 plus premise-gated drops of peer events and stock mutated in the local commit rather than derived from the log. | **Critical** | yes | #499 |
| F3 | Concurrent deploy of one pending point writes two `EquipmentDeployed` events for one inventory unit; each device keeps a different one; boards agree today, the shared log and audit trail do not, and a cold-joining device replays both (audit C-1 reproduced). | Medium | no | #500 |
| F4 | Shore-point card hazard badge is unwired: hazards and the "2 open · HIGH" chip propagate everywhere, no card is badged. Regression from merge `73e95a1` (dropped the #394 wiring); the card prop still exists. | High | yes (small fix) | #501 |
| F5 | Quick View hides all four connector slots when every deduction is `'none'`; a cold reader cannot tell "no connectors" from "not recorded" (card.md: every slot always shown). | Medium | no | #502 |
| F6 | `feedback-review` skill reads the v3 project; v4 feedback (verified live) never reaches triage. | Low (process) | no | #503 |
| F7 | The beta stamps `appVersion = v4.0.0-slice.1` (package.json never bumped since Phase I slice 1). Cosmetic until the v4.0.0 tag (#268). | Low | no | — (part of #268) |
| F8 | Ops incident during the run: the Maps-key website restriction was applied to the **Firebase browser key**, blocking sign-in from every origin except the beta host until the live domains and localhost were added back. Documented in the follow-ups; no code change. | — | no | — |

Also recorded, not findings: page error "Transition was aborted because of invalid state (ViewTransition)" once per device on first navigation (cosmetic; worth a look when touching the router); the self-handover to an account target shows a 4-digit code it does not need (ADR-021 says account/device targets get no code) — minor doctrine drift, folded into #499's handshake rework.

## 6. Recommendation

**Do not close #262 yet.** The exercise did its job: eight checklist items pass end to end on a three-device run with real sign-ups, real security rules and real offline cuts, and the two live-backend items pass on the beta. But two Critical convergence defects (#499) mean two phones can silently disagree on who holds command and on where a strut is, exactly in the offline-then-reconnect scenario the gate exists to test. Recommended sequence: fix #499 (canonical event order + unconditional append + derived inventory) and #501 (hazard badge wiring), then re-run only probes 1c, 4, 6 and 12 with the committed driver; close #262 when those three show identical state on A, B and C. #500 and #502 can ride the same fix window or v4.0.1; #503 is a skill edit.

**Checklist scoring:** 8 PASS (1a, 1b, 2, 3, 8, 9, 10, and 6's log/chip half) · 2 FAIL (1c, 4) · 2 PARTIAL (5/11, 12) · 1 FAIL-feature (6's card badge) · 1 N/A (7).

## 7. Follow-ups

- **Alex:** decide #262 (close, or keep open until F1/F2 are fixed and re-run); #492 what3words plan.
- **Ops note (F8):** key hygiene — the Firebase browser key keeps `localhost:5199/*`, `localhost:5200/*`, the two live domains and the current beta host; the beta entry needs updating when the channel rotates (30 days without a push).
- **Re-run recipe:** `npm run emulators`, `npm run dev:emu`, `node .claude/audits/phase-j/262-ttx/driver.mjs` (README in the folder). Probes 1c, 4 and 12 are the regression checks for the fixes.

## 8. Addendum — 2026-10-10 re-run on the #499 build (ADR-041)

Same harness (emulators + `driver.mjs`, updated for ADR-041: canonical evidence sort, `receivedAt`/`batchId`/`transferId` in `liteEvent`, stock derived as `quantity − held`), full run, 412 s. The `evidence/` folder, `results.json` and `run-log.txt` now hold THIS run; the morning run that produced F1–F3 (its evidence and 96 JPEG captures) is preserved in git at `2c60a2f`. The re-run's 96 PNG captures (25 MB) are kept out of the repo at `~/Documents/FieldShore-backups/262-ttx-rerun-2026-10-10-captures/`; the fidelity screens are in `../499-shots/`.

| Probe | Reading on A / B / C | Events per device | Result |
|---|---|---|---|
| 12 (concurrent deploy, F3 / #500) | Delta deployed; both `EquipmentDeployed` present in all three logs; Eng 1 AT 56-88 0/2 | 26 / 26 / 26 | identical — converged |
| 1c (transfer cancel-vs-accept, F1) | IC = Capt. D. Brennan (B's accept reached the cloud first; A's offline cancel lost); no pending transfer | 35 / 35 / 35 | identical — converged |
| 4 (opposite status moves, F2) | Alpha = Pending Equipment; R1 AT 56-88 1/2 (B's return reached the cloud first; A's offline Strut Set lost) | 37 / 37 / 37 | identical — converged |
| 6 (concurrent hazards) | both hazards on all three | 39 / 39 / 39 | identical |
| late re-check (30 s) | unchanged on all three | — | stable |

Losing branch surfaced (device A only, read from the live banner — the driver does not capture it): after probe 4 "Synced — 1 of your changes had no effect · #1 · Alpha — now Pending Equipment · Your Strut Set had no effect. Another device returned equipment to inventory while you were offline."; after 1c "Incident Commander — Capt. D. Brennan · Your cancel had no effect. Capt. D. Brennan accepted command while you were offline." B and C show nothing. Screens: `../499-shots/7a-sync-line.png`, `7a2-sync-line-1c.png`, `7b-timeline.png`, `7d-role-history.png`, `7e-end-op.png`.

Errors: no `PERMISSION_DENIED`, no `receivedAt` rejections, prod-fence hits 0. Regression vs the morning run: none (same 15 probes recorded; 7 and 8 skipped as before).

Findings status: **#499 fixed** (F1 + F2 converge; proof also in `src/data/store/convergence.test.ts`, 3,000 seeds); **#500 converges** (F3: both deploys now in every log, same state everywhere); **#501** (card hazard badge) untouched — next; #502, #503 untouched. Recommendation unchanged in shape: close #262 after #501 lands and Alex reviews the surfaced-loss UX on his own phone.
