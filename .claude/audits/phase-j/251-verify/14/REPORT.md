# #251 verification, spec 14 (Runner)

- Date: 2026-10-21. HEAD 183e111 (v4-redesign). No source edits, no state-changing git. Ports 5200/9000/9099 were free before; servers stopped after.
- Origins: device A http://localhost:5200 (Admin/IC, 390x844 touch phone; 1024x768 mouse for the mouse-form row), device B http://127.0.0.1:5200 (Default role member, 390x844 touch).
- Dept "QA Dept 14", rig "Rescue 2" (LS 304 x8, LS 406 x6, AT 37-58 x4, LS 203 x3), op "QA Op 14" (Pending Card ON, inline Assign Equipment). Accounts qa251-14-1/-2@example.test.
- Setup deviations: SP1 (60") deployed LS 406 not LS 304 (catalog choice); SP2 42" needs LS 203 (added to inventory); LS 304 on SP3/SP4. Wood 4x4/4x4 on T-Shores, 6x6/6x6 on 3-Posts. Added SP4 (3-Post) for the re-cut flag; step-back from Equipment Assigned to Pending raises a "Return N struts to inventory?" confirm (not a finding).
- Console baseline: 2 messages before first sign-up. Screenshots: .claude/audits/phase-j/251-verify/14/shots/ (41 files). Scripts: scratchpad qa-251-14/s*.mjs.

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 14-01 | Two controls on Runner card | PASS | Touch: "Slide to set Wood Shore Secured" + "Slide back to Cutting Station". Mouse form: "Set Wood Shore Secured" / "Back" (compact "Back", brief says "Back to Cutting Station"; same Slider.tsx:158 note as spec 13, minor). Shot 12, 60. |
| 14-02 | Heading + count + divider | PASS | h2 "Runner", chip 3 = 3 cards (SP2, SP1, SP3 1/3); `.fs-ops-phase-label` "Wood & return" precedes it (OperationsBoard.tsx:134; shot 80). |
| 14-03 | Context lines, apparatus pill, POST n/3 | PASS (caveat) | `.fs-spc-title` "Div 1 · C", `.fs-spc-where` "SP3 · 3-Post", badge "POST 1/3". Pill `.fs-spc-appar` renders only `assignedResource` (ShorePointCard.tsx:312), not the deploy source rig: absent until set; after setting Assigned = Rescue 2 via Edit, the SP4 Runner card shows "Rescue 2" pill. Source rig is in the detail sheet BOM ("LS 304 / Rescue 2"). Shot 13, 50. |
| 14-04 | Model suffix | PASS | `.fs-spc-value-model` "LS 304"/"LS 203"/"LS 406" on Runner cards; absent on Cutting cards. |
| 14-05 | Hero = cut length | PASS | SP2 33 1/2 CUT, SP1 51 1/2, SP3 47 1/2 (label "CUT"). |
| 14-06 | Advance, no confirm | PASS | 0 dialogs before/after; at 79 ms SP3 1/3 gone from Runner, present in Secured; Runner 3 to 2, Secured 0 to 1. Shot 20, 21. |
| 14-07 | Polite announcement | PASS | polite "Shore point — now Wood Shore Secured." |
| 14-08 | Individual for group | PASS | SP3 1/3 advanced: legs 2/3 stayed Runner, 3/3 stayed Cutting; text "Shore point —". With legs in Runner together, advancing one (UI on A; B; store control) left the others. |
| 14-09 | Step-back SP2 | PASS | No dialog; Cutting chip aria "2 in queue" to "3 in queue"; card in Board Cutting lane. Shot 14. |
| 14-10 | Step-back announcement | PASS | polite "Shore point — back to Cutting Station." |
| 14-11 | Cut done kept, send available | PASS (caveat) | Board Cutting card "✓ Cut done". Once hero, station showed "✓ Cut done" + "Slide to send to Runner" + "Slide back — clear Cut Done" immediately. Up-next row shows no done marker (known deferred glitch in brief). Shot 15, 16. |
| 14-12 | FIFO place kept | PASS | SP2 (earliest Cutting entry) bounced behind leg 3/3 claimed by Saw A; once free, SP2 became hero ahead of leg 3/3 (not tail). Shot 16. |
| 14-13 | #475 unclaimed, two saws | PASS | Saw A holding leg 2/3 unchanged after SP2 bounce, SP2 in Up next "Position 1"; later SP1 bounce with Saw A on SP2: A's hero unchanged, count 3 = Cutting points. "+ Add saw": Saw B claimed bounced SP1 fresh, A kept SP2, nothing vanished. Shot 17, 18. |
| 14-14 | No "Removed from cut list" | PASS | 0 `.fs-spc-removed`, no text, after bounce (positive control: spec 13's 13-28 red-slash on Strut Set step-back; not re-driven here). |
| 14-15 | Bounce + re-send round trip | PASS | Runner card before and after: "#2 Div 1 · A SP2 · T-Shore 33 1/2″ CUT LS 203", same text. Shot 19. |
| 14-16 | Secured step-back | PASS | "Slide back to Runner": no dialog, card back in Runner (3), Secured 0, polite "Shore point — back to Runner." Shot 22, 23. |
| 14-17 | Cross-device advance | PASS | B (no refresh) Runner 3 to 2, Secured 0 to 1 within 2.5 s. Shot 30, 31. |
| 14-18 | Cross-device step-back | PASS (caveat) | B Cutting chip "2 in queue" to "3 in queue", card in B Board Cutting lane "✓ Cut done"; B station picker shows Saw A holding the 47 1/2″ cut (Up next not opened per saw view). Shot 32, 33. |
| 14-19 | Broadcast row | Deferred | not driven (#496 / ADR-040). |
| 14-20 | No push/notification | PASS | B had Notification hook: no constructor calls, no permission request during A's advances/bounces; positive control `new Notification` recorded. |
| 14-21 | Offline | PASS | B offline: advance, secured step-back, runner step-back commit locally, 0 dialogs/alerts, banner "Offline — 3 changes saved on this device — will sync when you reconnect"; A unchanged while offline, then matched B after reconnect (Cutting 2 to 3, Secured 3). Shot 71, 72. |
| 14-22 | Role gate | SPEC-DRIFT | B (Default role, no ICS position) advanced Runner to Secured and stepped back; no block text, no assertive/alert region, 0 `.fs-slide-reason`. ADR-017 line 40: "A department role never gates a fireground action." Shot 70. |
| 14-23 | IC can advance/step back | PASS | A (IC) did both throughout. |
| 14-24 | Tap geometry | PASS | Touch: advance 56 px, step-back 48 px, 332 wide, 8 px gap, no overlap. Mouse buttons 56-83 px tall (1024 wide board columns narrow: buttons ~64 px wide, label wraps; shot 60, cosmetic). Floating quick-action stack overlaps the right end of the advance label on phone (shots 12, 80); not a control-on-control overlap. |
| 14-25 | Distinct direction/order | PASS | DOM order in `.fs-spc-slides`: `.fs-slide--advance .is-secured` (green) then `.fs-slide--stepback .is-cutting` (amber). Shot 12. |
| 14-26 | No destructive control | PASS | Runner card: no Remove/Return/Delete text; Secured card has "Remove & Return Equipment" (positive control, shot 22). |
| 14-27 | Accessible name | NOT-BUILT | No aria-label/labelledby on card; only head button text "#3 Div 1 · C SP3 · 3-Post POST 1/3 ›" and "Shore point number 3" span. No combined status/strut/group name. |
| 14-28 | Slide only on touch | PASS | Touch: 2 `.fs-slide` with tracks; the only extra buttons are aria-hidden tabindex -1 thumbs inside the sliders (Slider.tsx:198-204). Mouse: 2 buttons, 0 tracks. |
| 14-29 | Sunlight | PASS | Selected Sunlight in Settings (data-theme "sunlight"); dark text on light card, lane header, "Slide to set Wood Shore Secured" and step-back labels all clearly legible (visual; scripted ratio unreliable on transparent backgrounds). Reset after. Shot 80. |
| 14-30 | Stale-frame probe | PASS | 79 ms after commit: Runner 0 copies, Secured 1, 0 dialogs; same at 1 s. Shot 20, 21. |
| 14-31 | Re-cut flag on Runner card | PASS | Path as spec 13 (SP4: leg 1 Cut Done to Runner, legs 2/3 to Pending, Edit wood 6×6 to 4×4, Update all legs). Runner card: "⚠ Re-cut: cut length changed after Cut Done", caption "Re-cut before securing. Slide back to the Cutting Station.", only "Slide back to Cutting Station" slide (no Secured slide), hero 51 1/2″ (was 47 1/2″). Slide back: hero chip "Cut length changed ... was 47 1/2″ on 6×6, now 51 1/2″ on 4×4", "Slide to mark Re-cut Done"; after it "✓ Cut done" + "Slide to send to Runner"; Runner card again has the Secured slide. Shot 45, 47, 48. |
| 14-32 | Store refuses flagged Runner to Secured | PASS (card path only) | `operationStore.commit` ShorePointStatusChanged runner to secured on flagged SP4 leg 1: `{ok:false, reason:"cut length changed after Cut Done — re-cut before Wood Shore Secured"}`, status stayed runner; control on unflagged SP3 leg 3: `{ok:true}`, moved. Group-advance, Quick View and station paths not driven separately. Shot 46. |

## FAIL repro
None.

## SPEC-DRIFT list
- 14-22: no Runner role gate; ADR-017 (fireground is not role-gated). Not filed as a security bug.
- 14-01 mouse label "Back" vs brief "Back to Cutting Station" (recorded under PASS, minor copy).

## Console notes
- Baseline 2. After the mark only the known `Transition was aborted because of invalid state` pageerror on route change; every per-script error list on A and B otherwise empty. No prod-host hits.
- One two-context script hung (as in spec 13) and left partial B state; rerun with identical logic passed.
- Not driven separately: Quick View / group-advance / station paths for 14-32; Saw A/B pick views after the cross-device bounce.

## Deferred, not driven
14-19 Broadcast (#496 / ADR-040).
