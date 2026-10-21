# #251 verification, spec 13 (Cutting)

- Date: 2026-10-21. HEAD 64bb0b3 (v4-redesign; brief addendum cited fb8204a). No source edits, no state-changing git.
- Harness: emulators (Auth :9099, RTDB :9000) + `npm run dev:emu` :5200; ports free before, stopped after.
- Origins: device A http://localhost:5200 (Admin, 390x844 touch phone; 1024x768 mouse for desktop rows); device B http://127.0.0.1:5200 (Default role, 390x844 touch).
- Dept "QA Dept 13", rig "Rescue 13" (LS 304 x8, LS 406 x6, AT 37-58 x4, LS 203 x3), op "QA Op 13" (Pending Card ON). Accounts qa251-13-1/-2@example.test.
- Setup deviations: SP7 (3-Post 12") can never leave Pending (no strut fits 1"), so 13-10 was driven by editing the SP4 group to 12" via a Pending mate. SP9 (T-Shore, 50,000 lb, "Deploy 1 of 3 anyway") added for the capacity chip; SP10 (bottom plate) and SP11/SP12 (4'9") added for plate and cross-device rows. 3-Post groups render as one stacked card; "Bring Post 2 to front" selects the middle member.
- Console baseline: 2 messages before first sign-up. Screenshots: `.claude/audits/phase-j/251-verify/13/shots/` (54 files). Drive scripts: scratchpad qa-251-13/s*.mjs.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 13-01 | Strut Set slide labels | PASS | Touch: "Slide to send to Cutting Station" / "Slide back to Equipment Assigned". Mouse: "Send to Cutting Station" / "Back" (compact "Back" per Slider.tsx:158; brief's "Back to Equipment Assigned" is not the mouse label, minor). Shot 10, 35. |
| 13-02 | Advance commits, no modal, lane + chip | PASS | SP2 slide: 0 dialogs before/after, board Cutting lane shows #3 "33 1/2″ CUT", segment aria "Cutting Station, 2 in queue" (chip rose per slide). Shot 11, 12. |
| 13-03 | Group-wide advance | PASS | "Bring Post 2 to front", slid: polite region "3 shore points — now Cutting Station."; chip 3 to 6; all three legs in lane. Shot 13, 14. |
| 13-04 | Group step-back | PASS | Group hero "Slide back to Strut Set": polite "3 shore points — back to Strut Set."; board shows one 3-card group in Strut Set. Shot 27. |
| 13-05 | Reachable via Cutting segment | PASS | One tap; `h2` "Cutting Station", section aria-label same. Shot 20. |
| 13-06 | "N cuts in queue" | PASS | `.fs-cutstation-count` role=status: "6 cuts in queue", "5 cuts…", "1 cut in queue" singular (desktop run). |
| 13-07 | Hero badge + largest number | PASS | "Cut this now", number 64px (next largest 24px), label "CUT LENGTH" beneath. Shot 20. |
| 13-08 | Cut = opening − picked wood − 1½″, no plates | PASS | SP1 51½, SP2 33½, SP3 48½, 3-Post 47½, SP8 (6×6/4×4) 49½, SP9 51½. SP10 with 6″ Swivel bottom plate (strut 51⅛) hero 51½ (plate ignored). Shot 51, 52. Floor check: eighth-granular input never needs a floor; brief's "5′0⅞″ → 51½″" is arithmetic-wrong (52⅜). Strut-deduction edits after Pending are locked, so invariance shown via the plate point. |
| 13-09 | Math line | PASS | "Opening 60″ − 4×4 header + footer − 1½″ wedge"; mixed: "Opening 60″ − 6×6 header − 4×4 footer − 1½″ wedge"; 3-Post: "6×6 header + footer". Always shown (note per brief). |
| 13-10 | 0″ and too-small chip | FAIL (copy/minor) | Hero "0″", no negative number anywhere, chip present, but reads "⚠ Opening too small for this header and footer wood — verify measurement" (does not name the picked sizes as the addendum expects; CuttingStation.tsx:288 SME-3 comment names no wording change). Reached by editing the SP4 group to 12″ (SP7 itself cannot leave Pending). Shot 48. |
| 13-11 | Hero subtitle | PASS | "Div 1 · A · T-Shore" and "Div 1 · C · 3-Post 1 / 3". |
| 13-12 | No duplicate cut length/location | PASS | Hero text: cut length once, "Div 1" once. |
| 13-13 | Capacity chip | PASS (caveat) | Clean hero (SP1): no chip. SP9: "⚠ Over capacity" directly under the math line; SP4 group at 12″: "⚠ No matching strut — 1 of 3 struts standing". Plain "Over capacity" lacks the "1 of 3" context (same text as board card). Shot 47, 48. |
| 13-14 | FIFO + group order | PASS | Hero SP1, Up next 1..5 = SP2, SP3, then group 1/3, 2/3, 3/3 ("Position N" aria). After step-back/re-entry SP1, SP2 went to the tail. |
| 13-15 | Up next read-only | PASS | Rows carry 0 controls; tap changed nothing, 0 dialogs; count chip = queue − hero. |
| 13-16 | No reorder control | PASS | No grip/handle/draggable/Move-up on phone or 1024x768 (tablet reorder Deferred, absence recorded). |
| 13-17 | Mark Cut Done | PASS | Touch "Slide to mark Cut Done" + "Slide back to Strut Set"; after commit "✓ Cut done", queue count 5 unchanged. Shot 23. |
| 13-18 | Announcement | PASS | polite "Cut done marked. Slide to send to runner." |
| 13-19 | Controls swap | PASS | "Slide to send to Runner" + "Slide back — clear Cut Done". |
| 13-20 | Clear Cut Done | PASS | Flag gone, "Slide to mark Cut Done" back, 0 dialogs, polite "Cut done cleared." |
| 13-21 | Send to Runner | PASS | "5 cuts" to "4 cuts", next cut hero, "Sent to runner" tail with 0 sliders/buttons. Shot 25. |
| 13-22 | Board Runner lane | PASS | #4 in Runner lane with "Slide to set Wood Shore Secured"; polite "Shore point — now Runner."; sending group leg 1 left legs 2/3 in Cutting. Shot 26. |
| 13-23 | Runner to Cutting keeps FIFO + done, not claim | PASS | SP1 back from Runner: board card "✓ Cut done"; Up next row 1 (original order); on Saw B hero it still showed "✓ Cut done". |
| 13-24 | #475 one saw | PASS | Sent SP1: hero SP2, nothing vanished; step SP1 back: count 5 (group of 3 also queued), hero SP2, Up next row 1 = SP1. Counts differ from brief only because the 3-Post group was queued too. Shot 28. |
| 13-25 | #475 two saws | PASS | "Add a saw": polite "Saw B added to the Cutting Station."; Saw B holds SP1 (bounced), Saw A keeps SP2. Exact empty state later with two cuts, one per saw: "UP NEXT 0 / Nothing waiting — every cut is claimed." Shot 29, 53. Desktop shows both heroes. |
| 13-26 | Phone saw picker | PASS | Intro text exact; cards "Saw A / Cutting 33 1/2″ · SP-3 / 3 waiting in the shared queue"; picked view "‹ Stations" + "Saw A" + "Saw B is on its own cut (SP-1) — not in your queue." Shot 29-31. |
| 13-27 | Empty states | PASS | Fresh op: "No cuts queued / Cuts arrive when a shore point is moved to Cutting Station on the Operations board". Drained: "All cuts done / Every queued cut has been sent to the runner" + Sent to runner tail. Shot 70, 72. |
| 13-28 | Red-slash | PASS | Hero step-back: card "Removed from cut list" + Dismiss, still present after 10 s (shot 22); Dismiss removes it; Board Strut Set lane has the point. (A page reload also clears it.) Shot 21, 22, 24. |
| 13-29 | Step-back clears bookkeeping | PASS | SP2: Mark/Clear done, step back, slide forward: re-entered at tail, hero later showed "Mark Cut Done" (no stale flag). |
| 13-30 | Cross-device arrival + "1 new" | PASS | B on Cutting picker: A slides SP12; B shows "1 new" (aria "1 new cut sent from another device"), waiting 1 to 2 without reload; badge gone after B leaves and returns. Shot 60. |
| 13-31 | B cut/runner reaches A | PASS | B sent SP8, marked SP11 done and sent: A's untouched Board went Cutting 3 to 2, Runner lane gained SP11. Shot 61. |
| 13-32 | Offline | PASS | B offline: Mark Cut Done + Send to Runner on SP12 commit locally, banner "Offline — 2 changes saved on this device", 0 native alerts, 0 dialogs; A unchanged until reconnect, then Runner 8 with SP12. Shot 62, 63. |
| 13-33 | Tap geometry | PASS | Touch hero: advance 56 px, step-back 48 px (326 wide, 8 px gap); desktop buttons 56 px. |
| 13-34 | Role gate | NOT-BUILT | Member B (Default role, no ICS position) committed Mark Cut Done and Send to Runner (control: success), no denial text exists. |
| 13-35 | Actual-cut input | NOT-BUILT | No input/textarea in station hero (phone, 1024x768) or in the card detail sheet (runner card opened). |
| 13-36 | Re-cut flag | SPEC-DRIFT | Path: leg 1 Cut Done + Runner, legs 2/3 back to Pending, Edit leg 2 wood, "Update all legs". Board Cutting card shows exact "⚠ Re-cut: cut length changed after Cut Done"; hero shows "⚠ Cut length changed after Cut Done: was 47 1/2″ on 6×6, now 51 1/2″ on 4×4. Re-cut." (CuttingStation.tsx:117 "accepted mockup" names this hero sentence). Hero: primary "Slide to mark Re-cut Done", send to Runner withheld, "Slide back — clear Cut Done" kept, "✓ Cut done" hidden (board card still shows "✓ Cut done" while flagged, minor). Shot 41, 42. |
| 13-37 | Re-cut Done | PASS | Chip clears, "✓ Cut done" returns, "Slide to send to Runner" returns, polite "Re-cut done marked. Slide to send to runner." Re-flagging then "Slide back — clear Cut Done" cleared the flag and restored "Slide to mark Cut Done". Shot 43, 46. |
| 13-38 | Old vs new text | PASS | Hero states "was 47 1/2″ on 6×6, now 51 1/2″ on 4×4" (and the reverse on the second edit). |

## FAIL repro
- 13-10 (copy/minor): any hero with cutTooSmall (e.g. edit a Pending 3-Post group mate to 1′0″ on 6×6, Update all legs, open the station). Chip text lacks the picked wood sizes. Fix area: CuttingStation.tsx ~line 288.

## SPEC-DRIFT list
- 13-36: hero re-cut chip is the "was/now" sentence, not the board's "Re-cut: …" chip (accepted mockup, CuttingStation.tsx:117).
- 13-01 mouse label "Back" (Slider.tsx:158), recorded under PASS.

## Console notes
- Baseline 2 messages. Only message seen after the mark: known `Transition was aborted because of invalid state` pageerror on route change. All per-script error lists otherwise empty on A and B.
- Not driven: exit-animation flash and Sunlight-theme contrast probes. One two-context script hung (timeout) before B's first load completed; rerun with identical code passed, cause not isolated.

## Deferred, not driven
Tablet drag reorder (G-16), cross-tablet saw-claim mirroring (#369), ticking peer badge (M11), broadcast projection and laptop keyboard reorder, B6/M6/M14 deferrals, #525/#520.
