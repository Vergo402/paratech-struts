# #251 verification, spec 16 (End of operation / archive / after-action)

- Date: 2026-10-21. HEAD 5a6f4e5 (v4-redesign). No source edits, no state-changing git. Ports 5200/9000/9099 were free before; dev server and emulators stopped after.
- Origins: device A http://localhost:5200 (Admin, 390x844 touch phone; 1024x768 mouse for the deck check), device B http://127.0.0.1:5200 (Default role member, 390x844).
- Dept "QA Dept 16", accounts qa251-16-1 (A) / -2 (B) @example.test. Rigs Rescue 2 (LS 203 x2, LS 406 x2, swivel x2) and Engine 1 (LS 203 x2, LS 304 x3, swivel x2). Op "Cascade Building Fire": SP1 Returned (Rescue 2), SP2 Secured (Rescue 2), SP3 Strut Set (Engine 1), SP4 Assigned (Engine 1), SP5 Pending (no equipment). Later "Second Op" (1 pending point, State R) and "Third Op" (1 deployed point, singular).
- Console baseline 2 before the first load. Screenshots: .claude/audits/phase-j/251-verify/16/shots/ (40 files). Scripts: scratchpad qa-251-16/s*.mjs.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 16-01 | End Operation last on Command | PASS | Phone: column order ... Hazards, Resource roster, "End Operation" last (shot 11). 1024px: button is last child of `.fs-cmd-deck-rail` (shot 41). Label "End Operation". |
| 16-02 | Destructive style, >=44px, themes | PASS | class `fs-button--secondary fs-button--destructive`, height 56 px. Contrast: dark 6.79, light 5.99, sunlight 8.31 (shots 12-*). |
| 16-03 | Gate = manageOperations, not IC | SPEC-DRIFT | ADR-017 #3 / #380 (code comment in EndOperationButton.tsx). B (Default role) accepted IC via Transfer: no End Operation on /command or /operations (shot 29). A (Admin, not IC): button present (shot 30). |
| 16-04 | Hide-not-grey | PASS | B /command and /operations: 0 buttons named End Operation, no disabled button with that text, no aria-label match; positive control A has 1. Shots 24, 25. |
| 16-05 | Second entry at board foot | PASS | /operations foot: siblings "Begin Briefing", "End Operation", tertiary destructive 56 px; same dialog, same warning (shots 14, 15). |
| 16-06 | Modal title/body | SPEC-DRIFT | Title "End Operation?"; body "This archives every shore point and ends the active operation. You can start a new one afterward." Cited: ADR-036. role dialog, aria-modal true. |
| 16-07 | No "cannot be re-opened" | SPEC-DRIFT | Text absent in State D, State R and both entries. ADR-036. |
| 16-08 | Cancel default focus, button order | FAIL | State D: initial focus lands on the "All equipment is back on the rigs" checkbox (INPUT checkbox), not Cancel (both Command and board-foot dialogs). State R (no checkbox): focus on Cancel. Order Cancel (leading) then End Operation OK. See FAIL repro. |
| 16-09 | Focus trap, Esc, scrim | PASS | Tab cycles Cancel, End Operation, Close, checkbox and wraps, all inDlg true; Shift+Tab same; Escape closes, focus returns to the opener, op unchanged; tap outside (5,5) closes, op unchanged. |
| 16-10 | Cancel changes nothing | PASS | Cancel: dialogs 0, board unchanged; /audit-log before ending has no "Operation ended" row (positive control: shore-point rows present). |
| 16-11 | State D alert with rig counts | FAIL (copy/minor) | Alert "3 shore points still hold equipment — Engine 1 (2), Rescue 2 (1)" with Returned SP1 excluded, Secured SP2 included: correct. Singular reads "1 shore point still hold equipment" (grammar: "hold" not "holds"; brief expects "holds"). Shot 35. Source: EndOperationHolds.tsx hard-codes "hold". |
| 16-12 | Warning does not block | PASS | Confirm enabled with warning showing and box unchecked; ending succeeded (s13). |
| 16-13 | State R: no warning, no checkbox | PASS | Second Op with only a pending point: no role=alert, no checkbox (shot 33). Positive control: State D shows both. |
| 16-14 | Checkbox default unchecked, resets | SPEC-DRIFT | ADR-041 D5 / #499. Unchecked on open; checked, Cancel, reopen: unchecked again. |
| 16-15 | Checkbox inventory effect | SPEC-DRIFT | ADR-041 D2. Baseline Engine 1 LS 203 0 of 2, Rescue 2 LS 203 1 of 2. End unchecked: unchanged. End checked: Engine 1 LS 203 2 of 2, Rescue 2 LS 203 2 of 2. |
| 16-16 | "N shore points - N personnel" summary | NOT-BUILT | Modal text has no summary line; no later decision found. |
| 16-17 | Confirm closes modal, empty state | PASS | Per-frame timeline: dialog gone and "No active operation" present in the same frame (26 ms to 53 ms), no stale board text; Operations shows "No active operation" + "Start Operation". Shots 17, 18. |
| 16-18 | Past operations card | PASS | "Cascade Building Fire / Ended Oct 21, 1:19 PM · 5 shore points"; singular "1 shore point"; with three ended ops newest first (Third, Second, Cascade). Shots 18, 34. |
| 16-19 | Command after end | PASS | "No active operation ... Go to Operations"; End Operation count 0 (shot 17). |
| 16-20 | Archive keeps statuses | PASS | Drill-in lanes Pending 1 / Assigned 1 / Strut Set 1 / Secured 1 / Returned 1, same points as before ending (shot 19). |
| 16-21 | Drill-in | PASS | Back button "Back to past operations", title = op name, role=status banner "Viewing a closed incident — read-only", status lanes (shot 19). |
| 16-22 | Read-only drill-in | PASS | 0 slides, no FAB / Add Shore Point / Assign / Deploy; only card head buttons; tap opens Quick View drawer with only a Close button (shot 20). Positive control: live board has slides and buttons. |
| 16-23 | Re-open button + modal | SPEC-DRIFT | ADR-036. "Re-open this incident?" with Cancel (focus on Cancel) and Re-open; Cancel leaves it archived (shot 21). Authority is any connected device (ADR-036), B Default role sees the button. |
| 16-24 | Re-open restores | SPEC-DRIFT | ADR-036. Board back with same lane counts, Command shows End Operation, Past list gone; audit log "Operation re-opened" (shots 22, 37). |
| 16-25 | Re-open unreachable while another op active | SPEC-DRIFT | ADR-036. With Second Op active: Past operations section 0, Re-open buttons 0. Two-device start race (optional) not driven. |
| 16-26 | End+re-open restores held stock | SPEC-DRIFT | ADR-041 D5. Checked-end restored full counts; Re-open dropped them again (Engine 1 LS 203 0 of 2, Rescue 2 LS 203 1 of 2). |
| 16-27 | Audit Log rows | PASS | /audit-log for the op: "Operation ended" / "Operation re-opened" rows in correct order across three cycles (shot 37); archive remained readable. |
| 16-28 | Cross-device end | PASS | B (no refresh) showed empty state 59 ms after A confirmed, with the op under Past operations (shot 26). |
| 16-29 | Offline B after A ended | SPEC-DRIFT | ADR-041. B offline advanced SP4; on reconnect banner "Synced — 1 of your changes had no effect"; audit log "Shore point 4 → Strut Set — no effect"; archive on A and B unchanged (SP4 still Assigned). Shots 31, 32. |
| 16-30 | End announcement | NOT-BUILT | Live-region observer saw nothing after confirm on A and B; no "Operation ended" announcement string exists in src/ui or src/app (only audit describe.ts). Positive control: same observer captured "Shore point — now Strut Set." on an advance. |
| 16-31 | Accessible name | SPEC-DRIFT | Name is plain "End Operation" (no aria-label, describedby or title); no IC-only note, consistent with the ADR-017 gate change. |
| 16-32 | Admin toggle | PASS | Settings > Administration > Dept policies: "Send after-action record by email", on by default, helper "... Email delivery turns on in a later release — this saves your preference now."; off persisted across reload; restored to on. B (Default role): control not present (shot 40). |
| 16-33 | After-action email send | Deferred | #495 / ADR-018 addendum. |
| 16-34 | No push/toast to other devices | PASS | During A's end B had 0 dialogs, no toast/live-region, 0 Notification calls or permission requests; positive control `new Notification('x')` + requestPermission recorded. |

## FAIL repro
- 16-08: Operations tab (or Command tab) with at least one shore point holding equipment, as an Admin. Tap End Operation. Observed: document.activeElement is the checkbox "All equipment is back on the rigs". Expected: Cancel. Cause: `<span data-modal-cancel>` sits inside the Cancel Button (EndOperationButton.tsx:49, OperationsBoard.tsx:1759); Modal.tsx onOpenAutoFocus (lines 78-87) only handles a marker that is a focusable element or contains one, so it falls through to Radix's first-focusable. Not seen in State R because there Cancel is the first focusable.
- 16-11 (copy/minor): same dialog with exactly one holding point: "1 shore point still hold equipment — Rescue 2 (1)"; should be "holds". Fix area EndOperationHolds.tsx (alert copy).

## SPEC-DRIFT list
16-03 (ADR-017 #3 / #380), 16-06 and 16-07 (ADR-036), 16-14 / 16-15 / 16-26 (ADR-041 D5 / #499), 16-23 / 16-24 / 16-25 (ADR-036), 16-29 (ADR-041), 16-31 (ADR-017 gate). All observed behaviour matches the Superseded table.

## Console notes
- Baseline 2. After the mark only the known `Transition was aborted because of invalid state` pageerror on the first sign-up route change; every per-script error list on A and B otherwise empty. Prod-host route/websocket guards active, no hits.
- Observation, not a criterion: the "Synced — 1 of your changes had no effect" banner stayed on B after navigating to /settings/administration minutes later (same stickiness noted in spec 15).
- Observation: Past operations drill-in is not gated by permission (Default role sees Re-open); consistent with ADR-036 "any connected device".
- Not driven: two-device active-op race producing a "superseded" Past row (16-25 optional), Sunlight check of the modal itself.

## Deferred, not driven
16-33 After-action email send (#495 / ADR-018 addendum).
