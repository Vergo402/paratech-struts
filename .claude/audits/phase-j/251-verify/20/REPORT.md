# #251 verification, spec 20 (Role assignment and command transfer)

- Date: 2026-10-21. HEAD aafe8d2 (v4-redesign). No source edits, no state-changing git. Ports 5200/9000/9099 were free before; dev server and emulators stopped after (ports confirmed free).
- Origins: device A http://localhost:5200 (Reyes, Admin, 390x844 touch; 768x1024 tablet and 1280x900 mouse for 20-17/18), device B http://127.0.0.1:5200 (Okafor, Default role), device C http://localhost:5200 separate profile (Cruz, observer), B2 = second profile at localhost signed in as Okafor (20-39).
- Dept "QA Dept 20", accounts qa251-20-a/-b/-c @example.test. Rigs Engine 3, Battalion 1 (no stock). Op "Cascade Building Fire", 2 pending points, 1 High hazard. Custom positions QA Unit 1-4 and QA Staff 1-6 were added to the chart during the span/move tests.
- Console baseline 2 before first load. Screenshots: .claude/audits/phase-j/251-verify/20/shots/ (58 files). Scripts: scratchpad qa-251-20/s*.mjs.
- Deviation: IC handed off several times (Reyes -> Okafor -> Chief Alvarez -> Okafor); final IC Okafor (account B).

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 20-01 | Founder is IC, gold underline | PASS | /command IC row "Reyes", `.fs-cmd-ic-name` border-bottom 3px rgb(212,160,23); org node neutral (shots 03, 04). |
| 20-02 | My role sheet | PASS | Sheet "My role", line "Declare the ICS position you are filling.", 7 rows in tree order, spelled-out titles, "under <parent>" sublines (shot 05). Creator starts with My role = Incident Commander. |
| 20-03 | Pick commits, pill | PASS | No confirm, sheet closes. B fresh: pill "Set role" -> "You Shoring Group Supervisor"; reopen: that row `is-on` with meta "My role" (shots 06, 08). |
| 20-04 | Clear my role | PASS | Button absent when unset (0), present when set; tap clears with no alertdialog; pill returns "Set role"; no row marked (shot 07). |
| 20-05 | Re-pick replaces | PASS | SGS -> Staging Area Manager: exactly 1 "My role" row, pill updated. |
| 20-06 | Role follows account | PASS (guest half not driven) | A set Staging Area Manager; A signed in on 127.0.0.1 (new profile): pill "YOU STAGING AREA MANAGER", row marked (shot 17). Commit 552faca. Guest per-device not driven (no dept/sync for guests). |
| 20-07 | My role vs chart staffing | PASS | A assigned Battalion 1 to SGS; B set My role SGS; both views show Battalion 1 as leader and B's role entry, no error/overwrite (shot 16). |
| 20-08 | Role announcement live region | NOT-BUILT | MyRoleSheet has no announce; observer saw nothing on pick; only an empty `role=status aria-live=polite` exists. Positive control: same observer captured "Command transferred to Okafor." on accept (20-28). |
| 20-09 | Node panel sections | PASS | Sheet titled by position, eyebrow ICS class ("Section", "Group"). A (IC) on Ops: Assigned, Direct reports, Manage position, Role history. B: Assigned, Direct reports, Role history only; only "Close" button (shots 11, 15). |
| 20-10 | Assign apparatus | PASS | "Change or add apparatus" -> Engine 3 row "assigned here"; node card "Engine 3 +2 resources"; rail "1 apparatus" (shots 12, 13). |
| 20-11 | Assign member + individual | PASS | Okafor (account) and typed "FF Lopez" both under Assigned; Engine 3 tagged "· leader" (shot 13). |
| 20-12 | Clear immediate, reversible | PASS | "Clear Engine 3" etc. no confirm; node "Unassigned"; re-assign works (shot 14). |
| 20-13 | Non-IC read-only | PASS | B on SGS/Ops: only "Close"; no Change/Manage/clear X. Control: IC panel shows Clear X, Change, Rename, Add, Move. |
| 20-14 | Span informational | PASS | Ops under 5 reports: eyebrow "Section"; 6: "Section · span 6 caution"; 7 caution; 8: "span 8 over", badge "Span 8 · over"; 8th add still succeeded (shots 19, 20). Command Staff excluded: IC with 6 added Command Staff positions still "DIRECT REPORTS · 2", no span badge. |
| 20-15 | Remove modal | PASS | Custom QA Unit 4 with Engine 3: "Remove QA Unit 4?" Cancel / Remove, initial focus Cancel; Cancel no change; Remove deletes, rail apparatus count drops. Built-ins show "Built-in position · cannot be removed" (shot 23). Copy differs from spec (as brief says). |
| 20-16 | Reparent via Move... | PASS | Back link, Move left/right (disabled at ends), parent list excludes self, current parent and descendants (Ops lists only Safety Officer). Moved QA Unit 3 under SGS then back; reorder left/right works (shots 21, 22). |
| 20-17 | Drag reparent | PASS | 1280x900 mouse, scripted PointerEvents on grip: dropped QA Unit 1 on an IC child gap, reparented under IC, persisted after reload (shots 28, 29). Center-of-card drop is a merge-and-remove (confirm), not driven. |
| 20-18 | Tablet layout budget | FAIL | 768x1024: org chart is a 534px-wide Sheet; default 4 level-3 cards at 234px pitch need ~920px; only ~3 cards fit, horizontal scroll (shots 24, 25). Budget cited by ADR-014 / spec line 173; no later decision found. |
| 20-19 | Transfer button gate | PASS | A (IC): 1; B (not IC): 0; pending on initiator: 0; after accept A: 0, B: 1. |
| 20-20 | Takeover | PASS | Dialog 0,0,390x844, title "Transfer Command", "Cancel", "Current Incident Commander", groups "Apparatus on scene", "Department members" ("signed in"), field "Transfer to someone new"; tab bar covered. "On the org chart" group only renders when individuals are on chart (not seen, none were) (shots 30-32). |
| 20-21 | Apparatus on scene | PASS | Battalion 1 (assigned at SGS, shows "Shoring Group Supervisor") listed; idle Engine 3 absent. Empty-state copy not driven. |
| 20-22 | Live six-datum brief | PASS | Incident, Elapsed, IC, Safety Officer, Open hazards 1, "0 set · 2 total" match rail (shot 30). |
| 20-23 | Primary button + note | PASS | "Hand over command" disabled until pick/type; note "You keep command until Okafor accepts."; typed name wins and clears pick; pick clears typed (shot 32). |
| 20-24 | Cancel/Esc no change | PASS | Esc and Cancel: takeover gone, IC unchanged, no pending; IC node history shows no extra event. Esc returns focus to "Transfer". |
| 20-25 | Initiate keeps command | PASS | A rail: IC Reyes (underline) + "Transfer pending -> Okafor" + "Cancel transfer" (shot 33). |
| 20-26 | End Operation while pending | PASS | A: 1 End Operation button, enabled (not tapped), also with B offline (20-37). |
| 20-27 | Account target incoming card | FAIL | B: "You are being given command from Reyes - Cascade Building Fire", Accept command / Decline, no code; C sees only quiet line "Transfer pending -> Okafor", no Accept. But the initiator A (not the target) also shows "Accepting on this device? ... Okafor: Accept command"; tapping it announces "Command transferred to Okafor." yet command does not move (history "accepted - no effect"). See repro. Embedded brief on incoming card not rendered (as brief expects). |
| 20-28 | Accept moves command | PASS | B IC Okafor with gold underline, Transfer on B; A: IC Okafor, Transfer gone, pending cleared (synced, no reload). B live region polite "Command transferred to Okafor." (shots 39, 40). |
| 20-29 | Edit rights move | PASS | A on SGS node: only Close; B: Clear/Change/Rename/Add/Move. |
| 20-30 | Decline | PASS | Decline on B: pending cleared both, IC Reyes, Transfer back on A. |
| 20-31 | Cancel transfer | PASS | A cancel: pending gone on A and B, IC Reyes, Transfer returns. |
| 20-32 | Accept code only for individual/apparatus | PASS | Typed "Chief Alvarez": 4-digit code on initiator card only (absent on A's DOM). Battalion 1: code too (shot 49). Account target: no code. |
| 20-33 | Quiet line + code entry | PASS | Line "Transfer pending -> Chief Alvarez / Tap if this is you", 56px; wrong code: "That code doesn't match - check it with the outgoing commander." (curly apostrophe); right code reveals Accept command / Decline; "Not me - close" collapses (shots 44-47). |
| 20-34 | Same-device accept | PASS (see 20-27 for account-target defect) | B pending to Chief Alvarez: section text as spec; tap "Chief Alvarez: Accept command" moved command (IC row Chief Alvarez on A and B), live "Command transferred to Chief Alvarez.", Transfer still shown (individual IC) (shot 48). |
| 20-35 | Role history | PASS (caveat) | IC node lists, with clock times, MyRoleSet, moved-in, "Command transfer -> Okafor", "accepted - no effect", declined, cancelled, accepted; readable on A (non-IC) and B; "No history yet." on untouched node. Caveat: panel refetches on open only (useRoleHistory staleTime 0 comment), so an open panel does not live-update after your own edits. |
| 20-36 | Append-only | PASS | Initiated entries persist after cancel/decline/re-initiate (shot 42). |
| 20-37 | Offline incoming IC | PASS (warm offline) | B goOffline: A initiated; A kept IC, End Operation present and enabled; B back online without reload showed "You are being given command" (shots 50, 51). Cold-offline not driven. |
| 20-38 | Focus trap and return | FAIL (copy/minor) | Tab cycles only inside the dialog; Esc closes and focus returns to "Transfer". Initial focus is on Cancel, not the first recipient as the spec says; no code comment/ADR names the change. |
| 20-39 | Position follows account | PASS | Okafor (IC via accept) signed in on a second profile: IC Okafor, Transfer button present, SGS node shows Manage/Change/Clear (shot 52). |
| 20-40 | Tap targets >= 44 | FAIL | Transfer 48, Cancel transfer 48, Accept/Decline 48, quiet line 56, node cards 69-91, My role rows 56-62, node clear X 44. My role chip 34px and full-screen button 36px (390x844). |

## FAIL repro
- 20-27 (account target false Accept on initiator): Reyes IC on A, Transfer -> Department members -> Okafor -> Hand over command. On A's pending card tap "Okafor: Accept command". Observed: polite live region "Command transferred to Okafor.", but IC stays Reyes and pending stays; IC history adds "Command transfer accepted - no effect". Cause: CommandRail.tsx ~238 renders the hand-over section for `ref !== 'device'`, but canAccept (core/org/transfer.ts) requires the account id to match for account refs. Fix area: render only for individual/apparatus targets.
- 20-18: phone/tablet 768x1024 Command -> Org Chart sheet; chart scrolls horizontally (534px visible vs ~920px for the 4 level-3 cards).
- 20-38: open Transfer; document.activeElement is the Cancel button.
- 20-40: Command -> Org Chart: `.fs-org-myrole` height 34, `.fs-org-fullscreen` height 36.

## SPEC-DRIFT list
None. Behaviors matching the Superseded table (handshake ADR-021, code #425, same-device #401, apparatus targets #489, account follows #552faca) are recorded PASS because the brief criteria already describe the later behavior.

## Console notes
- Baseline 2. After the mark only the known `Transition was aborted because of invalid state` pageerror on first load per profile; no other errors on A, B, B2, C. Production hosts blocked, 0 hits attributed.
- Sunlight/dark/light contrast for Transfer button: 5.19 / 6.69 / 21.0, IC name 12.7 / 17.4 / 21.0 (theme set via data-theme attribute). Exit-animation flash and stale-frame probes not run.

## Deferred, not driven
- Assisting out-of-department IC (mutual aid, #493, ADR-022 amended; not drivable in v4.0).
- Spec ICS-201 narrative fields on transfer brief (v4.1); Search/Medical add-ons and level presets (ADR-008); Cutting Station as workstation (own workflow); broadcast IC-name change (ADR-040, #496); dept switching/leave (won't-fix); per-line Remove (#525).

## Not driven (setup limits)
- Guest-device per-device role (20-06 second half); cold offline for 20-37; empty-state copy for "Apparatus on scene"; "On the org chart" group with a staffed individual.
