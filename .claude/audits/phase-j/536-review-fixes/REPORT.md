# QA 536: one-tap 3-Post review fixes (branch fix/asp-deploy-followups, a9fca24)

Driven in the built-in browser pane at 390x844 against the Firebase emulators. No source edits, no git writes, dist/ untouched.

## Harness deviation
Ports 5200 (vite), 9099 (Auth) and 9000 (RTDB) were already held by another session's processes from the `bold-lederberg-2d32f3` worktree (a different checkout), so `npm run emulators` failed ("port taken") and `dev:emu` on :5200 would have served the wrong code. I ran my own checkout's `vite --mode emulators --port 5201` and reused the already-running emulators (fresh account/dept, so isolated). I stopped my :5201 server; I did not touch the other session's emulators or its :5200 server (still running).

## Setup
Account qa536-1@example.test (password not recorded), dept "QA Dept 536", rig "Rescue 2": LS 203 x4, LS 304 x4, LS 406 x4, 24" extension x4. Op "QA 536 Op", Pending Card OFF (one-step). A stray 67" extension was added by a mis-click and removed (back to 0) before the checks. 12" extension x4 added for the unlock check.

## Verdicts
| Item | Verdict |
|---|---|
| M2 extension-not-on-scene lock | PASS |
| L1 lock wording | PASS |
| M1 zero-margin caution | PASS |
| M3 runner card withholds Secured while re-cut flagged | PASS |

### M2
Numbers: T-Shore, 5 ft 9 in (69"), header/footer 4x4 (required strut 62"), load 50,000 lb, one-step Find.
- Cards: LS 406; LS 304 + 12" (not yet stocked then: shown as LS 203 + 12" after stock); LS 304 + 24" card. On the LS 304 + 24" card (x3 struts needed): "Add 2 more struts - deploy as 3-Post on 6x6" DISABLED, visible reason exactly `LS 304 on 6×6 needs a 12″ extension no rig on scene has.` Shot m2-1-locked-reason.jpg. (Other cards LS 406 etc. stayed enabled with helper "strut 58", cut 56 1/2"".)
- Acknowledge checkbox ticked, "Deploy 1 of 3 anyway" enabled (DOM disabled=false), clicked: modal closed, one Equipment Assigned card #1 (LS 304 + 24", 69" opening), inventory showed 1 deployed on LS 304 and 24" ext. Shots m2-1b-ack-checked.jpg, m2-2-deployed-anyway-card.jpg.
- Added 12" extension x4 to Rescue 2, repeated Find with same numbers: button on the LS 304 cards ENABLED, helper `Switches header and footer to 6×6: strut 58″, cut 56 1/2″. Deploys all 3 LS 304 + 12″ from Rescue 2`. Shot m2-3-unlocked-with-12in-ext.jpg. I did not press the enabled button (not requested).

### L1
Numbers: 3 ft 10 in (46"), 4x4/4x4 (39" strut), load 50,000 lb. LS 304 card: add button disabled, reason text exactly `LS 304 won't fit a 3-Post on 6×6 (35″, minimum 36″).` (ends with the parenthesis). Dialog text contains no "Pick wood and press Find again" (checked in the DOM). Shot l1-lock-wording-46in.jpg. Same screen: LS 203 card enabled (35" fits 26-36).

### M1
The test's boundary search, re-run with my real stock via vite-node (scratch script in this folder, `m1.ts`), gave one opening: 61" (5 ft 1 in), LS 304 + 12" at 4x4, refit LS 304 alone at 6x6, 50" = max reach. In the UI at 5 ft 1 in, 4x4/4x4, 50,000 lb: LS 304 + 12" card shows `Fully extended — zero margin. On 6×6 the strut is at its maximum reach (50″).` under helper `Switches header and footer to 6×6: strut 50″, cut 48 1/2″. Deploys all 3 LS 304 from Rescue 2`; add button enabled. Shot m1-zero-margin-caution-61in.jpg.

### M3
Real path found: an ungrouped point hard-locks sizing past Pending, so the re-cut flag only arises on a GROUPED shore (Double-T) via the Pending mate's Edit fanning to every leg ("Re-measure this shore?" confirm, "Update all legs"). Steps: Double-T 4 ft 0 in, 4x4/4x4, no load, Save as Pending; assigned both legs (LS 304); slid to Strut Set and Cutting Station (group zone moves both legs together); leg 1 (Post 1/2, cut 39 1/2") Mark Cut Done, Send to Runner; leg 2 slid back Cutting -> Strut Set -> Assigned -> Pending (confirm "Return & Step Back"); Edit leg 2, header and footer 6x6, Save, confirm Update all legs.
- Flagged runner card (leg 1, now cut 35 1/2"): chip `⚠ Re-cut: cut length changed after Cut Done`, caption `Re-cut before securing. Slide back to the Cutting Station.`, NO "Slide to set Wood Shore Secured" slider (DOM text confirmed), "Slide back to Cutting Station" present. Shot m3-1-runner-flagged-recut.jpg. Caveat (pre-existing, not part of this change): the floating checklist/inventory side pill overlaps the right end of the caption so it reads cut off at "Cutting Statio" in the screenshot; the DOM text is complete.
- Slid back: Cutting Station card shows banner "Cut length changed after Cut Done: was 39 1/2" on 4x4, now 35 1/2" on 6x6. Re-cut." and primary slide `Slide to mark Re-cut Done`. Shot m3-2-station-recut-done-slider.jpg.
- Slid Re-cut Done: banner gone, "Cut done" shown, "Slide to send to Runner" back. Sent to Runner: runner card has no chip/caption and shows "Slide to set Wood Shore Secured". Shot m3-3-runner-cleared-secured-slider.jpg.
- Unflagged control: point #1 (T-Shore, LS 304 + 24") taken Assigned -> Strut Set -> Cutting -> Cut Done -> Runner shows "Slide to set Wood Shore Secured" and no re-cut text. Shot m3-0-runner-unflagged-secured-slider.jpg. It kept showing it throughout.

## Console
Error-level entries: 0 (only vite debug and React DevTools info lines).

## Notes
- Pane quirks: screenshots lag a render behind actions (wait ~2 s); `form_input` does not update React state (use click then type).
- Screenshots (JPEG): /private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/cecb6067-68df-4426-bd6c-336700fa1a85/scratchpad/qa-536/shots/
- Slider drags were done with real pointer drags; Save/Deploy/Assign buttons were sometimes triggered with DOM .click().
