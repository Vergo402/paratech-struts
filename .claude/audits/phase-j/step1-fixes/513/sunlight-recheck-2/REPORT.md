# #513 Sunlight re-check 2: error/alert text on --danger-ink (QA driver, 2026-10-13, ~04:44-04:57)

Build under test: primitives/admin/operations/inventory/styles.css mtime 04:37:57, tokens.css 04:18:31 (identical at start and end). Harness: fieldshore-emulators + fieldshore-v4-emu (:5200); Auth traffic confirmed going to http://127.0.0.1:9099 (emulator), never googleapis. Throwaway accounts and dept lived only in the emulator (no persistence on exit).

Theme method: Sunlight = localStorage.fieldshore_theme='sunlight' then reload (same key as the Settings picker; the app's ThemeProvider/pre-paint script applied it; data-theme=sunlight and --danger-ink #991B1B / --danger-text #FFFFFF confirmed in computed tokens). Light and Dark = document.documentElement.dataset.theme flip with the same element still on screen, 1 s settle, then read. Effective background = first opaque ancestor background, opacity product 1, no background images.

| Criterion | Element / text | Sunlight | Light | Dark |
|---|---|---|---|---|
| 1 FIELD error (/auth) | .fs-field-msg--error "That email and password don't match." | #991B1B on #FFFFFF 8.31 PASS | #B91C1C on #F7F6F3 5.99 | #F87171 on #101214 6.79 |
| 2 MODAL error | .fs-modal-error in Delete Shore Point (holder guard #421) | #991B1B on #FFFFFF 8.31 PASS | #B91C1C on #FFFFFF 6.47 | #F87171 on #2E333B 4.59 |
| 3 GATE (non-text) | .fs-gate--over-capacity border-left 3px + .fs-gate-glyph | #991B1B on #FFFFFF 8.31 PASS | #B91C1C 6.47 | #F87171 on #252930 5.28 |
| extra | .fs-set-row--danger label "Delete account" | #991B1B on #FFFFFF 8.31 | #B91C1C 6.47 | #F87171 on #252930 5.28 |

Criterion 4 (Light/Dark hex unchanged): PASS for all four rows. 4.59:1 (dark modal error, 12px caption on the elevated panel) is the thinnest margin measured; the colour is unchanged by the sweep.

How reached:
- (1) Wrong-password sign-in for a never-registered random email on /auth. The first attempt, "Email me a sign-in link" with "not-an-email", was accepted by the emulator (200) and showed "Check your email" with no error, so it is unusable locally.
- (2) Delete renders only on an expanded Pending card (ShorePointCard.tsx:434/462) and a Pending point never carries a deployment (operationStore.ts:253-259), so the brief's single-device path cannot work. Race used: A (localhost:5200, Admin) expanded the Pending card and opened the Delete confirm and left it open; B (127.0.0.1:5200, Default member via invite code) assigned and deployed LS 304; A's board behind the modal showed Pending 0 / Assigned 1 / "LS 304" (ingested); A pressed Delete; the store rejected it and the error line rendered.
- (3) Quick Find signed in: 3 ft 6 in + estimated load 150000 lb, "LS 203 + 12 in extension", gate text "Load exceeds rated capacity at the 4:1 safety factor", sheet also shows the .fs-gate--disclaimer variant (border-left none, secondary text; not what the sweep targeted).

Not reached (swept rules left unexercised): .fs-badge--dot-danger, .fs-al-badge--danger, .fs-field-input--invalid:focus border, .fs-gate-ack-box (unrated-gate acknowledge box).

Notes: white on #B91C1C = 6.47:1 (Over capacity badge measured; destructive primary buttons use the same --danger-text/--danger-bg pair) sits under the 7:1 Sunlight bar tokens.css cites; it is an on-banner pair outside this sweep and pre-existing. Console on both tabs: only the benign "AbortError: Transition was skipped" plus one "Failed to load resource: 400", attributed to the deliberate wrong-password sign-in by log order only (network buffer had rolled over, not independently confirmed). Screenshots are tool JPEGs converted to PNG (some at 0.6-0.7 scale); the computed-colour JSON is the proof.

Evidence: .claude/audits/phase-j/step1-fixes/513/sunlight-recheck-2/ : 01-03 field error S/L/D, 04-05 race setup, 06-08 modal error S/L/D, 09-11 gate S/L/D, 12-14 settings row S/L/D, crit1-field-error.json, crit2-modal-error.json, crit3-gate.json, extra-settings-danger-row.json, mtimes-start.txt, mtimes-end.txt, commands.log.
Teardown: both origins wiped from /favicon.svg (IDB, localStorage, sessionStorage incl. QA passwords, SW, caches all empty), extra tab closed, v4-emu then emulators stopped, nothing listening on 5200/9000/9099.
