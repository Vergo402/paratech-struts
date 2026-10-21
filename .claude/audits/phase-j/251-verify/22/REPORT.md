# #251 verification, spec 22 (IC Command Checklist progression)

- Date: 2026-10-21. HEAD 2e8bd28 (v4-redesign). No source edits, no state-changing git (BRIEF.md was already modified before the pass). Ports 5200/9000/9099 free before; dev server and emulators stopped after (ports confirmed free).
- Origins: device A http://localhost:5200 (Reyes, Admin, IC, 390x844 touch; 768x1024 and 1280x800 mouse for dock criteria), device B http://127.0.0.1:5200 (Okafor, non-IC; later made Operations Section Chief by A).
- Dept "QA Dept 22", accounts qa251-22-a / qa251-22-b @example.test. Op "Cascade Building Fire", 5 pending points (Div 2 x2, Div 3, Div 1, Sub Div 1), #1 advanced to Wood Shore Secured, 2 hazards (1 mitigated), Safety Officer assigned.
- Console baseline 2 (vite debug). After the mark: 0 error-level messages, 0 page errors in all scripts on A and B; no prod-host hits. Screenshots: .claude/audits/phase-j/251-verify/22/shots/ (50 files). Scripts: scratchpad qa-251-22/*.mjs.
- Setup note: brief step 3 says "Strut Set (Secured)". In the build "Strut Set" is a separate lane; the ICS-201 "set" count follows status secured = lane "Wood Shore Secured". Advancing to Strut Set left "0 set"; Cutting -> Runner -> Secured gave "1 set".

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 22-01 | Edge tab | PASS | `<button class="fs-checklist-tab" aria-label="IC Command Checklist">`, svg only, textContent empty: NO visible text label (spec wants glyph + label; finding, copy/minor) (shot 01). |
| 22-02 | Tab size | PASS | 40 x 56 (height meets 56; width 40 below the 44 floor) at 390 and 768. |
| 22-03 | Closed by default | PASS | 0 dialogs, 0 asides, no drawer text on load; also after reload (22-29). |
| 22-04 | Open, modal on phone | PASS | `role=dialog` named "IC Command Checklist", `aria-modal=true`, `.fs-drawer--phone` x40 w350 h844, 1 `.fs-scrim`, Close button, activeElement = Close inside dialog (shot 02). |
| 22-05 | Tab hidden while open | SPEC-DRIFT | Tab count 0 while open; "tap tab to close" not available (Close/Esc only). Cited: ChecklistTab.tsx header comment "the caller hides it while its drawer is open (Close + Esc dismiss the drawer)"; SitStat.tsx `{!checklistOpen && <ChecklistTab/>}`. |
| 22-06 | Close paths | FAIL | Esc and Close both close, no audit rows added (audit text identical; positive control: log lists other events). BUT focus is lost: after Esc and after Close `document.activeElement` = BODY, even when opened with keyboard from the focused tab. Spec: focus returns to the tab. See repro. |
| 22-07 | Swipe-to-edge dismiss | NOT-BUILT | Mouse drag and CDP touch swipe toward right edge: dialog remains (shot 17). SideDrawer.tsx comment: swipe dismiss deferred. |
| 22-08 | Tablet/desktop dock | PASS | 768: `aside[role=complementary][aria-label="IC Command Checklist"]` 360 wide, 0 `.fs-scrim`, 0 role=dialog; Hazards entry on the board still opened a Sheet while docked. 1280: dock present, no scrim, board "Safety Officer" node tap opened a second docked aside (Safety Officer panel) beside it. Observation: at 1280x800 the dock OVERLAPS the Command rail (right part of the rail/Transfer button hidden) rather than shrinking it (shots 22-25). |
| 22-09 | Desktop Esc | FAIL | Esc with no overlay closes the dock (positive control, focus on Close at open). With a Sheet opened over the dock (768: Hazards sheet; 1280: Add Hazard sheet), ONE Esc closed the dock immediately (80ms) and the sheet too; 4 of 4 trials. #459 deferral does not hold. See repro. |
| 22-10 | Role gate | PASS | B (Okafor, non-IC; also as Safety Officer holder) on /command: 0 tabs, 0 "IC Command" text, no dialog (shot 00-b-command.png, 33). |
| 22-11 | Non-IC read access | NOT-BUILT | B as Operations Section Chief (account-held, rail shows Okafor): /command 0 tab, 0 "IC Command" text; /operations only has "Task Level Checklist"; org sheet no checklist. B's local event log does hold the ChecklistItem events (30+), so data syncs, but no UI surface (shots 34). |
| 22-12 | Drawer body | PASS | ICS-201 region first, then "Phase I - Size-up", "Phase II - Initial actions", "Phase III - Sustained operations", "Phase IV - Demobilization"; Phase I nests "Primary assessment" (3) and "Establish command" (2). 15 leaves (shot 02). |
| 22-13 | Counts | PASS | Fresh: 0 / 5, 0 / 4, 0 / 3, 0 / 3 (Phase I 0 / 5 across both subsections); section name "Phase I - Size-up, 0 of 5 complete"; chevron present; no progressbar, animation none. |
| 22-14 | Attest | PASS | "Determine location and extent" -> aria-checked true, caption "Incident Commander · 14:32" = browser clock 14:32 (shot 03). |
| 22-15 | Counts update / partial | PASS | Phase I 1 / 5 and Primary assessment 1 / 3; box class is-partial (bar glyph). |
| 22-16 | Row target | PASS | All 15 leaves 56px tall; label tap, empty right side tap and box tap each toggled (true, false, true). |
| 22-17 | No bulk check | PASS | Phase header tap flips aria-expanded only; leaf states unchanged; audit counts unchanged (2 attested / 1 un-attested before and after). |
| 22-18 | Auto-collapse | PASS | Checking the 5th Phase I leaf: Phase I aria-expanded false, box checked, 5 / 5; Phase II-IV stay open; "Assign Safety Officer" at top 394px, visible without scroll. Manual header tap reopens. Note: complete sub-sections ("Primary assessment") also fold (shots 06-08). |
| 22-19 | Un-check | PASS | Re-tap clears check and caption; counts 1 -> 0; 0 alertdialog, only the drawer dialog (shot 04). Reopened phase stays open after un-check/re-check (manual override persists). |
| 22-20 | No celebration | PASS | All 15 checked: only counts + checkmarks; no toast/confetti/modal, Audio constructor 0 calls; immediate and 1s shots (09, 10). The only status node is the global sync banner "Syncing 1 change…" (role=status) that appears on every commit. |
| 22-21 | Audit trail | PASS | /audit-log rows "Checklist item attested"/"Checklist item un-attested", badge "Checklist", expanded detail "Incident Commander" (earlier rows) / "Safety Officer" (22-22 row), newest first; attested 2 -> un-attested 1 -> 2 rows after un-check, earlier row kept (shots 05, 13). |
| 22-22 | My Role signature | PASS | My role = Safety Officer: new check captioned "Safety Officer · 14:34", audit detail "Safety Officer"; cleared My role afterwards, later checks "Incident Commander" (shot 12). |
| 22-23 | ICS-201 card | PASS | Region "Command brief (ICS-201 condensed)", eyebrow "Command brief (ICS-201 condensed) · live", exactly 6 datums: Incident, Elapsed, Incident Commander, Safety Officer, Open hazards, Shore points (shot 18). |
| 22-24 | Datum values | PASS | Incident = op name; Elapsed 00:12:06 -> 00:12:11 over 5s and matches Operations header; IC Reyes = rail; Safety Officer Okafor = rail, "Unassigned" when no holder (shot 21b); Open hazards "1" = chip; "1 set · 5 total" after #1 Secured = rail "Wood Shore Secured 1". |
| 22-25 | Live card | PASS | With drawer open on A: B added hazard -> Open hazards 1 -> 2 (no reload), B mitigated -> 1; #1 to Secured -> "1 set · 5 total"; Safety Officer Okafor -> Reyes -> Unassigned -> Okafor tracked the rail. Card: 0 inputs, 0 buttons. |
| 22-26 | Status counts | FAIL (copy/minor) | Card shows only "1 set · 5 total"; spec wireframe has per-status counts ("Returned N · Secured N · ..."). No Superseded row, addendum or code comment names this reduction (ICS201Brief.tsx says "Six live SitStat datums" only). |
| 22-27 | Cross-device | PASS | A checked 2 leaves; B's IndexedDB gained ic-p2-op / ic-p2-360 Checked events within 3s; B /audit-log showed "Checklist item attested" 22 / un-attested 10 after reload. The audit page did not update live (20 until reload). B has no toggle (see 22-10/11). |
| 22-28 | Convergence | PASS | B offline (goOffline + offline event, banner "Offline — will sync when you reconnect"); A: 1 un-check + 2 checks; B log lagged (34 vs 37 events, control); after reconnect both 37 events and identical checked sets (13 items), derived in (receivedAt, at, id) order. |
| 22-29 | Reload persistence | PASS | Reload on A: drawer closed, tab present; captions, counts and checked set identical before/after ("Assign Safety Officer=Safety Officer · 14:34", "Final PAR=Incident Commander · 14:35"). |
| 22-30 | Accessibility | PASS | Leaf `role=checkbox` + aria-checked; section button "<label>, n of m complete" with aria-expanded; group per section. Caveat: a checked leaf's accessible name includes its caption ("Final PAR Incident Commander · 14:35"). |
| 22-31 | Screen-reader strings | NOT-BUILT | Tab name is "IC Command Checklist" (no "Closed. Button"); 0 `aria-live`/role=status/alert inside the drawer; no "drawer open", "Double-tap to attest", "checked/unchecked" announcements. Only the global sync banner role=status exists. |
| 22-32 | Keyboard | PASS | Dock opens with focus on Close; Tab walks section headers and leaves in order; Space then Enter toggled false -> true -> false, focus retained; focus-visible ring solid 2px rgb(212,160,23) (shot 26). |
| 22-33 | Edited template | PASS | Settings > Administration > Checklists > Edit: added "Verify accountability board" to Phase II; badge "Customized by QA Dept 22"; drawer Phase II 1 of 5 with new leaf, existing attestations kept; "Reset to FieldShore baseline" (confirm dialog) restored "FieldShore baseline" and 4-leaf Phase II, attestations kept (shots 29-32). |
| 22-34 | Sunlight | PASS | data-theme sunlight: label/caption/count/ICS-201 text black on white 21:1; tab brown 110,80,0 on white 7.47:1; checked box filled with checkmark svg vs unchecked 2px outline with no glyph (shapes distinct) (shots 27, 28). |
| 22-35 | No flash / stale frame | PASS | rAF sampling after Esc: dialog, scrim and drawer text disappear in the same frame (~200ms), nothing lingers; immediate shot after leaf tap and after Close show no stale content (shots 14, 16); at 800ms 0 dialogs, 0 scrims. |

## FAIL repro steps
- 22-06 (focus return): A on /command (390x844). Focus the edge tab, press Enter (drawer opens, focus in dialog). Press Esc, or reopen and tap Close. Read `document.activeElement`: BODY (also after a mouse tap open). Cause: SitStat.tsx unmounts the tab while the drawer is open, so SideDrawer's `openerRef.current?.isConnected` check fails and no focus is restored (PhoneDrawer onCloseAutoFocus; DockDrawer Esc/Close). Fix area: SitStat.tsx / ChecklistTab (keep it mounted or focus it after close), SideDrawer.tsx.
- 22-09: A at 768x1024 or 1280x800. Open the checklist dock, open any Sheet from the board (Hazards entry at 768; Add Hazard at 1280). Press Esc once. Dock closes at the same time as the sheet. Expected: only the sheet closes. Likely cause: Radix handles Esc first and the sheet releases its overlay claim, so DockDrawer's `hasOverlayClaim()` guard in SideDrawer.tsx onKey sees an empty stack (listener order).
- 22-26 (copy/minor): open the drawer with shore points in different statuses; card shows only "<n> set · <total> total".

## SPEC-DRIFT list
- 22-05: tab hidden while drawer open (ChecklistTab.tsx and SitStat.tsx comments).

## Other observations
- 22-01: tab has no visible label; width 40 below 44.
- 1280 dock overlaps rather than reflows the Command rail, and the node panel opens a second docked column next to it.
- Brief setup says Strut Set counts as "set"; build counts only status Secured.
- IC gate judged by account (552faca); not driven with a second device for IC, per the addendum.

## Console notes
Baseline 2 (vite connect debug). After the mark: 0 error-level console messages and 0 page errors on A and B across all scripts; no requests to production Firebase hosts. Known "Transition was aborted" noise did not appear.

## Deferred, not driven
- ICS-201 doctrine-expanded fields / assembled export (#494); broadcast wall-board row (#496); verbatim doctrine step text (v4.1, Q2/B5); drawer handedness (Phase H); mutual aid / after-action email / one-tap PAR (#493, #495, #438); LWW same-item overwrite findings (#504).
