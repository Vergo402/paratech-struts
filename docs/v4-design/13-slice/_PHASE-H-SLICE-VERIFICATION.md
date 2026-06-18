# Phase H Slice — #247 Formal Verification Record

**Issue:** [#247](https://github.com/Vergo402/paratech-struts/issues/247) — Verify slice in preview tool (drive every state, log + screenshot)
**Date:** 2026-06-10 · **Driver:** Claude (Session 7) · **Verdict: all six states PASS**
**Build under test:** production bundle (`npm run build` → `vite preview`, port 5198) at `v4-redesign` `66c1508` — *not* the dev server.
**Viewport:** 375×812 (phone — the floor for every workflow), dark theme (default).
**State discipline:** IndexedDB `fieldshore` + localStorage wiped before the drive; the 17-item synthetic seed re-ran fresh. Single browser context confirmed via an unblocked `deleteDatabase` probe.

Screenshots in [`screenshots/`](screenshots/) were captured by [`capture-screenshots.mjs`](capture-screenshots.mjs), which replays this exact sequence headlessly against the production preview — re-runnable any time the slice changes.

---

## Quality floor (pre-drive)

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` (3 boundary invariants + `react/no-danger` + `no-alert` + `exhaustive-deps`) | clean |
| `npm run test` | **256 / 256 passed** (36 files) |
| `npm run build` | clean (PWA precache 5 entries, 574.52 KiB; >500 kB chunk note is informational) |
| v3 root untouched | `git log 4b658ac..HEAD -- index.html app.js style.css sw.js` → **empty** (no slice-era commit touched the v3 app; GitHub Pages unaffected) |
| Seam tree | matches `architecture.md` / `module-boundaries.md`; boundary lint green is the enforcement |

## Per-state evidence

### State 1 — Happy path ✅
`01-fresh-empty-state` → `06-strut-set`

| Step | Observed |
|---|---|
| Cold open `/operations` | First-run empty state ("No active operation"), single Start Operation CTA |
| Start Operation | Modal; name required (disabled-reason "Enter an operation name"); created → board header "Maple St Collapse" |
| Board | All 7 lanes with ADR-008 names (**Strut Set**, Wood Shore Secured, Strut Equipment Returned), per-lane counts, two `aria-live` regions |
| Add Shore Point (30″) | Division picker (Div 1 default) · shore-type segmented · qty · **eighths tap-strip + ft/in steppers** (#20/#38) · fixed-order deduction ledger with live Effective math + "floored to ⅛″" · readout `2′ 6″` · assertive announce "Shore point added — Div 1, Pending Equipment." |
| Assign Equipment (sheet, ADR-016) | Context header "Div 1 · T-Shore · 30″". **4 recommendations**: LS 203 (gold LongShore, Rescue 2) · AT 25-36 (Engine 1) · AT 25-36 (Rescue 2 — **per-rig duplicate as separate card**) · AT 19-25 + 6″ (**extension combo**). Every card: COLOR—SYSTEM header, strut-color accent bar, adjusted range, **rigid always-shown ledger** (Opening → Header → Top Connector → Bottom Connector → Footer → Effective; N/S rows in danger style + "not selected"), capacity demoted (not on the card face), `Equipment from:` line, full-identity sr-only Deploy label ("Deploy LS 203, gold LongShore, effective 30 inches, from Rescue 2"), **disclaimer on every card** ("Planning aid, not an engineering certification.") |
| Deploy LS 203 | Sheet closed · polite announce "LS 203 deployed — Div 1, Equipment Assigned." · **inventory decremented 4 → 3** (verified in IndexedDB) · card in Equipment Assigned with **cradle-to-grave identity "LS 203 / from Rescue 2"** · advance + step-back slides each with #37 button equivalents |
| Advance to Strut Set (#37 button) | Card → Strut Set lane · announce "Shore point — now Strut Set." · identity persists · **step-back slide only** (advance→Cutting Station is workflow #222, correctly absent) |

### State 2 — Grouped T-Shore ×3 ✅
`07-group-three-pending`, `08-group-gate-waiting`

- One Add (qty 3, 30″) → **3 linked Pending Equipment cards [1/3] [2/3] [3/3]**; event log grew **exactly 3 events in one commit** (4 → 7); single announce "3 shore points added — Div 1, Pending Equipment."
- **Group advance gate (workflow #221 OQ2):** after deploying member 1/3 only, its Equipment Assigned card shows advance **disabled** with live reason "**Waiting on group — 2 of 3 still Pending Equipment**"; step-back stays active. Deployed members 2/3 + 3/3 → gate released on all three simultaneously.
- **Lockstep fan-out:** ONE advance on any member moved **all 3** to Strut Set; announce "3 shore points — now Strut Set." (Also observed in reverse: a Strut Set step-back fanned all 3 back to Equipment Assigned — pre-cutting transitions are group-wide both directions; un-deploy is not.)

### State 3 — Step-back un-deploy ✅
`09-stepback-confirm-modal`

- Equipment Assigned [1/3] → "Step back to Pending Equipment" → **StepBackConfirmModal**: "Return LS 203 to inventory?" / "Stepping back will un-deploy this strut and return it to Rescue 2's available count. The shore point goes back to Pending Equipment." / **Cancel autofocused** (safe default) + danger "Return & Step Back".
- Confirmed → card back to Pending Equipment, identity cleared ("No equipment assigned"), **inventory restored 1 → 2**, announce "LS 203 returned — back to Pending Equipment."
- The un-deploy was **individual** — its 2 group mates stayed Equipment Assigned (inventory-consequential transitions never fan out).

### State 4 — Empty states ✅
`12-pending-reasons-board`, `13-empty-state-no-match`, `14-empty-state-no-inventory`

- **No-match (16″):** Pending Equipment card carries the live reason "**No matching strut — nothing fits this opening at this load**". Sheet **still opens** → `fs-empty--filtered`: "No matching struts / Nothing fits this opening at this load — adjust deductions or re-measure".
- **No-inventory (190″ ×3):** the 190″ opening fits only LS 1016; deployed both (2 → 0), third 190″ SP shows "**Waiting for inventory — no apparatus stock to pull from**". Sheet still opens → `fs-empty--upstream-blocked`: "No apparatus stock available / A strut that fits exists, but none is available on scene".
- **Live `pendingReason` self-clear, on camera:** the 200″ card read "Waiting for inventory" while LS 1016 stock was 0; the moment a step-back returned one (0 → 1), the reason line **vanished without any user action** — the Alex-approved compute-it-live behavior. (It flipped back once both 1016s were re-deployed.)

### State 5 — Warning gates ✅ *(per Alex's Option 1, 2026-06-10)*
`10-unrated-gate-locked`, `11-unrated-gate-acknowledged`, `15-gallery-over-capacity`

- **Unrated zone, in the real workflow (200″):** gated card `is-gated` — LS 1016 + 12″ (chip + "strut alone 114″–198″"), warning "LongShore above 16 ft (192″) is not rated by Paratech — rescue engineering consultation required.", ack checkbox "Team acknowledges the unrated zone". **Deploy disabled until ack → ticked → Deploy unlocked · sheet did NOT dismiss · disclosure persisted.** (v3 NEW-2 carried forward.) Three gated extension combos render at 200″; the first was driven.
- **Over-capacity #40, engine-driven in `/gallery`:** 180″ @ 60,000 lb → `is-gated` card, warning "Load exceeds rated capacity at the 4:1 safety factor — this strut cannot be deployed for this opening.", full math disclosure ("Best available: LS 610 at 4,500 lb per strut (4× = 18,000 lb maximum). This load would require 14 struts…" — the v3 NEW-3 sentinel), **Deploy locked outright, NO acknowledgment checkbox exists** (warning-gate.md doctrine: only the unrated zone is deployable-with-acknowledgment).
- **Why gallery (decision record):** shore points carry no load value in this slice (no load field on Add Shore Point — deliberate scope), so `exceedsCapacity` cannot fire in the Assign sheet with any seed. **Alex's call (Option 1): the gallery is the accepted proof surface for the distinct #40 card; the gate mechanics are proven in-sheet via the unrated path.** Re-verify in-sheet when the load field ships (Phase I).

### State 6 — Edit reversibility ✅

- **Operation edit (StartOperationModal reuse):** pencil → "Edit Operation", both fields pre-filled, submit relabeled "Save". Renamed → header updated live; re-opened → reverted. Multi-building toggle present and editable.
- **Pending Equipment SP edit:** card "Edit" → "Edit Shore Point", pre-filled at 2′ 6″. **Quantity is structurally absent in edit mode** (group size locked after creation); division/area/shore-type/measurement/deductions/label editable. 30″ → 31″ → Save → card shows 31″ → edited back → 30″. Round-trip clean.

## Console + network (whole drive)

- **Console:** zero new warnings/errors across all six states. (Six pre-existing `Another connection wants to delete database 'fieldshore'` warnings are the buffer from the deliberate pre-drive wipe racing a leftover tab from the *previous* session's preview — see drive notes.)
- **Network:** zero failures from the app under test. (One `ERR_CONNECTION_REFUSED` on a font fetch was logged during the deliberate server stop/restart gap before the drive began.)

## Drive notes (for the deviations register + future drivers)

1. **Focus after deploy lands on `<body>`** — confirmed live (Radix focuses body when the opener unmounts). Matches logged deviation; scroll + `aria-live` announce cover it for now.
2. **Synthetic clicks without focus don't claim overlays** — a scripted bare `.click()` on "Start Operation" never opened the modal until the button was `.focus()`ed first. Real taps focus naturally; **not a user-facing bug**, but automation must tap = focus + click. (Playwright's real-input clicks are unaffected.)
3. **Stale preview tabs share the IndexedDB** — a leftover tab from a previous session's preview on the same port made two app instances fight over the seed during the wipe. Census probe: `indexedDB.deleteDatabase` resolving without `onblocked` = single context. Restart the preview server to shed old tabs before a formal drive.

## Raker clarification (Alex, 2026-06-10 — recorded verbatim into the gate record)

Paratech's direct vertical-shoring chart (O&M Table 2-7) tops out at **12′**; the 16′ figures (O&M Tables 1-1/1-2, LongShore section) belong to **raker shoring** — a much-later feature with no page designed yet. The 200″ unrated seed scenario is a **mechanism test** (it exists to fire the acknowledge-gate), not a doctrinal vertical shore. No raker work is planned in this phase.

## Screenshot index

| # | File | Proves |
|---|---|---|
| 01 | `01-fresh-empty-state.png` | First-run empty state, fresh seed |
| 02 | `02-start-operation-modal.png` | Start Operation form |
| 03 | `03-board-pending-30.png` | Pending Equipment card, 30″ |
| 04 | `04-assign-sheet-recommendations.png` | Recommendation cards + rigid ledger |
| 05 | `05-in-process-deployed.png` | Deployed identity + slides + #37 buttons |
| 06 | `06-strut-set.png` | Strut Set; step-back only |
| 07 | `07-group-three-pending.png` | [1/3][2/3][3/3] linked cards |
| 08 | `08-group-gate-waiting.png` | Group gate: disabled advance + live reason |
| 09 | `09-stepback-confirm-modal.png` | Inventory-consequential confirm |
| 10 | `10-unrated-gate-locked.png` | Unrated card, Deploy locked |
| 11 | `11-unrated-gate-acknowledged.png` | Ack ticked, Deploy unlocked, disclosure persists |
| 12 | `12-pending-reasons-board.png` | Live pending reasons (no-match + no-inventory) |
| 13 | `13-empty-state-no-match.png` | `filtered` empty state, sheet open |
| 14 | `14-empty-state-no-inventory.png` | `upstream-blocked` empty state, sheet open |
| 15 | `15-gallery-over-capacity.png` | #40 over-capacity card, engine-driven |
