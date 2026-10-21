# #251 verification, spec 21 (Hazard log)

- Date: 2026-10-21. HEAD 3f69446 (v4-redesign). No source edits, no state-changing git. Ports 5200/9000/9099 free before; dev server and emulators stopped after (ports confirmed free).
- Origins: device A http://localhost:5200 (Reyes, Admin, IC, 390x844 touch; 1280x900 mouse for 21-02 deck), device B http://127.0.0.1:5200 (Okafor, Default role, no position), guest G = separate localhost profile, not signed in.
- Dept "QA Dept 21", accounts qa251-21-a / qa251-21-b @example.test. Engine 3 stocked (AT 25-36/37-58/56-88, 6" Swivel Base). Op "Cascade Building Fire", 5 pending points: Div 2 x2, Div 3, Div 1, Sub Div 1 (basement). Later ended (archive check) and a "Second Op" started.
- Console baseline 2 before first load (vite debug only). No console errors or page errors in any script after the mark; no prod-host hits. Screenshots: .claude/audits/phase-j/251-verify/21/shots/ (62 files + export-sample.csv). Scripts: scratchpad qa-251-21/*.mjs.
- Note: during the pass I (the driver) mitigated a few unrelated hazards by sloppy text matching; every verdict below was re-run on a clean, exact-match register.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 21-01 | Empty state | PASS | Sheet "Hazard Log": "No hazards logged" / "The incident is clear. Add a hazard the moment you spot one."; rail row "Hazards No open hazards"; Export ICS-208 `disabled` with visible "No hazards to export"; forced click produced no download (shots 02, 03). |
| 21-02 | One tap from Command | PASS | Phone: "Hazards" row opens Sheet titled "Hazard Log". 1280x900: Segmented "Command workspace view" = Org Chart / Hazard Log; Hazard Log segment shows the register, 0 dialogs (shots 23, 24). |
| 21-03 | Add Hazard button + sheet | PASS | Button 356x56, `fs-button--primary fs-button--full`, first in log. Opens bottom `fs-sheet` titled "Add Hazard", fields Type, Location, Severity, "Notes (optional)", primary "Add Hazard"; activeElement is the sheet's Close handle (inside sheet) (shot 04). |
| 21-04 | Type picker | PASS | BottomSheetPicker options: Structural instability (checked default), Utility, Atmospheric, Fall, Other. Sentence case as brief says (shot 05). |
| 21-05 | Severity segmented | PASS | `radiogroup` aria-label "Severity": Low / Medium / High as words; default Medium `aria-checked=true`; after tap High `aria-checked` flips (High true, others false). |
| 21-06 | Location required | PASS | Empty and "   ": button disabled, visible reason "Enter a location"; helper text exact; "NE corner, Div 2" enables it. |
| 21-07 | Commit row | FAIL (copy/minor) | Sheet closes; "Open (1)" row `HIGH / Structural instability / NE corner, Div 2 / Reported 2:00 PM · You` (shots 06, 07). Clause "admins see the display name" fails: admin A sees "You" on own hazards and "A teammate" on B's. See repro. |
| 21-08 | Dismiss creates nothing | PASS | Esc and scrim tap (y=60) each close the sheet; no row, empty state still shown; reopen shows type Structural, severity Medium, location empty. Drag-down not driven (scrim/Esc suffice). |
| 21-09 | Any role adds | PASS (guest blocked, see note) | B (Default role) opened sheet and added "Void space north" Medium; A saw it with no reload. Guest profile: /operations and /command both show "Sign in to continue ... require an account" so a guest cannot reach the log (shot 50); controls: signed-in A/B reach it. Blocked: guests only. |
| 21-10 | Sort | PASS | Added Medium, Low, High out of order: list High(Roof edge, newer), High(NE corner), Med, Low; header "Open (4)" (shot 08). |
| 21-11 | Detail sheet | PASS | Sheet titled "Utility": MED badge, location, notes paragraph, "Reported 2:00 PM · You", full-width (356x56) primary "Mitigate hazard" (shot 09). |
| 21-12 | Mitigate | PASS | No confirm; same sheet flips to secondary "Reopen hazard", "CLEARED · MED" and "Mitigated 2:00 PM · You"; list: "Open (3) / Mitigated (1)", row tag CLEARED, meta "Mitigated hh:mm · who" (shots 10, 11). |
| 21-13 | Reopen | PASS | Reopen with no confirm: hazard back at MED position (between High and Low), no "Mitigated" line, "Open (4)" (shot 12). |
| 21-14 | All mitigated | PASS | After mitigating all 14 open: "Open (0)" and "None open — all hazards mitigated." with "Mitigated (37)" kept (shot 47). |
| 21-15 | Mitigate/reopen ungated | PASS | B (Default role, no position) mitigated A's "Stairwell" then reopened it; live "Hazard mitigated. Marked by You, 2:01 PM." / "Hazard reopened."; A mirrored both. No gate in build (consistent with ADR-017 axes: no position gate). A also mitigated/reopened B's hazard. |
| 21-16 | Cross-device, no push | PASS | A add -> B log rows and B chip 5->6 with no reload; mitigate/reopen both directions propagated (shots 14, 16, 18, 22). B MutationObserver on every `aria-live`/`role=status`: no entry for A's actions (only B's own announcements, positive control); no toast/alert nodes. |
| 21-17 | Hazard chip | PASS | Ops strip chip `fs-ichip--hazard is-high`, aria-label "5 open hazards, highest HIGH — opens Command", text "5 open · HIGH"; Command rail chip adds top location "5 open · HIGH Roof edge"; at zero open the chip is absent on A and B (Safety chip still there), at 1: "1 open · LOW" on A and B; tap on Ops chip navigates to /command (shots 19, 20, 49). |
| 21-18 | "Persistent header" entry | SPEC-DRIFT | Chips exist on Operations board strip, Cutting Station view and Command rail only; `/inventory`, `/quickfind`, `/settings` have neither chip. Safety chip tap -> /command (no sheet), hazard chip tap -> /command (log not auto-opened). Citing Superseded table (#487, #490) and IncidentChips.tsx comment ("surfaces ... one tap away from wherever a crew is actually working, not just the Command tab"). |
| 21-19 | Division badge | PASS | "Div 2" High: "⚠ HIGH hazard in area" on #1 and #2 (Div 2) only; #3 (Div 3), #4 (Div 1), #5 (Sub 1) none (shot 25). Variants "2", "Division 2", "D2" covered in 21-21 (shot 30 etc). |
| 21-20 | Conservative fallback | PASS | With "NE corner, Div 2" mitigated, added Medium "NE corner", "12 inch gap", "Div 1 and Div 2", "Side D 2", "stairwell", "2nd floor", "B 2": after each add, Board badges all "-"; List and Division views 0 badges; each is in the log (log row count >=1) and chip count rose to "12 open · HIGH". Positive control: "Div 2" -> badges (21-19/21-21) (shots 28, 29). |
| 21-21 | Resolving forms | PASS | Clean register, add then exact-mitigate each: "2", "Div 2", "Division 2", "D2", "Div. 2" -> only #1,#2 "⚠ MED hazard in area"; "B1" and "Basement 1" -> only #5 (Sub Div 1), not #4; "Div 1, Div 1 rear" -> only #4; "div 3" -> only #3 (shot 30). |
| 21-22 | Highest wins | PASS | "Div. 2" Medium + "D2" High: #1,#2 show HIGH (A and B); mitigate High: both MED; mitigate Medium: none (shots 31-33). |
| 21-23 | Clear and return, 2 devices | PASS | Mitigate clears immediately with no confirm; Reopen of High restores "⚠ HIGH hazard in area" on A and on B with no reload (shot 34). |
| 21-24 | No hold | PASS | Badged (HIGH) #1: deployed AT 25-36 via Assign Equipment (pending deploy), card in Assigned with badge, normal slide "Slide to set Strut Set" advanced to Strut Set with no prompt, then "Slide to send to Cutting Station" again; no dialog. Lane list (Pending Equipment ... Returned) and Filters sheet (Show/Sort/Division) contain no hold status; body text never contains "hold" (shots 36, 37, 38, 40). |
| 21-25 | Badge surfaces | PASS | Board: sentence form; Quick View (#1 drawer) "⚠ HIGH hazard in area" (shot 39); List and Division tiles compact "⚠ HIGH hazard" (shots 26, 27); archive of ended "Cascade Building Fire": #3 shows "⚠ HIGH hazard in area" (its own open Div 3 hazard) and Div 2 cards none (those were mitigated) (shot 56); a new op "Second Op" with a Div 3 point shows no badge (empty register) (shot 57). Cutting Station view: 0 badges while the same #1 on Board still shows one (positive control) (shot 41). |
| 21-26 | AT semantics | PASS | `.fs-spc-hazard` has no role, not inside an aria-live region, leading "⚠ " is `aria-hidden`; text reads "HIGH hazard in area" as part of the card; no `aria-disabled`/`disabled` anywhere in the card; slide controls keep their labels ("Slide to set Strut Set", "Slide back to ...") and are not aria-disabled. |
| 21-27 | Live announcements | PASS | `<p aria-live="polite" class="fs-sr-only">`: "Hazard added. HIGH, Structural instability, NE corner, Div 2." ; "Hazard mitigated. Marked by You, 2:00 PM." ; "Hazard reopened." |
| 21-28 | Export | PASS | Download `ICS-208-hazards-cascade-building-fire.csv`, header exactly `Type,Location,Severity,Status,Reported,Reported by,Mitigated,Mitigated by`, CRLF, one row per hazard (36 rows incl. open + mitigated at export time); location `=1+1` written as `'=1+1` (neutralized); Reported-by cells are device uids (as brief). Sample: shots/export-sample.csv. |
| 21-29 | Export changes nothing | PASS (+ NOT-BUILT sub-item) | Rows/section counts identical before/after export. Audit log (Settings -> Administration -> Audit log) after two exports lists only Hazard logged/mitigated/reopened, status and equipment entries and no export row: the spec's "records an export event" is NOT-BUILT (shot 43). |
| 21-30 | Long text | PASS | 600 chars in Location and 600 in Notes: no error, sheet closed, row reads back whole (650 chars with meta), announcement carries it, synced to B and present in the emulator event log. Observation: ADR-042 section 5 says hazard location/notes are capped at 500 chars at commit; `src/core/schema/hazard.ts` has no `.max()` so no cap exists (shot 44). |
| 21-31 | Edit / delete | NOT-BUILT | Detail sheet has only Close handle + Mitigate/Reopen; no Edit field controls. No Delete either, so nothing can be silently removed (shot 09). |
| 21-32 | Offline add | PASS | A `goOffline` (+offline event): banner "Offline — will sync when you reconnect"; added High "Div 3": row immediately in the log, Board #3 badge "⚠ HIGH hazard in area" and chip "2 open · HIGH" via client-side nav; B (control) did not show it while A offline; after `goOnline` B showed it with no reload and B's board had the #3 badge (shots 51-53). Warm offline only. |

## FAIL repro steps
- 21-07 (copy/minor): A (founder, Admin "Reyes") on phone: Command -> Hazards -> Add Hazard -> Location "NE corner, Div 2", High -> Add. Row meta reads "Reported 2:00 PM · You". Add a hazard on B (127.0.0.1, Okafor) and look at it on A: "Reported ... · A teammate", never "Okafor". Cause: HazardLog.tsx `who()` looks up `members[uid]`, `members` is keyed by auth uid (emulator `orgs/<dept>/members` = auth uids), but `reportedBy`/`mitigatedBy` hold the per-device uid (`orgs/<dept>/deviceOwners` maps device -> auth uid). The lookup never hits, so the admin name path is dead code. No decision names this as intended (the file comment says admins see names). Fix area: resolve device uid -> auth uid via deviceOwners before the members lookup, or store the display name. Also affects the mitigate announcement "Marked by <who>".

## SPEC-DRIFT list
- 21-18: persistent-header Safety/hazard entry is not in a header on every tab; chips live on the Operations board strip, Cutting Station and Command rail (#487, #490, Superseded table; IncidentChips.tsx header comment).

## Other observations (no criterion verdict change)
- Detail sheet exit: while the sheet closes (Esc) the title flashes "Hazard" with an empty body for about one frame before unmounting (title falls back to 'Hazard' when the target is null). Minor visual.
- Chip aria-label grammar "1 open hazards, highest LOW" at count 1 (copy).
- Sunlight theme contrast: badge and chip white on rgb(185,28,28) = 6.47:1; log meta text 21:1. Cleared tag not measured.
- Division picker lists sub-grade as "Sub Div 1 (Basement)" on the card and picker; "Basement 1" in a hazard location maps to it (21-21).
- Add flow: Pending cards deploy straight to Assigned via "Assign Equipment" (Pending slide skipped, "one-step deploy"); the 21-24 advance was driven on that card's slides.

## Deferred, not driven
- Broadcast wall-board (Cross-surface table): #496.
- Assembled ICS-208 form export and after-action packet convergence: #494 / #495 (v4.0 ships the CSV only).
- Structured building -> division -> area hazard binding / per-area badging: Phase G gate review #7, #511 multi-building half.
- ICS-201 brief "Open hazards" count: covered by briefs 22/24.

## Console notes
Baseline 2 (vite connect debug). After the mark: 0 error-level messages and 0 page errors across all scripts on A, B and guest; no requests to production Firebase hosts (routed/aborted). Known dev noise ("Transition was aborted ...") did not appear.
