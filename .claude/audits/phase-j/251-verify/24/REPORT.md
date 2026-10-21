# #251 verification, spec 24 (TCRM briefing)

- Date: 2026-10-21. HEAD cd55558 (v4-redesign), no source edits, no state-changing git. Ports 5200/9000/9099 free before; servers stopped after.
- Origins: device A http://localhost:5200 (Reyes, Admin/IC, 390x844 touch), device B http://127.0.0.1:5200 (Okafor, member, default role, no manage-ops), profile C = Reyes signed in on 127.0.0.1 (second admin device).
- Dept "QA Dept 24", accounts qa251-24-1 / qa251-24-2 @example.test. Rig "Rescue 2" stocked LS 610 x4, LS 406 x4 by CSV import. Ops "Warehouse Collapse" (briefing criteria) and "Second Op" (never-briefed criterion 24-19).
- Console baseline 2 (vite debug) before first load. After the mark: 0 error-level messages and 0 failed (>=400) responses on A and B in every script; one known-noise "Transition was aborted because of invalid state" on C's route change. Positive control for the "no toast on other device" check: the same MutationObserver caught the offline banner (role=status "Offline - will sync when you reconnect") when C went offline.
- Screenshots: .claude/audits/phase-j/251-verify/24/shots/ (38 files, 00-37). Scripts: scratchpad qa-251-24/*.mjs.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 24-01 | Begin Briefing label, not Open | PASS | Board foot (beside End Operation) button text "Begin Briefing"; 0 "Open Briefing" buttons; 0 briefing events before tap (shot 03). |
| 24-02 | Button, no navigation | PASS | location.pathname /operations before and after the tap. |
| 24-03 | Full-screen form modal | PASS | role=dialog `.fs-modal--form`, aria-modal true, title "Risk briefing (ORM / TCRM)", Close (X) button and footer End Briefing; not a bottom sheet. Caveat: it is a centered card 358x717 inside 390x844 (16px gutters), not edge-to-edge (shot 04). |
| 24-04 | Started stamp | PASS | "Briefing started 15:16"; wall clock at tap 15:16 (24h, no seconds). |
| 24-05 | Four steps visible | PASS | Explain the plan and assignments / List the known hazards / Ask the crew for input / Speak - anyone can stop the operation all visible, no collapsed section (only section Crew questions, aria-expanded=true). Baseline wording per S1. |
| 24-06 | Crew questions 0 / 5 | PASS | Section header "Crew questions" count "0 / 5", aria-label "Crew questions, 0 of 5 complete", five "Does everyone...?" rows visible; 0 progress/progressbar elements. |
| 24-07 | Row attest + signature | PASS | Tap "Explain the plan..." -> aria-checked true, box is-checked with svg, caption "Rescue Group Supervisor . 15:17" (shot 06). |
| 24-08 | Signature role = position / fallback | PASS | My role Rescue Group Supervisor -> "Rescue Group Supervisor . 15:17"; after Clear my role -> "Unassigned . 15:18" (fallback string, not blank); B as Safety Officer -> "Safety Officer . 15:27"; B with no role -> "Unassigned . 15:25"; Reyes by account only -> "Incident Commander" (shots 10). |
| 24-09 | Uncheck, no confirm | PASS | Re-tap "Does everyone know the signals?" -> aria-checked false, caption gone, only the briefing dialog present (0 alertdialog), count 2/5 -> 1/5 (shot 08). |
| 24-10 | Counts, no bulk | PASS | 0/5 -> 2/5 ("Crew questions, 2 of 5 complete") -> 1/5 after uncheck. Header tap only toggles aria-expanded (collapse hides rows, re-expand keeps checks); 0 complete-all/mark-all/check-all controls. |
| 24-11 | Tap target >= 56 | PASS | Leaf and section heads 56 to 57px tall at 390 wide; taps at the right edge and top-left corner of a row both toggle it (whole row tappable). |
| 24-12 | Tap only | PASS | One tap checks; 0 `.fs-slide`, input[type=range], role=slider in the dialog. |
| 24-13 | ARIA | PASS | Rows role=checkbox with aria-checked false -> true -> false; section head aria-label "Crew questions, N of 5 complete". |
| 24-14 | Focus trap, Esc, focus return | PASS | On open focus = first row (inside dialog); 30 Tab + 30 Shift+Tab never left the dialog (12 distinct stops incl. End Briefing, Close); Esc closes and activeElement = "Open Briefing" button; X close also returns focus to that button. |
| 24-15 | End closes, entry resets | PASS | End Briefing -> 0 dialogs, label "Begin Briefing", focus on that button, BriefingEnded event (shot 14). Probe: at +21 ms after the tap the modal body vanishes (only title + End Briefing remain) while the dialog stays at opacity 1 until about +238 ms (brief empty-card flash on exit; cosmetic, `briefing` goes null before the fade finishes in OrmBriefingModal.tsx). |
| 24-16 | Audit log after End | PASS | /audit-log (IC): "Briefing ended", attestation rows, "Briefing started", each "Checklist" badge, actor "You", times 03:16 to 03:19 PM; IndexedDB events match: Started, Checked x3, Unchecked, Checked, Ended (shots 11, 15). |
| 24-17 | End with zero rows | PASS | Begin then End immediately: 0 dialogs/alerts, label back to Begin Briefing, events Started + Ended. |
| 24-18 | Never gates (briefing open) | PASS | Briefing session active (button "Open Briefing"), closed modal, opened Assign Equipment, Deploy LS 610 (lane Pending -> Assigned), slid to Strut Set (Assigned -> Strut Set); 0 prompts, 0 native dialogs, briefing events unchanged (shot 13). |
| 24-19 | Never gates (never briefed) | PASS | "Second Op" with no briefing ever (label Begin Briefing): Save as Pending, deploy, slide to Strut Set all worked, 0 dialogs, briefing events 18 -> 18 (shot 35). |
| 24-20 | No countdown | PASS | Dialog text byte-identical over 6 s; no second/remaining/timer/elapsed words; 0 running infinite animations; only start stamp + attestation stamps. |
| 24-21 | X without End | SPEC-DRIFT | X closes the surface; button then reads **Open Briefing**, IndexedDB/audit log keep "Briefing started" (R1 confirmed), so the session stays active; spec says "no session recorded". Named by code comments: useBriefing.ts L28 "Resume the active session rather than spawn a duplicate", OperationsBoard.tsx "resumes the active session or starts one", OrmBriefingModal.tsx header "Begin/End bracket the session"; brief R1. No ruling in the Superseded table, so Orchestrator may prefer FAIL. |
| 24-22 | Reopen same session | PASS | After X then Open Briefing: "Briefing started 15:16" unchanged, rows 1 and hazards still checked with original signatures; also survives full page reload. |
| 24-23 | No duplicate session | FAIL (race only) | Sequential cases PASS: dblclick on Begin created 1 BriefingStarted (1 -> 2); B tapping Open Briefing after A began did not add one (6 -> 6) and showed A's start time. RACE FAILS: A and B tapped Begin simultaneously from a no-session state -> two BriefingStarted (138d.. by A, 48ad.. by B); A's End closed only 138d.., the button stayed "Open Briefing" and an orphan session (with checked rows) remained active until B ended it (shots 17-20). Fix area: src/ui/hooks/useBriefing.ts (begin reads local state only), src/core/checklist/reducer.ts. |
| 24-24 | Re-begin = new session | PASS | After End then Begin: header "Briefing started 15:19", 0 of 9 rows checked, 0 / 5; old session events retained (Started/Ended pairs stack in the log) (shot 16). |
| 24-25 | Check/uncheck audited | PASS | Event Unchecked:orm-q-signals with actor/time; audit log shows "Checklist item un-attested" row (shot 11). |
| 24-26 | Cross-device attestation | PASS | A checked "Explain the plan..." -> B's open modal showed it within 4 s, no reload, "Rescue Group Supervisor . 15:20"; later A checked hazards and B checked "Ask the crew for input" ("Unassigned . 15:25"); each shown on the other device (shots 21, 22). B's footer flipped to Open Briefing without reload. |
| 24-27 | Cross-device end, nobody paged | PASS | Profile C (admin, 127.0.0.1) saw footer flip Open -> Begin after A ended, 0 toast/alert/dialog nodes added, audit log lists "Briefing ended" 03:30 PM (shot 27). Caveat: B (non-admin Safety Officer) cannot open the audit log ("for the IC, OSC, or admin"; ADR-017 line 39), so it never sees the record there (shot 24). |
| 24-28 | Offline | PASS | B offline (goOffline + offline event, banner "Offline - will sync when you reconnect"): Begin, two rows checked, End all worked locally (label back to Begin Briefing). A's events 22 -> 26 after reconnect (Started, Checked x2, Ended); A's audit log lists them (shots 25, 26). |
| 24-29 | Template edit + provenance | PASS | Settings > Administration > Checklists: "Risk briefing (ORM/TCRM)" badge "FieldShore baseline"; Edit "Ask the crew for input" -> "...and concerns", Save, Done -> "Customized by QA Dept 24"; briefing shows the new wording; "Reset to FieldShore baseline" -> confirm -> badge back, wording restored (shots 28-33). Briefing surface itself shows no customized cue. |
| 24-30 | Add note control | NOT-BUILT | 0 "Add note" text, 0 textarea/input in the dialog; none in OrmBriefingModal.tsx. |
| 24-31 | Per-Group sessions | NOT-BUILT | Single op-wide session: B (Safety Officer) tapping Begin resumed A's session (same start time, same rows); activeBriefing returns the one most recent un-ended session, no Group/task selector. |
| 24-32 | Safety/OSC briefing indicator | NOT-BUILT | B as Safety Officer: only briefing text on /operations is the footer "Open Briefing" button; /command and Org Chart contain no briefing text; no marker anywhere outside the audit log (shot 23). |
| 24-33 | X does not destroy work | PASS | Checked rows, X, Open Briefing: rows and signatures intact; no discard-guard dialog appeared on X. |

## FAIL repro steps
- 24-23 (race): A at http://localhost:5200 and B at http://127.0.0.1:5200, same dept, same op, no briefing active, both on /operations scrolled to the foot. Tap Begin Briefing on both within the same instant (scripted Promise.all). Wait 4 s. Both show a modal; the event log holds two BriefingStarted. Tap End Briefing on A: the button on both devices still reads "Open Briefing" (the second session is still open). Offline-start on two devices produces the same result on reconnect.

## SPEC-DRIFT
- 24-21: X leaves the session active ("Open Briefing", "Briefing started" logged); named by the comments cited above and brief R1.
- Brief-listed, observed as expected, not separately rowed: S1 baseline wording, S2 board-foot placement (no "Add hazard"), S3 title/footer copy, S4 no briefing-specific aria-live (0 live regions in the dialog).
- R5: no Rescue-Group-Supervisor gate exists. B (default role, Safety Officer or Unassigned, no manage-ops) could Begin, attest and End; ADR-017 line 40 does not name the briefing, and the only gating seen is that B has no End Operation button.

## Other observations
- Audit-log actor for another device's events renders "A device" (not a name); the viewing device's own events render "You".
- Stale-frame probe: row flips to checked 5 ms after tap, no flicker back. Sunlight theme: black on white, checkbox and signature legible (shot 37).
- Briefing checklist state is keyed by briefing id, so unlike specs 22/23 (#550) it follows the session across devices and accounts.

## Console notes
No console errors or failed responses after the baseline mark on A or B. C: one known-noise "Transition was aborted because of invalid state".

## Deferred, not driven
Per-crew roster binding ("who got briefed" names), numeric ORM/GAR score (OQ2), discard-guard on X (checked only as 24-33, not required), broadcast read-only indicator (#496), exact S4 screen-reader copy, mutual aid (#493), after-action email (#495).
