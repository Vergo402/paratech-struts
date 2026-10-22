# #540 verification: 3-Post cross-rig lock (real UI, emulator)

- Date: 2026-10-22
- HEAD: 794d6a1 (branch claude/threepost-cross-rig-lock-b7660a)
- Origin: http://localhost:5200 (dev:emu, Auth :9099, RTDB :9000), viewport 390x844
- Account: qa540-1@example.test (emulator sign-up); dept "QA Dept 540"; operation "QA 540 Op" (Utilize Pending Card ON; turned OFF only for check D)
- Shots: .claude/audits/phase-j/fixes/540/shots/ (JPEG, copied from the browser pane)

## Setup
Rigs Truck 3 and Rescue 2. Truck 3: LS 610 x3. Rescue 2: LongShore 12" ext x2. Point #1: T-Shore 130" (10 ft 10 in), 4x4/4x4, 30,000 lb, Pending.
Setup deviations (my taps): a stray 24" ext and (later) a wrong-family 12" ext landed on Truck 3; both removed via the steppers. Check A was re-run on clean stock (shot 07) to be safe.

## Verdicts
| Check | Verdict | Proof |
|---|---|---|
| A. Locked | PASS | Button "Add 2 more struts — deploy as 3-Post on 6×6" `disabled=true`; reason text exactly `LS 610 on 6×6 needs a 12″ extension not on Truck 3.`; card badge "Extension from Rescue 2". Click: dialog stays, board unchanged (1 pending #1, Assigned 0, no group badge). Shots 01, 02; re-run on clean stock 07 (single card, same result). |
| B. Deploy 1 of 3 anyway | PASS | Ack ticked (3-Post button stayed disabled), "Deploy 1 of 3 anyway" enabled. Path: Review sources panel (STRUT LS 610 Truck 3 · 3 available; EXTENSION 12″ Rescue 2 · 2 available) then "Confirm & deploy". Result: #1 in Equipment Assigned, "LS 610 + 12″", announcement "LS 610 + 12″ deployed — Div 1, Equipment Assigned." Stock: Truck 3 LS 610 2 left of 3; Rescue 2 12″ 1 left of 2. Shots 03-06. |
| C. Positive control | PARTIAL / FAIL as specified, PASS with 3 ext on Truck 3. After fix: C′ re-drive PASS (section "C′ re-drive after fix"), caveat: cross-rig badge not reproduced | See findings F-A and F-B below. Shots 08-12a. |
| D. Add Shore Point modal | PASS (screenshot only) | With Pending Card OFF, 12″ ext free only on Rescue 2 (Truck 3 free ext 0, LS 610 free 3): "Find Available Struts" card LS 610 + 12″ shows the 3-Post button ENABLED, note "Switches header and footer to 6×6: strut 119″, cut 117 1/2″. Deploys all 3 LS 610 + 12″ from Truck 3". Not pressed. Shot 13. |

## Findings (not in the brief)
**F-A (high): enabled 3-Post button, tap refuses, when the card's extension source is the other rig.** Truck 3: LS 610 free 4 + 12″ ext x2; Rescue 2: 12″ ext free 1. Point #2 (same numbers). Card badge still "Extension from Rescue 2", but the 3-Post button is ENABLED with "Deploys all 3 LS 610 + 12″ from Truck 3" (shot 08). Tap: nothing deploys, alert `Nothing would deploy from Truck 3 (Extension from Rescue 2) — the shore was left as is.`, shore stays one pending T-Shore, stock unchanged (shot 09). Safer than F1's old behaviour (no rebuild, no stranded pending members), but the lock and the executor disagree: the lock treats Truck 3's 12″ as usable, the executor uses the card's Rescue 2 extension source. Once Rescue 2 had 0 free ext the badge became "All on Truck 3" (shot 10).
**F-B (high): "Deploys all 3" is promised with only 2 extensions on the rig.** Truck 3: LS 610 free 4 + 12″ ext x2 (the brief's stock), Rescue 2 ext 0 free. Card "All on Truck 3", button ENABLED "Deploys all 3 LS 610 + 12″ from Truck 3". Tap: shore rebuilt as 3-Post, 2 members deployed, 1 stayed Pending ("Waiting for inventory"), announcement "Deployed 2 of 3 — 1 stayed Pending Equipment, out of stock." (shot 11). A 3-Post of LS 610 + 12″ needs 3 extensions; the enable check does not count them against 3 (stock only 2). Same class as F1 (partial/pending 3-Post), now reachable when the extension count is short instead of the source being cross-rig.
**C with enough stock (PASS):** after adding 3 more LS 610 and 4 more 12″ on Truck 3 (LS 610 free 5, 12″ free 4), a fresh T-Shore #3: card "All on Truck 3", button enabled with the expected note (12a). Tap: #3 became a 3-Post, three members (POST 1/3 shown, POST 2, POST 3 tabs) all in Equipment Assigned, announcement "3× LS 610 + 12″ deployed — Div 1, Equipment Assigned."; Truck 3 LS 610 5 to 2 free, 12″ 4 to 1 free (deployed total 6 to 12). Shot 12.
Side note: card for #2 remnant (POST 3/3) left Pending, "Needs LS 1016 or LS 406 (+3 more) — none on scene" at that time.

## Console
Baseline at start: 6 messages (vite debug + React DevTools info), no errors. After the run: 2 error-level entries, both `Uncaught (in promise) AbortError: Transition was skipped` (view-transition noise sibling of the known "Transition was aborted"); no sync, rules or RTDB errors; no warn-level entries.

## C′ re-drive after fix (HEAD 794d6a1, working tree has uncommitted edits to threePost.ts / threePost.test.ts / AssignEquipmentSheet.test.tsx, HMR live)
- Session: already signed in as qa540-1 (no sign-in needed); page reloaded; 390x844.
- Stock before: Truck 3 LS 610 3 free of 9, 12″ ext 3 free of 8 (topped up with the stepper); Rescue 2 12″ ext 3 free of 4.
- Shore: new Pending #4, T-Shore 130″ (10 ft 10 in), header/footer 4×4, load 30,000 lb (the only other Pending was #2's POST 3/3 remnant).
- Card "LongShore · LS 610 + 12″": badge **"All on Truck 3"** (not "Extension from Rescue 2"). 3-Post button `disabled=false`, text "Add 2 more struts — deploy as 3-Post on 6×6", note exactly: `Switches header and footer to 6×6: strut 119″, cut 117 1/2″. Deploys all 3 LS 610 + 12″ from Truck 3`. Shot 14.
- Tap result: #4 became a 3-Post (POST 1/3, POST 2, POST 3 tabs), all three in Equipment Assigned (Assigned count 6 to 9), no alert/refusal. Announcement (aria-live): `3× LS 610 + 12″ deployed — Div 1, Equipment Assigned.` Shot 15.
- Stock after: Truck 3 LS 610 0 free of 9 (all 9 deployed), 12″ ext 0 free of 8 (all 8 deployed); Rescue 2 12″ ext 3 free of 4, unchanged. Shot 16.
- Verdict: PASS for the specified check.
- **Caveat: this stock did NOT reproduce the original F-A condition.** With Truck 3 holding 3 free 12″ extensions the scene-wide card sourced everything from Truck 3 ("All on Truck 3"), so the cross-rig path ("Extension from Rescue 2" badge plus an enabled button) was not exercised. The earlier F-A state had Truck 3 with only 2 free 12″ ext and Rescue 2 with 1 free (and the F-B short-count issue overlaps there). A true F-A re-test needs that stock (Truck 3 ext 2 free, LS 610 4 free, Rescue 2 ext 1 free), where the expected post-fix result is a deploy from Truck 3 rather than "Nothing would deploy"; F-B (2-of-3 partial) is a separate issue. Not run here.
- Console: not re-read in this pass; no error UI seen.
