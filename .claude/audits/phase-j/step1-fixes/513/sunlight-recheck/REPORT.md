# #513 Sunlight re-check: per-theme --danger-ink fix

Date 2026-10-13, 04:24 to 04:33 local. Branch v4-redesign. Emulator harness (fieldshore-emulators, fieldshore-v4-emu :5200), tab http://localhost:5200 at 1024x768. Throwaway email sign-up (qa513sun@example.test; password generated in-page, never echoed), department "QA Dept Sun" (Admin), one rig Engine 1 with one line (LS 304 x1), operation "QA Op Sun" with Utilize Pending Card ON, one Pending shore point (T-Shore, Div 1, 42"). Nothing assigned or deployed, so `Remove Engine 1` stayed enabled (a deploy would have disabled it and measured the disabled style instead).

## Result: PASS (4 of 4)

Build under test: src/app/tokens.css 04:18:31, src/ui/primitives/primitives.css 04:19:21; mtimes identical at start and end of the run. Each theme was picked with the explicit Appearance radio (not System), and data-theme plus the CSS vars were read back in a separate eval each time:
- Sunlight: --danger-ink #991B1B, --danger-text #FFFFFF
- Light: --danger-ink #B91C1C, --danger-text #B91C1C
- Dark: --danger-ink #F87171, --danger-text #F87171

Method: javascript_tool on the live page. Effective background starts at the button itself and walks up the ancestors, compositing alpha down to the first opaque layer (flagging any background-image or ancestor opacity below 1; none found, opacity product 1). Text colour is composited over that background and contrast is the WCAG relative-luminance ratio. Measured before any hover or press. The Sunlight ratio of 8.31 also clears the theme's own 7:1 target noted in tokens.css, not only 4.5:1.

| # | Control | Sunlight | Light | Dark |
|---|---|---|---|---|
| 1 | Inventory `Remove Engine 1` (tertiary destructive, enabled) | rgb(153,27,27) #991B1B on #FFFFFF, 8.31:1 (was 1:1) | rgb(185,28,28) on rgb(247,246,243), 5.99:1 | rgb(248,113,113) on #101214, 6.79:1 |
| 2 | Operations `End Operation` (tertiary destructive) | #991B1B on #FFFFFF, 8.31:1 (was 1:1) | rgb(185,28,28) on #F7F6F3, 5.99:1 | rgb(248,113,113) on #101214, 6.79:1 |
| 3 | Pending-card `Delete` (secondary destructive, ShorePointCard.tsx:462, card must be expanded) | #991B1B on #FFFFFF, 8.31:1; border 2px composited #C78282, 3.04:1 | #B91C1C on #FFFFFF, 6.47:1; border 1px #D88282, 2.82:1 | #F87171 on #252930, 5.28:1; border 1px #995154, 2.54:1 |

Notes on the table:
- "Was 1:1" comes from the earlier report (rgb(255,255,255) on rgb(255,255,255)); no pre-fix measurement exists for the Sunlight `Delete`, so nothing is claimed about its earlier state.
- Criterion 4: `Remove` matches the earlier report in Light (rgb(185,28,28) on rgb(247,246,243), 5.99:1) and in Dark (colour rgb(248,113,113); the earlier report did not record the Dark background). `End Operation` in Light and Dark was never measured before, so those two are checked against the token hex only (#B91C1C and #F87171).
- Delete border contrast is below 3:1 in Light (2.82) and Dark (2.54). That is not caused by this fix (--danger-ink equals --danger-text in those themes) and the text label identifies the control; flagged, not a failure.
- Every modal Cancel is a plain `variant="secondary"` with no destructive flag (for example AddShorePointModal.tsx:843), so the Pending-card `Delete` was the only destructive secondary on screen.
- Screenshots 01 to 09 show the dark-red label clearly legible in Sunlight (01 to 03) and unchanged in Light (04 to 06) and Dark (07 to 09).

## Surprise: the same white-on-white defect class remains in other Sunlight consumers (from source, NOT driven)

--danger-text is #FFFFFF in Sunlight and the modal surface (.fs-modal background --surface-elevated) is #FFFFFF. These rules still colour text or borders with --danger-text and no CSS file has a Sunlight override for them:
- `.fs-modal-error`: src/ui/inventory/inventory.css:380-384 (the #513 race alert, "Couldn't remove — equipment from this rig is still deployed.", RemoveRigButton.tsx:108), src/ui/operations/operations.css:1617-1621, src/ui/admin/admin.css:360-364. Also used by DeleteShorePointModal.tsx:117, StepBackConfirmModal.tsx:106, ReturnEquipmentModal.tsx:85, UserManagerScreen.tsx:434, 475, 522, 564.
- `.fs-field-msg--error` and `.fs-field-input--invalid` border: src/ui/primitives/primitives.css:477, 480. Used by AuthScreen.tsx:189 and 250, CreateDepartmentScreen.tsx:91, MeasurementInput.tsx:202, DeductionPicker.tsx:201 and 206, ChangePasswordGate.tsx:113, Input.tsx:115.
- primitives.css:91-92, 108, 297, 310, 350-352 (badge, gate glyph and ack box) also use --danger-text; not read against a surface in detail.
Route: fullstack-engineer. Likely fix is the same token (--danger-ink) on text-on-surface consumers, then a Sunlight drive of the #513 race alert (needs the two-device setup) and of an auth or measurement field error. Until driven this is a source reading, not a confirmed defect.

## Not covered
Hover and pressed states (the tertiary :active rule swaps to --text-primary); the `broadcast` token block (--danger-ink #FB8C8C) is not selectable in Appearance (System, Light, Dark, Sunlight only); `Delete role` (RoleEditorSheet) and `Revoke` (MemberEditSheet) share the tertiary destructive rule but were not opened; phone width, real touch and the beta channel were not run.

## Console, housekeeping
- Console (tab-5, errors only): only `Uncaught (in promise) AbortError: Transition was skipped` (View Transitions, once per full page load; also seen and ruled unrelated in the earlier #513, #464 and #469 runs). No sync-layer, React or Firebase errors, and no unsynced banner. No source files edited.
- Git: one read-only `git branch --show-current` (the preflight my role requires), nothing else.
- Teardown: localhost:5200 wiped from /favicon.svg (5 IndexedDB dbs, localStorage 2, sessionStorage 2 including the QA password, service workers 0, caches 0 afterwards), preview_stop on fieldshore-v4-emu then fieldshore-emulators, lsof shows nothing listening on 5200, 9000, 9099, 4400, 4500, 4000. Theme left on Dark (the original default). database-debug.log was re-created at the repo root (gitignored by *.log, left in place). The older pane tabs `seed` (localhost:9000) and `tab-1` (127.0.0.1:5200) were not touched.
- Evidence folder: /Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/step1-fixes/513/sunlight-recheck/ with 01 to 09 PNGs (named by theme, control, colour pair and ratio), measurements.json, commands.log (times approximate to a minute), mtimes-start.txt, mtimes-end.txt.
- Skill log: appended Observation 112 to ~/.claude/skill-observations/log.md (grep the remaining consumers of the old token after a token-level fix); the archival-on-write step was not run (22 resolved entries remain there for the scheduled review).
