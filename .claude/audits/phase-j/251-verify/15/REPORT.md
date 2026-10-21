# #251 verification, spec 15 (Secured / Returned)

- Date: 2026-10-21. HEAD 132001f (v4-redesign). No source edits, no state-changing git. Ports 5200/9000/9099 were free before; servers and browsers stopped after.
- Origins: device A http://localhost:5200 (Admin/IC, 390x844 touch phone; 1024x768 mouse for the mouse-form row), device B http://127.0.0.1:5200 (Default role member, no ICS position, 390x844 touch).
- Dept "QA Dept 15", rig "Rescue 2" (LS 203 x4, LS 304 x6, LS 406 x4, 6" Swivel x4, 6" Rigid x2, 12" extension x2) plus "Engine 1" (swivel x3, unused), op "QA Op 15" (Pending Card ON). Accounts qa251-15-1 (A) / -2 (B) @example.test.
- Setup: SP1 T-Shore 42" (LS 203 + Swivel plate), SP2 T-Shore 60" (LS 406), SP3 and SP4 3-Post 48" (LS 304 x3 each), SP5 T-Shore 42" (LS 203). Wood 4x4/4x4 on T-Shores, 6x6/6x6 on 3-Posts. All walked through the UI (deploy, Strut Set, Cutting, Cut Done, Runner). Plates and strut were all sourced from Rescue 2, so cross-rig BOM was not exercised.
- Console baseline: 2 messages before first sign-up. Screenshots: .claude/audits/phase-j/251-verify/15/shots/ (47 files). Scripts: scratchpad qa-251-15/s*.mjs.
- Touch phone gives slides; the 1024 mouse viewport gives buttons (matchMedia hover/fine true).

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 15-01 | Runner card controls | PASS | Touch: "Slide to set Wood Shore Secured" (56 px) + "Slide back to Cutting Station" (48 px), shot 04. Mouse: "Set Wood Shore Secured" + "Back" (compact label, see SPEC-DRIFT list), shot 43. |
| 15-02 | Advance, no modal, Secured opens | PASS | 0 dialogs; Runner 5 to 4, Secured 0 to 1; with Secured lane collapsed (aria-expanded false) the advance set it true (s21, shot 07). |
| 15-03 | Secured card controls | PASS | Touch: full-width "Remove & Return Equipment" (332x56) + "Slide back to Runner"; no forward slide (shot 05). Mouse: "Back" only, no forward button (shot 42). |
| 15-04 | Advance announcement | PASS (copy) | polite live region exactly "Shore point — now Wood Shore Secured." |
| 15-05 | Step-back no inventory change | PASS | No dialog, card back in Runner, polite "Shore point — back to Runner."; Rescue 2 rows identical before/after (LS 203 2 of 4, LS 304 0 of 6, LS 406 3 of 4, swivel 3 of 4). Shot 06. |
| 15-06 | Round trip repeatable | PASS | SP2 Runner to Secured to Runner to Secured twice: counts alternate 4/3, 1/2 correctly; 0 duplicate cards in the old lane; inventory still identical. |
| 15-07 | Modal title and buttons | PASS | role dialog, aria-modal true, title "Return equipment to inventory?", buttons Cancel, Confirm Return (+ Close X). Shot 08. |
| 15-08 | Modal body | PASS (copy) | "LS 203 — with its plates and extensions — will be returned, each piece to its source truck (the strut to Rescue 2)'s available count. This cannot be undone." Rig = Rescue 2 = BOM source rig (Quick View BOM: LS 203 Rescue 2). |
| 15-09 | Dialog a11y | PASS | Focus lands on Cancel; Tab cycles Cancel, Confirm Return, Close and wraps (also Shift+Tab); all inside the dialog; Escape closes and focus returns to "Remove & Return Equipment"; same after Cancel. |
| 15-10 | Cancel changes nothing | PASS | Lanes unchanged (runner 3 / secured 2 / returned 0), card still has both controls, inventory JSON identical to baseline, live region empty. |
| 15-11 | Confirm moves to Returned | PASS | Secured 2 to 1, Returned 0 to 1; Returned lane expanded; card at viewport y 501-639 of 844 (in view). Shot 09. |
| 15-12 | Return announcement | PASS (copy) | polite "LS 203 returned to Rescue 2." (SP3 leg: "LS 304 returned to Rescue 2."). |
| 15-13 | Inventory on submitting device | PASS | LS 203: 2 of 4 to 3 of 4; Swivel plate: 3 of 4 to 4 of 4 (quantity totals unchanged, derived availability). Later returns: LS 304 0 to 1 (SP3 leg), LS 406 3 to 4 (SP2), LS 203 3 to 4 (SP5). Shot 11. Cross-rig plate source not exercised. |
| 15-14 | Returned card terminal | PASS | Text "✓ Equipment returned", keeps "#1 Div 1 · A SP1 · T-Shore 33 1/2″ CUT LS 203"; only button is the card head (Quick View); no slide, no Remove & Return, no Capture location. Source rig visible in Quick View BOM. |
| 15-15 | No step-back from Returned | PASS | Card has no control; Quick View has only Close; no re-deploy control. |
| 15-16 | End Operation count | PASS | With Secured 3 points + Runner 2 + Returned 2 (+2 pending legs, equipment released): alert "5 shore points still hold equipment — Rescue 2 (5)". Returned excluded (including it would read 7), Secured included. Cancel left no dialog. Shot 27. |
| 15-17 | Cross-device return | PASS | B (no refresh) saw Returned 0 to 1 / Secured 2 to 1 in 411 ms; B inventory identical to A (LS 203 3 of 4, swivel 4 of 4); no toast (B live region empty, no dialog); Notification hook recorded 0 calls during the move, positive control `new Notification('x')` recorded. Shots 10, 14. |
| 15-18 | Cross-device Secured advance/back | PASS | SP5 advance on A: B Secured 1 to 2 in ~3 ms-poll (first poll); step-back: B Secured 2 to 1, SP5 card in B Runner. Shots 15, 17. |
| 15-19 | Command roll-up | PASS | By Division table headers Pend/Assign/Set/Cut/Run/Secured/Ret'd (aria-labels full names); All-incident tiles read Secured 2, Returned 1 after advance, Secured 1 after step-back; table Secured 1, Ret'd 1 vs board. Tiles use full words "Wood Shore Secured" / "Strut Equipment Returned". Shots 16, 18. |
| 15-20 | Concurrent return race | PASS | SP2 Secured; both modals open; B offline confirm, A online confirm. Cloud log: EquipmentReclaimed from A at receivedAt ...099045, from B ...100567. After reconnect both devices show one Returned SP2 card; LS 406 3 to 4 of 4 exactly once on both; B shows "Synced — 1 of your changes had no effect" (no modal). |
| 15-21 | Offline return | PASS | B offline (goOffline + offline event): confirm commits locally, 0 dialogs, banner "Offline — 1 change saved on this device — will sync when you reconnect", polite "LS 203 returned to Rescue 2."; B local inventory showed LS 304 3 to 4 of 6 before reconnect (second run, SP3 leg 2); events reached the cloud only after reconnect (receivedAt after goOnline); A matched. Shots 35-37. |
| 15-22 | Grouped, individual | PASS | SP3 legs 1-3 Secured; return leg 1: legs 2/3 and 3/3 stayed Secured (stack front became POST 2/3); LS 304 0 to 1 of 6 (only leg 1's strut). Shots 19-21. |
| 15-23 | Role gate | SPEC-DRIFT | B (Default role, no ICS position: "Set role" shown) did Runner to Secured, Secured to Runner, Secured to Runner again, advance, and Remove & Return Equipment; no block text, `.fs-slide-reason` 0, no assertive/alert content. ADR-017 line 40: "A department role never gates a fireground action." Caveat: line 39 of the same ADR says ICS positions gate fireground actions (secure/return) and no position gate exists in the build. Shots 38, 39. |
| 15-24 | External equipment copy | Deferred | not driven (mutual-aid plumbing, spec 32 / #493). |
| 15-25 | Step-back vs open modal | PASS | B opened return modal on SP2; A slid back to Runner; B dialog closed itself (count 0 on first poll); B lanes Runner 3 / Secured 1; LS 406 unchanged 3 of 4; no return event. Shots 28, 29. |
| 15-26 | Touch targets | PASS | Remove & Return 332x56, Cancel 120x56, Confirm Return 134x56, Close X 44x44, Secured step-back slide 332x48 (touch). |
| 15-27 | Modal styling | PASS | Confirm Return class `fs-button--primary fs-button--destructive` (red), Cancel `fs-button--secondary`; both at viewport y 483-539, fully visible at 390x844. Shot 08. |
| 15-28 | Quick View of Returned | PASS | Drawer opens, no crash; shows header "Strut Equipment Returned", measurement/BOM, TIMELINE through "Equipment returned"; only control is Close. Shots 12, 13. |
| 15-29 | Sunlight | PASS | data-theme sunlight; lane header text 21:1, count chip 19.1:1, card text 21:1, "✓ Equipment returned" 10.27:1; screenshots legible (Secured/Returned headers and cards dark on light). Scripted ratio 1.01 for the step-back label is a transparent-background artifact; label clearly readable in shot 40. Theme reset to System after (resolves to light in headless). |
| 15-30 | Re-cut flag on Secured | PASS | SP4 leg 1 Secured, legs 2/3 to Pending via cutting/strut set/assigned (Return All & Step Back), Edit wood 6×6 to 4×4, "Update all legs". Secured card: "⚠ Re-cut: cut length changed after Cut Done", hero 35 1/2″ to 39 1/2″, still shows "Remove & Return Equipment" and "Slide back to Runner"; unflagged SP2 card no chip. Step back: Runner card has chip, caption "Re-cut before securing. Slide back to the Cutting Station.", only "Slide back to Cutting Station" (no Secured slide). Station hero "Slide to mark Re-cut Done", then send to Runner, then Secured slide available again and advance succeeded. Shots 22-26. Return on the flagged card itself was not confirmed. |

## FAIL repro
None.

## SPEC-DRIFT list
- 15-23: no role/position gate on Secured advance or Remove & Return; ADR-017 line 40. Tension with line 39 noted; not filed as a security bug.
- 15-01 / 15-03 mouse form: step-back label is "Back" (not "Back to Cutting Station" / "Back to Runner"); documented in Slider.tsx mouse-branch comment (compact Back on mouse). Touch labels match the brief. Recorded under PASS.

## Console notes
- Baseline 2. After the mark only the known `Transition was aborted because of invalid state` pageerror on route change (first sign-up script); every per-script error list on A and B otherwise empty. No prod-host hits (route and websocket guards for firebaseio/identitytoolkit/securetoken were active).
- Observation (not a criterion): after the race in 15-20, B's banner "Synced — 1 of your changes had no effect" stayed on screen through later successful syncs (offline return, step-back/advance as member, Command tab). It looks sticky rather than per-sync; possible minor copy/state finding.
- Two two-context scripts (s33, s36) hung on shutdown, as in specs 13/14; state was verified from a fresh script and the emulator event log afterwards. Rerun logic passed.
- Not driven: Remove & Return from the flagged re-cut card, cross-rig plate returns (all pieces came from Rescue 2).

## Deferred, not driven
15-24 External (visiting-department) equipment copy (spec 32 / #493).
