# #251 verification, spec 23 (Task Level Checklist progression)

- Date: 2026-10-21. HEAD af9321a (v4-redesign). No source edits, no state-changing git. Ports 5200/9000/9099 free before and after.
- Origins: device A http://localhost:5200 (Reyes, Admin/IC, 390x844 touch; 1024x768 and 1280x800 mouse), device B http://127.0.0.1:5200 (Okafor), profile C = same account as A on 127.0.0.1.
- Dept "QA Dept 23", accounts qa251-23-1 / qa251-23-2 @example.test. Op "Warehouse Collapse", 2 pending points (no stock, so "Add to Pending").
- Console baseline 2 (vite debug) before first load. After the mark: 0 error-level messages and 0 failed responses in all scripts, except one known-noise "Transition was aborted because of invalid state" on route change (profile C). Screenshots: .claude/audits/phase-j/251-verify/23/shots/ (33 files). Scripts: scratchpad qa-251-23/*.mjs.
- Scoping fact: instanceId = by = device uid (TaskLevelChecklist.tsx). Header comment says a Group/task binding is deferred; useChecklists.ts doc comment says "a Group/task id" (stale).

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 23-01 | Summon control | PASS | `button.fs-stack-btn` aria-label "Task Level Checklist", aria-pressed=false, 48x48, in `.fs-stack` beside "Open inventory summary" + grip (shot 01). |
| 23-02 | Opens drawer | PASS | role=dialog "Task Level Checklist", aria-modal true, `.fs-drawer--phone` x40 w350, 1 `.fs-scrim`, Close button (aria-label Close) (shot 02). While open, button aria-pressed=true. |
| 23-03 | Closed by default, board unchanged | PASS | 0 dialogs on load and after reload; card list text identical before/after open+Esc (shot 17 for card list). |
| 23-04 | Close / Esc, no events | PASS | Esc, Close, scrim tap all close. Checklist events in IndexedDB 0 -> 0 after 5 open/close cycles; positive control: attesting then produced 1, then 13+ events. |
| 23-05 | Focus | PASS | Keyboard Enter on summon: activeElement = Close inside dialog. Esc, Close button and scrim tap each return focus to `.fs-stack-btn` "Task Level Checklist". #549 focus defect NOT present here (stack button stays mounted). |
| 23-06 | Two-level tree, n / total | PASS | Assessment 0 / 2, Search 0 / 3, Access 0 / 2, Extricate 0 / 2, All-clear 0 / 2; 0 progress/progressbar elements, no "%" in text. |
| 23-07 | One section open at a time | NOT-BUILT | All 5 sections aria-expanded=true on open (5 of 5); header tap toggles only that section (Assessment collapse left others open). Matches brief risk note; no code comment/ADR names it. |
| 23-08 | Header words | PASS | aria-label "Search, 0 of 3 complete" ... plus aria-expanded; leaf rows are role=checkbox. |
| 23-09 | Leaf attest + caption | PASS | "Primary search" -> aria-checked true, box is-checked with svg, caption "Incident Commander · 15:01" (24h; browser clock 03:01 PM) (shot 03). |
| 23-10 | Role stamp | PASS | My role = Rescue Group Supervisor -> "Rescue Group Supervisor · 15:02" (shot 10); Clear my role -> "Unassigned · 15:02"; account B with no role -> "Unassigned · 15:06"; B as Shoring Group Supervisor / Operations Section Chief stamped accordingly. Note: A (IC by account) with My role never set stamped "Incident Commander". |
| 23-11 | Counts / partial / full | PASS | 0/3 -> 1/3 (box is-partial) -> 2/3 -> 3/3 (is-checked); all sections 2/2, 3/3 is-checked (shot 05, 07). |
| 23-12 | No bulk complete | PASS | Header tap only flips aria-expanded; checked set identical before/after; events unchanged (1 -> 1). |
| 23-13 | No celebration | PASS | All 11 leaves checked: added nodes are only the global sync banner (role=status "Syncing 1 change…"); no toast/confetti/dialog; no animations in drawer at +0 and +1 s (shots 07, 08). |
| 23-14 | Un-check no confirm | PASS | Re-tap clears box and caption; only the drawer dialog present (0 alertdialog); Search 3/3 -> 2/3 (shot 06). |
| 23-15 | Audit trail | PASS | /audit-log rows "Checklist item attested"/"un-attested", badge Checklist, actor "You", time and detail role ("Unassigned", full timestamp). Counts match IndexedDB exactly: 16 checked / 5 unchecked; check rows retained (shot 12). |
| 23-16 | >=768 floating panel | PASS | 1024 and 1280: `aside.fs-fp` role=dialog (non-modal), 0 `.fs-scrim`, header handle drags (x 669->469 at 1024, 887->687 at 1280, shots 15), board Board/Cutting Station radios still clickable with panel open; leaf attests inside panel. Observation: switching to the Cutting Station view unmounts the stack and panel (no summon on that view). |
| 23-17 | Row height | PASS | Leaves and section heads all 56px at 390, 1024, 1280 (>= 44 floor and the 56 claim). |
| 23-18 | Keyboard | PASS | Tab/Shift+Tab walk headers and leaves; Space false then Enter true on focused leaf, focus retained; focus ring solid 2px rgb(212,160,23) (shot 11). |
| 23-19 | aria-live announcement | NOT-BUILT | 0 `aria-live`/role=status/alert inside drawer before and after check/un-check; no live-region text change. Only two empty global status regions (sync banner). |
| 23-20 | Persistence | PASS | Close/reopen and full reload: leaf states, captions and counts identical; drawer closed after reload. |
| 23-21 | Offline | PASS | B offline (goOffline + offline event, banner "Offline — will sync when you reconnect"): checked "Secondary search" ("Operations Section Chief · 15:08"); control: A did not see B's event while B offline; after reconnect A's IndexedDB gained it (within 10 s) (shot 22). |
| 23-22 | Per-Group instance | FAIL | Instance key is the device uid (events instanceId == by == uid; A 4ab0..., B a605...). Lists are separate only because devices differ: A (Rescue Group Supervisor) and B (Shoring Group Supervisor) each saw an independent list; A re-set to Shoring Group Supervisor (same Group as B) kept its own 11 checks, B kept its own 1. No Group/task name or selector in drawer (text is title + tree only). Comment in TaskLevelChecklist.tsx names the deferral; no Superseded row or ADR does, so FAIL (gate M13 must-fix). |
| 23-23 | Follows officer across devices | FAIL | Same account (qa251-23-1) signed in on 127.0.0.1: drawer shows 0 / 11 checked ("0 / 2, 0 / 3, ...") although its IndexedDB holds the 26 synced checklist events (shot 20). A's own list unreachable from the second device. |
| 23-24 | Section Chief reads a Group | NOT-BUILT | B as Operations Section Chief: drawer shows only its own tree; 0 selectors/tabs/combobox, only a Close button; no way to view A's attestations (shot 21). Data does sync to B's event log. |
| 23-25 | Propagation on same instance | NOT-BUILT | No shared view exists (see 23-22/24). A's attestations never appear on B and vice versa; events propagate (A received B's after reconnect) but nothing renders them. |
| 23-26 | Edited template + provenance | NOT-BUILT | Settings > Administration > Checklists > Task Level Checklist > Edit: added "Verify void spaces" under Search; settings row shows "Customized by QA Dept 23"; drawer updated live (Search 3 / 4, new leaf, existing attestations kept) but the drawer shows NO customized/baseline cue. Reset to baseline restored the 3-leaf Search, attestations kept (11). |
| 23-27 | Tap vs slide contrast | PASS | Tap on shore card body at 390: 0 dialogs, lanes and card status text unchanged (Pending 2, "Waiting") (shot 17); tapping a leaf attests (positive control, shot 03). |
| 23-28 | No active op | PASS | After End Operation: "No active operation", `.fs-stack` 0, no "Task Level Checklist" button; 0 console errors; positive control: button present with active op (shot 27 vs 01). |

## FAIL repro steps
- 23-22: A (390x844) /operations, open drawer, check "Primary search". B (127.0.0.1, other account, any role) /operations, open drawer: unchecked; check it: both keep separate lists regardless of role (set both to Shoring Group Supervisor). Drawer shows no Group/task label. Fix area: `src/ui/operations/TaskLevelChecklist.tsx` (instanceId = uid), `useChecklists.ts`.
- 23-23: Sign the same account into a second browser origin (127.0.0.1) in the same op: drawer is empty while A has 11 checks. Same fix area.

## NOT-BUILT: 23-07 (all sections open), 23-19 (no live region), 23-24, 23-25, 23-26 (no provenance cue in drawer).

## SPEC-DRIFT
None found beyond the brief's Superseded table (edge tab, companion column, swipe close), which are replaced by 23-01/02/16/04.

## Other observations
- #549 defects: focus-loss on close NOT present; the other two (docked Esc under Sheet, 40px tab) not applicable (stack button is 48px).
- Task-level template has no auto-collapse of complete sections (spec 22's IC checklist does).
- Cutting Station view has no summon control.
- useChecklists.ts doc comment claims Group/task id scope; actual call passes device uid.
- Console: no errors; known "Transition was aborted" noise once.

## Deferred, not driven
Broadcast/wall-board rendering (#496), Toughbook attribution columns, doctrine authorship (v4.1; editor itself was driven in 23-26), drawer handedness, multi-checklist selection UI (OQ2, recorded in 23-22/24), LWW concurrent same-leaf overwrite (#504).
