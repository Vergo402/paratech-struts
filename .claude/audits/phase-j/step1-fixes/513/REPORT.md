# #513 QA proof: remove a stocked rig behind a confirm (Task 7)

Date 2026-10-13 (about 03:45 to 04:16 local). Branch v4-redesign (read from .git/HEAD). Emulator harness: preview_start fieldshore-emulators (2d6387d9...), then fieldshore-v4-emu :5200 (88aec040...). Two devices in one browser pane: A = http://localhost:5200 (Admin owner, qa513a@example.test), B = http://127.0.0.1:5200 (Default-role member, qa513b@example.test, joined with the invite code). Department "QA Dept 513" (id f16450d4-b92a-4c00-8623-b0ebee5d2a84). Passwords were generated inside the page, never echoed, kept only in tab sessionStorage and wiped at teardown. smoke.sh not run (it starts its own server).

## Result: works with caveat

The caveat fails no numbered criterion and is not specific to #513, but #513 exposes it on every rig, so I am leading with it.

**Sunlight theme: the enabled "Remove <rig>" label is invisible.**
- Enabled `Remove Engine 2` in Sunlight: computed color rgb(255,255,255) on an effective background of rgb(255,255,255), contrast 1:1, no border or outline. The button is in the accessibility tree and takes clicks; you just cannot see it. Screenshot 22.
- Cause (read from source): `--danger-text` is #FFFFFF in Sunlight (the ink for the filled primary banner), and `.fs-button--destructive.fs-button--tertiary { color: var(--danger-text); }` at src/ui/primitives/primitives.css:182 has no Sunlight override.
- Same primitive hides "End Operation" on the Operations board in Sunlight: it carries the same classes, color rgb(255,255,255) on rgb(255,255,255), 127x56 (screenshot 20 shows only "Begin Briefing" in that row).
- Not affected: Light (label rgb(185,28,28) on rgb(247,246,243), 5.99:1, screenshots 33/34), the disabled state in Sunlight (black on white 21:1, screenshot 19), and the dialog's confirm in Sunlight (solid red fill, white text, readable, screenshot 35).
- Route: fullstack-engineer, fix at the primitive (add a Sunlight override for the tertiary-destructive variant, then re-check End Operation). Whether it blocks merge is the orchestrator's call.

## Builds, and which criteria ran on which

| Build | RemoveRigButton.tsx mtime | Change | Ran on it |
|---|---|---|---|
| B0 pre-fix | 03:37:35 | original `confirming` state | crit 1 first dialog capture (shot 04); crit 6 (shots 02, 03) |
| B1 | 03:53:30 | dialog frozen on the target captured at open (coordinator note 1) | crit 1 re-run (shots 05 to 08): exit flash FOUND |
| B2 | 03:56:32 | `open` split from `target`; target kept while the modal animates out (coordinator note 2) | crit 1 phone dialog + Cancel (10, 11) and desktop Cancel (12); crit 2 Engine 1 confirm (13, 14); crit 5 (15, 16) |
| B3 | 04:00:52 | `confirm()` returns unless `open` (no coordinator note; found by my mtime check) | crit 3 (17 to 23), crit 4 (24 to 30), stray-tap test, Cancel-with-alert, last-rig confirm (31, 32), Light and Sunlight dialogs (33 to 35) |

- Criterion 5 ran on B2, about 50 s before B3 landed. B3 changed only `confirm()`, so the empty-rig `onPress` branch is untouched.
- Criterion 6 ran on B0, but the gate is `canManage &&` in InventoryScreen.tsx (mtime 03:37:44, unchanged all run), and RemoveRigButton is never rendered for a Default member, so the later component changes cannot affect it.
- InventoryScreen.tsx and inventory.css were unchanged (03:37:44) throughout. Final mtime check 04:14:44: RemoveRigButton.tsx still 04:00:52.
- I waited for mtime stability (at least 30 s) before every dialog run after a landing, reloaded the page, and fetched the served module from the dev server to confirm it held the new code (`setTarget` on B1, `setOpen` on B2).

## Exit-animation flash (coordinator request: pre-round-2 observation and post-round-2 result)

Instrument: a MutationObserver that logs each distinct text of `[role=dialog]` with data-state and ms.
- **Pre-round-2 (B1), FOUND.** On Cancel: open text, then at 35137 ms with data-state=closed `Remove Engine 1? | 0 items (0 units) stocked on will be removed from inventory. This cannot be undone. | Cancel | Remove Engine 1`, gone at 35329 ms (about 190 ms of wrong body text). Screenshot 07. The title survived only because it falls back to the live `rigName` prop. I messaged the coordinator at once.
- **Post-round-2 (B2), clean.** Cancel at phone width and at desktop: open text, then no dialog, no intermediate text (screenshot 11 is a mid-fade frame still reading "3 items (12 units)..."). Confirm on Engine 1: same, clean.
- **Final build (B3), clean.** Cancel on Engine 2; Cancel with the race alert showing (the alert line disappears at close, nothing nonsensical); Confirm on the last rig.
- **Stray-tap test on B3.** One eval: open the dialog, click Cancel, click the destructive button 70 ms later. At that moment data-state was "closed" and the button was still in the DOM. Rig NOT removed (tabs, strip and owner REST all unchanged). The `open` gate works.

## Criteria

| # | Criterion | Verdict | Proof |
|---|---|---|---|
| 1 | Stocked rig: button, dialog, focus, Cancel | PASS | Engine 1 = LS 203 x2, LS 304 x4, 6" Rigid Base x6 (3 items / 12 units; set up by importing engine-stock.csv, sha256 84ce60fa..., after adding the three rigs through the UI). Button: `<button class="fs-button fs-button--tertiary fs-button--destructive fs-button--op">Remove Engine 1</button>`, 142x56, centred, 24 px below the last group card, outside `.fs-inv-list` and every card. Dialog: role=dialog aria-modal=true, title `Remove Engine 1?`, body `3 items (12 units) stocked on Engine 1 will be removed from inventory. This cannot be undone.`, buttons Cancel (secondary 120x56) and Remove Engine 1 (primary+destructive 144x56). `document.activeElement` = `<button ...><span data-modal-cancel="true">Cancel</span></button>` inside the dialog, `document.hasFocus()` true (B0, B1, B2, B3 all the same). Cancel: main.innerText identical to the pre-open snapshot, strip "14 on hand 0 deployed 4 models" unchanged, focus back on the Remove button. Singular forms seen on Engine 2: `1 item (2 units)`. Files 01, 04 to 08, 12, 24; captured-text 04, 06, 07, 09. |
| 2 | Confirm: UI, IndexedDB, cloud | PASS | Engine 1 confirm (B2): dialog closed, tab and lines gone, header 3 to 2 apparatus, strip 14/0/4 to 2/0/1, selection moved to Engine 2 (first remaining), full reload keeps it, B (no reload) live-updated. IndexedDB (fieldshore-dept-f16450d4-...): inventory 1 row (Engine 2), 0 rows for apparatusId app-07bd9109-72bb-479e-808f-cc481e4ec015, none of the 3 line ids, meta roster [Engine 2, Engine 3]. Owner REST orgs/<dept>/inventory: inv-54455300-d37e-4aed-ae81-70487f3e7496, inv-b04f7fae-99aa-4c7d-aca5-83015d240230 and inv-dec78f84-7aca-479c-a2f2-4a74ccf07d5d are each `{"deleted":true,"id":"<id>","lastWriteAt":1791878335518}` (tombstones, not absent); Engine 2 row untouched. orgs/<dept>/apparatus value = [Engine 2, Engine 3]. Last rig (B3): Remove Engine 2 confirm gave "No apparatus yet / Add an apparatus to start stocking struts, extensions, and plates. / [Add apparatus]", IndexedDB 0 rows and roster [], REST all four ids tombstoned and the apparatus node holds only `lastWriteAt` (RTDB drops an empty array), B's live store also showed "No apparatus yet" (no reload). Files 13, 14, 31, 32; captured-text 05, 10, 21; rest/05, 06, 07, 09. |
| 3 | Deployed lock | PASS | Op "QA Op 513" (Utilize Pending Card on), point #1 T-Shore 42", Assign Equipment: LongShore LS 304, "Equipment located on: Engine 2", Deploy. Engine 2: strip "1 on hand 1 deployed 1 models", row "LS 304 ... 1 deployed ... 1 /2". `Remove Engine 2` has `disabled=""` (grey rgb(155,154,151), 145x56); `<span class="fs-button-reason">Return deployed equipment first.</span>` sits directly beneath it (179x16 at y=415, button bottom 411, opacity 1, no clipping ancestor). Pressing the disabled button: no dialog, nothing changed. Return path: Operations > Back > "Return LS 304 to inventory?" > Return & Step Back, then Inventory shows strip 2/0/1, row 2/2, button enabled (rgb(248,113,113)), sub-line gone. Files 17, 21, 23; captured-text 12, 16. |
| 4 | Race alert, second device | PASS | A opened `Remove Engine 2?` with nothing deployed (strip 2/0/1, underlying button enabled) and left it open. B (127.0.0.1:5200, Default member) deployed LS 304 on point #1. A ingested it live without reload: strip behind the modal "1 on hand 1 deployed 1 models", underlying button disabled plus sub-line, dialog text unchanged. Pressing the destructive `Remove Engine 2` on A: `<p role="alert" class="fs-modal-error">Couldn't remove — equipment from this rig is still deployed.</p>` (rgb(248,113,113), 12px, between body and buttons); dialog stays open; rig stays (strip 1/1/1). Owner REST: Engine 2 row still live (lastWriteAt unchanged 1791877835870), roster still lists Engine 2. Cloud event log (rest/08): the blocking EquipmentDeployed is from B's device (uid 4c2c6c4a..., receivedAt 1791878784367), A's own events carry uid 5ca876ca.... Files 24 to 30; captured-text 17, 18. |
| 5 | Empty rig | PASS | Engine 3 (0 items): same button class, 145x56, enabled. One click: rig removed immediately; the observer log never saw a dialog; selection to Engine 2; header "1 apparatus"; strip unchanged 2/0/1; IndexedDB roster [Engine 2], REST apparatus [Engine 2]. Files 15, 16; captured-text 11; rest/07. |
| 6 | Read-only member | PASS | B = Default role (join sheet: "Your role: Default"). On Engine 1 (stocked; the three lines had loaded from the cloud, so B was synced) the only buttons in main were the 3 tabs: no Remove, no Add equipment, no Add apparatus. Same on Engine 3 (empty: "No equipment on Engine 3 / This apparatus has no equipment stocked yet."). Positive control: A showed Remove on both rigs. Files 02, 03; captured-text 02, 03. |
| 7 | Phone 375x812 | PASS (plus the Sunlight finding) | Mobile preset (Pixel 8 UA, 5 touch points, dpr 2), page reloaded. Remove button 142x56 (>= 56), above the bottom nav (nav top y=755). Dialog 343x230 at y=291, not scrollable; Cancel 120x56 and Remove Engine 1 144x56 both fully in view (bottom 500 of 812). Page scrollWidth 375 = innerWidth (no horizontal scroll). Disabled state at phone width: sub-line single line, centred, 179x16, elementFromPoint at its centre is the span (nothing covers it). Sunlight (Settings > Appearance): sub-line black on white, 21:1. Files 09, 10, 18, 19; captured-text 08, 13, 14. |
| 8 | Console, sync, teardown | PASS | Console on A and B (all levels): vite HMR debug lines, React DevTools info, "hot updated RemoveRigButton.tsx" lines, and `Uncaught (in promise) AbortError: Transition was skipped` (View Transitions, one per full page load; also noted as unrelated by the #464 and #469 runs). Nothing from the sync layer: no PERMISSION_DENIED, rejected write, Firebase or IndexedDB error, no React warning. No unsynced or failed banner on either device. Writes proven by owner REST reads (RTDB writes are on a websocket, and the pane's network buffer only keeps the latest page load, all 200/204). Teardown: both origins wiped from /favicon.svg (5 IndexedDB dbs each, localStorage, sessionStorage with the QA passwords, SW, caches); tab-6 closed; preview_stop on v4-emu then emulators; `lsof` shows nothing listening on 5200, 9000, 9099, 4400, 4500, 4000. captured-text 22. |

## Other findings

1. **Stale alert (minor).** After B returned the unit, A (dialog still open) showed strip 2/0/1 and an enabled underlying button, but the dialog kept "Couldn't remove — equipment from this rig is still deployed." until the next press or close (screenshot 29). Not a criterion failure.
2. **Label clash.** The scope tab reads "Engine 1 · 12 items" (it counts units; Engine 2 reads "2 items" for one LS 304 line with quantity 2), while the dialog on the same screen says "3 items (12 units)". One word, two numbers. The tab label pre-dates #513; the new dialog wording creates the conflict. Orchestrator's call.
3. **Focus after the race press.** `document.activeElement` read BODY after the destructive press. UNVERIFIED as a defect: synthetic clicks in a headless pane, and the run-fieldshore skill says focus is unreliable there.
4. The dialog's destructive button stays enabled after A has already ingested the peer's deploy (the alert only appears on press). That is what the brief specifies; recorded for completeness.

## Mockup divergences (LEFT pane, "Option 1") for the orchestrator's fidelity call

Cross-theme note: the mockup is light-themed. I captured Light (shots 33, 34), Dark (most shots) and Sunlight (19, 20, 22, 35), so button-style comparisons below name the theme.
1. **Placement and alignment.** Mockup: "Remove Engine 1" is the last row inside the equipment card, below a divider, left-aligned. Build: a standalone tertiary button on the page background, outside every card, horizontally centred (button centre x = list centre x = 622 at 1024 wide), 24 px below the last card, no divider and no card chrome (shots 01, 05, 33).
2. **Dialog presentation.** Mockup draws it as an inline panel (no scrim, no close icon, no rule). Build: centred modal (aria-modal) with a 44x44 close X and a 1px footer divider (rgba(0,0,0,0.08) in Light) above the buttons. Title, body and both button labels match the mockup exactly, buttons right-aligned.
3. **Destructive button style.** Light: pale-pink fill rgb(254,242,242), text rgb(185,28,28), 1px red border at 30% (matches the mockup's outlined-pink look); Cancel is transparent with a grey border and grey text (shot 34). Dark: dark-red tinted fill rgb(42,20,22), text rgb(248,113,113), 30% red border (shot 06). Sunlight: SOLID fill rgb(185,28,28), white text, 2px border (shot 35), not outlined.
4. **Disabled sub-line.** Mockup shows only a caption describing the disabled behaviour. Build puts "Return deployed equipment first." as a 12 px caption, centred, directly under the disabled button, single line at 375 px.
5. **Labels.** Dialog strings are identical to the mockup. Only the tab-label clash above (finding 2) differs in wording between the chip and the dialog.
6. Per-line "Remove line" (mockup Option 2) is not built, as intended.

## Not tested, or limits

- Real touch input and haptics (the mobile preset emulates touch points but my clicks arrive as mouse clicks), a physical phone, the beta channel, live Firebase rules. The emulator loads the committed database.rules.json and accepted every Admin tombstone write; a Default-role removal attempt was not possible (no button).
- Network audit for the whole run (the pane keeps only the latest page load).
- No BLOCKED criteria: the second device (127.0.0.1:5200) worked.

## Housekeeping for the orchestrator

- Evidence folder: /Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/step1-fixes/513/ with 38 PNGs (00a-00c setup, 01-35 numbered in run order), captured-text/ (23 files), rest/ (12 owner-REST JSON dumps), commands.log (timeline with build ids), engine-stock.csv.
- engine-stock.csv is gitignored (*.csv, .gitignore:37); it needs `git add -f` if you want it kept.
- The repo root now holds database-debug.log (emulator output, 2.3 KB); .gitignore:49 `*.log` covers it. I left it in place.
- Source files were not edited. Git: no state-changing command; one read-only `git diff --stat` ran during orientation before the no-git rule registered.
- Theme was restored to Dark before the origins were wiped. The only persistent side effect outside the repo is one task-observer entry (#111, run-fieldshore verification tricks) appended to ~/.claude/skill-observations/log.md.
