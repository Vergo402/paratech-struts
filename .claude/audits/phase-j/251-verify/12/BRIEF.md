# BRIEF 12 — Deploying a strut

- **Spec:** `docs/v4-design/09-workflows/12-deploying-a-strut.md` · **Phase G issue:** #221 · runbook node Step 2 / P9 (#251)
- **Summary:** A shore point sits in the Pending Equipment lane with no strut. The officer taps Assign Equipment, picks a recommended strut card (ranked by fit), and taps Deploy. The point moves to the Equipment Assigned lane carrying the strut model and the truck it came from. Stock for that strut drops. Sliding back un-deploys it behind an "inventory-consequential" confirm. Unrated or short-of-load deploys need an acknowledgment. Grouped shore points deploy one member at a time. Since June the build added: a full bill of materials (strut + plates + extensions, each from its own truck, ADR-033), a "Review sources" step, a one-step deploy mode inside Add Shore Point (ADR-027), slide-only status commits (ADR-026), and derived stock (ADR-041).

## 1. Setup (build first; recipes in `251-verify/HARNESS.md`)

1. Emulator harness, phone viewport 390x844. Sign in, create/join a department (routes `/auth`, `/create-department`).
2. **Inventory** (tab `/inventory`): at least two trucks, e.g. "Rescue 2" and "Engine 1". Rescue 2 stocks a strut that fits a ~48-1/2" opening (spec uses LS 203; any fitting model is fine, record which). Engine 1 stocks a *different* strut model (fits too) and at least one base plate model Rescue 2 does not stock. Note starting available counts per row. Leave one more test case with a strut model at quantity 1.
3. **Start Operation** (`/operations`, empty-state button "Start Operation"): **turn ON "Utilize Pending Card"** (default is OFF = one-step inline deploy, which hides the Pending-card path this spec covers). Name e.g. "Cascade Building Fire".
4. **Add Shore Point** ("+ Add Shore Point"): T-Shore, Division 1, Area A, measurement 48-1/2", no estimated load, "Save as Pending". Repeat to make: (a) a plain point; (b) a point with top/bottom plate deductions chosen from the plate grid; (c) a grouped shore (Number of shores = 3, T-Shore x3 group); (d) one point with a very large opening (over 16 ft or load that makes only unrated/over-capacity cards) for the gate cases; (e) one point on a rig-less case: a fresh department/op with no inventory at all for `no-inventory`.
5. **Second device** (for cross-device rows): second browser context signed in as another member of the same department, same operation open on `/operations`.
6. Tap targets: measure with the page's own bounding boxes (≥ 44 px) where a row says so.

## 2. Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 12-01 | A Pending Equipment lane card shows a full-width button labeled exactly "Assign Equipment" (secondary/outline style, not slide) | Testable | Step 1 | `/operations`, Pending lane (header reads "Pending"; full state name "Pending Equipment"). Spec says "process-blue/primary"; build is a quiet outline (#4 gold budget) - record as SPEC-DRIFT only if the button is not full width |
| 12-02 | Pending card with no stock shows a reason title + copy: "Waiting for inventory" / "Needs <model> or <model> — none on scene" (or "No apparatus stock to pull from" when no model is named) | Testable | Step 1 `no-inventory` | Use setup 4e. Spec copy "Waiting for inventory — no apparatus stock to pull from" is reworded in the build; judge presence + clarity, not the exact string |
| 12-03 | No-fit point shows "No matching strut" + "Nothing fits this opening at this load" | Testable | Step 1 `no-match` | Opening no struts can span (e.g. tiny or 20 ft) |
| 12-04 | Assign Equipment stays tappable on every pending reason (no-match, no-inventory, over-capacity) and opens the dialog | Testable | OQ3, Step 1 | Tap it on each reason card from 12-02/03 |
| 12-05 | Tapping Assign Equipment opens a dialog titled "Assign Equipment" with a context line "Division · [Building ·] Area · Shore type · measurement" (e.g. "Div 1 · Area A · T-Shore · 48-1/2″"); parent board stays behind it | Testable | Step 2 | Read dialog title + `.fs-assign-context`. Container is a centered Modal, not a bottom sheet (see 3 below) |
| 12-06 | Dialog lists one recommendation card per fitting stocked strut, each showing: system word + model, extension block, ledger (Raw opening − deductions = Required strut length), apparatus source ("from <truck>"), a Deploy button | Testable | Step 2 | Setup 4a; compare card's source to the truck stocking that model |
| 12-07 | Cards are ranked by fit; with two stocked models both appear, each with its own truck source | Testable | Step 2 | Setup 2 (Rescue 2 + Engine 1) |
| 12-08 | Deploy button accessible name carries full identity: "Deploy <model>, <color> <system>, effective <N> [and a/b] inches, from <truck>" | Testable | A11y | Accessibility tree / `aria-label` or name of the Deploy button |
| 12-09 | Dialog closes via the top-right "Close" button, Esc, and system Back with no state change (point stays Pending, no stock change) | Testable | Step 2 dismiss | Tap Close, reopen, Esc, reopen, Back. NOTE: tapping outside does NOT dismiss a `form` modal in the build (spec lists scrim and drag-handle) - not a bug, see section 3 |
| 12-10 | Single-truck deploy: tapping Deploy on a card whose whole assembly comes from one truck commits in ONE tap; dialog closes | Testable | Step 2/3, ADR-033 §4 | Setup 4a with strut on Rescue 2, no plates |
| 12-11 | After deploy the card moves from Pending to Equipment Assigned lane; both lane counts update (Pending −1, Equipment Assigned +1); the Assign Equipment button is gone | Testable | Step 3 | Read lane headers "Pending (n)" / "Assigned (n)" |
| 12-12 | The Equipment Assigned card shows deployed identity: strut model + "from <truck>" (and any plates/extensions) | Testable | Step 3, card.md cradle-to-grave | Read the card; then advance later states and confirm identity persists through Strut Set |
| 12-13 | Equipment Assigned card shows two slides: "Slide to set Strut Set" (advance) and "Slide back to Pending Equipment" (step-back); no separate buttons beside them on touch | Testable | Step 3 / ADR-026 | Phone viewport (touch emulation). Under ADR-026 the spec's "Advance/Step-back button pair" is absent by design |
| 12-14 | Inventory: deployed strut's available count drops by 1 immediately on the submitting device | Testable | Step 3 inventory | `/inventory` row for that model/truck, before vs after. Read the aria-label "N of M available" |
| 12-15 | Deployed stock follows the BOM: a point with plate deductions also decrements the plate row (and extension row if the card showed an extension) on the truck that supplied it | Testable | ADR-033 §1-2 (supersedes spec's strut-only) | Setup 4b; read plate/extension rows before/after |
| 12-16 | Multi-truck pull: when pieces come from two trucks (strut Rescue 2, plate only on Engine 1) tapping Deploy does NOT commit; dialog title becomes "Review sources" and shows per-piece source rows, "Pieces come from 2 trucks — confirm each source before deploying." and a "Confirm & deploy" button | Testable | ADR-033 §4 + 2026-06-18 addendum | Setup 2+4b. "← Back to struts" returns to the list without deploying |
| 12-17 | Review sources: "Confirm & deploy" commits; each piece decrements its own truck's row; card shows both sources | Testable | ADR-033 | Read inventory rows for both trucks |
| 12-18 | Missing piece (plate not stocked anywhere): Review sources offers three explicit ways: add to inventory (stepper + truck, button "Add N to <truck>"), deploy off-book ("Off-book — won't draw from stock"), "Drop this plate (set to none)"; Confirm is blocked until one is chosen | Testable | ADR-033 addendum #2-3 | Delete a plate from stock first. Confirm no silent untracked deploy |
| 12-19 | Unrated-zone card: Deploy is disabled until the team checks "Team acknowledges the unrated zone"; then Deploy commits | Testable | Step 2-W | Setup 4d, opening in the unrated range (LongShore above 16 ft). Gate text: "LongShore above 16 ft (192″) is not rated by Paratech — rescue engineering consultation required." Spec's Cancel / "Acknowledge & Deploy" buttons do not exist (inline checkbox instead) |
| 12-20 | Over-capacity card cannot be deployed: warning "Load exceeds rated capacity at the 4:1 safety factor — this strut cannot be deployed for this opening." and Deploy is disabled; with no deployable card the dialog shows "Over capacity" empty state | Testable | Step 2-W, M7 | Setup 4d with a heavy estimated load. Spec says over-capacity can be acknowledged and deployed; build closes the path (gate review M7 note: "Deploy path already closed") |
| 12-21 | Short-of-load deploy: when the estimated load needs more struts than the point has, card shows "×N struts needed for this load", a primary "Add N more strut(s) — deploy as <shore type>", and a demoted "Deploy N of M anyway" that stays disabled until "Team acknowledges the over-capacity deploy" is ticked | Testable | Step 2-W (new behavior) | Estimated load above 1-strut capacity on a T-Shore |
| 12-22 | Empty state, no match: dialog shows "No matching struts" / "Nothing fits this opening at this load — adjust deductions or re-measure" | Testable | Empty states | Setup 4 no-match point. Spec's "would-fit link to Quick Find" - record NOT-BUILT if absent |
| 12-23 | Empty state, no inventory: dialog shows "No fitting strut is on scene. Deploy one off-book, or add it to a truck." with off-book cards that route to Review sources | Testable | Empty states, ADR-033 | Setup 4e. Spec string "No apparatus stock available" is superseded by this flow |
| 12-24 | Step-back: sliding "Slide back to Pending Equipment" opens a confirm titled "Return <model> to inventory?" with text about returning strut, plates and extensions to each source truck, buttons "Cancel" and "Return & Step Back" | Testable | Step 3-R | Phone viewport slide gesture (see HARNESS for drag recipe) |
| 12-25 | Cancel in the step-back confirm leaves the point Equipment Assigned and stock unchanged | Testable | Step 3-R | Tap Cancel; re-read lane + inventory |
| 12-26 | Confirm ("Return & Step Back"): point returns to Pending Equipment with the Assign Equipment button back, strut identity gone, and every piece restored to its OWN truck's available count; no timed undo | Testable | Step 3-R, ADR-010 | Compare inventory rows with the pre-deploy numbers (they must match exactly) |
| 12-27 | Grouped shore (x3): deploying one member leaves the other two in Pending Equipment, each with its own Assign Equipment; group badge "N/total" persists | Testable | Step 3 grouped | Setup 4c |
| 12-28 | A grouped member in Equipment Assigned cannot slide to Strut Set while mates are Pending: slide is disabled and the visible reason reads "Waiting on group — N of M still Pending" | Testable | OQ2 + ADR-026 | After deploying only one of three; then deploy all three and confirm the slide enables |
| 12-29 | Group step-back un-deploys all Equipment Assigned members together: confirm title "Return N struts to inventory?", button "Return All & Step Back" | Testable | ADR-033 (replaces per-member reading) | Deploy all three, slide back one |
| 12-30 | Cross-device: second device sees the point move to Equipment Assigned with strut identity and the inventory row drop, after sync (no push/notification) | Testable | Cross-surface | Device B `/operations` and `/inventory`; allow sync. B's un-deploy/step-back also reflects on A |
| 12-31 | Deploy on a point another device already deleted has no effect: the deploy is dropped, banner "Synced — 1 of your changes had no effect", point stays only in the "Deleted shore points" section, stock not decremented | Testable | #464 (Phase J ruling, commit 1ffd3f6) | A offline, B deletes the point, A (still shows it Pending) deploys, A reconnects. Proof recipe already in `step1-fixes/464/REPORT.md`; fresh drive required |
| 12-32 | Offline deploy: with the device offline the deploy commits locally (card moves, stock drops), sync indicator shows pending; after reconnect B receives it | Testable | Empty/error: offline | Harness offline toggle |
| 12-33 | Successful deploy announces politely (live region): "<model> deployed — <where>, Equipment Assigned."; focus lands somewhere sensible (not `<body>`) | Testable | A11y | Read `role=status` region; check `document.activeElement` after the dialog closes. Spec's exact wording "Shore point Equipment Assigned. Div 1, Area A…" differs - judge intent |
| 12-34 | Dialog traps focus and opens with focus inside; dialog accessible name is "Assign Equipment" | Testable | A11y | Tab through; accessibility tree |
| 12-35 | Race: two devices deploy the same single-quantity strut while offline; after both sync, stock shows signed over-allocation (negative) rather than silently clamping | Testable | ADR-041 (new) | Setup strut qty 1; `/inventory` row aria-label "N over-allocated of M" |

## 3. Superseded / Deferred

| Item | Tag | Citing decision |
|---|---|---|
| Assign Equipment as bottom-anchored "picker sheet", 60vh, drag handle, scrim-tap dismiss | Superseded | ADR-016 line 69 (Alex 2026-06-19): center `Modal variant="form"`; closes by Close button / Esc / Back. Criterion 12-05, 12-09 carry the new behavior |
| "Acknowledge & Deploy" and "Cancel" warning-gate buttons; in-sheet `aria-live="assertive"` copy "Warning: estimated load exceeds safe capacity…" | Superseded | Built `WarningGate` (inline checkbox + disabled Deploy); 12-19, 12-21 |
| Over-capacity card is deployable after acknowledgment | Superseded | Gate review M7 / verification doc ("Deploy path already closed on over-capacity"); visual loudness itself deferred to #40. 12-20 |
| Visible and AT "Advance / Step-back" button twins implied by slider.md | Superseded | ADR-026 (slide only on touch). Mouse devices get a single tap button instead of the track: ADR-035 - drive on desktop pointer only if the QA agent chooses to, tag Testable for "Set Strut Set"/"Back" button label |
| Strut-only deploy / inventory decrement of a single unit | Superseded | ADR-033 (full BOM, per-component truck, source confirmation); 12-15..12-18, 12-29 |
| Stored `available` decremented per device | Superseded | ADR-041 (`available = quantity − held`, signed; canonical fold order); 12-35 |
| Deploy only via board Assign Equipment sheet | Superseded | ADR-027: new operations default to one-step inline deploy inside Add Shore Point; spec flow requires "Utilize Pending Card" ON. Inline path belongs to spec 11 (#220) |
| "Return LS 203 to Rescue 2's available count" modal text | Superseded | OQ1 closed by Phase H copy: build text names strut, plates and extensions and the source truck (12-24) |
| External (visiting dept) equipment step-back copy "Return to External · Dept 14" | Deferred | OQ1; mutual-aid equipment plumbing (v3.20-21 parity, v4 mutual-aid spec 32). Not driven here |
| Post-deploy re-sourcing (`ComponentResourced`) UI | Deferred | ADR-033 addendum (pending field evaluation) |
| Per-line Remove of a stocked rig line | Deferred | #525 [v4.1] |
| "Deploy now" per-point multiple-member advance auto trigger `getGroupMembers().every(...)` | Superseded | Reducer + `advanceDisabledReasonFor` "Waiting on group" gate; 12-28 |
| Capacity figure on the card face | Superseded | ADR-012 / synthesis: demoted to a quiet footer on clean cards only |

## 4. Risks for the QA agent (likely false bugs)

- Default new-operation mode is one-step inline deploy. If "Utilize Pending Card" is OFF there is no useful Pending lane/Assign Equipment path (lane may show toggled off). Turn it ON in Start/Edit Operation.
- Lane headers read "Pending" and "Assigned" (STATUS_SHORT_LABEL); the full state names Pending Equipment / Equipment Assigned show in announcements and slider labels.
- The dialog is a centered Modal even on phone; tap-outside deliberately does nothing.
- A "complete" single-truck BOM deploys in one tap; the Review sources panel only appears for multi-truck or missing pieces. Do not report the missing confirm step on a single-truck pull.
- Slide gesture: on a mouse pointer the slide track is swapped for a button (ADR-035); use touch emulation (390x844) to see the slides.
- Inventory `available` can be negative or show "over-allocated"; that is ADR-041, not corruption.
- Spec wireframe shows a dot "sync" indicator and "Pending Equipment (3)" counts; the build's chrome differs.
- `pendingReason` text is computed live from stock and changes as inventory changes.
- Spec 12-31 race: old delete→deploy logs now fold as "no effect" (intended; no fielded users).
- Grouped x3 shore: step-back and advance act on the whole group; per-card lanes may display as one grouped tile.

## Orchestrator note (2026-10-13) — extra safety probe from the spec-11 pass
Add one probe (report only, no verdict): create a Pending **3-Post** with a 72″ opening (auto-fill header + footer 6×6), then **Edit** it to **T-Shore** and Save. Record the card's opening, the Deductions summary and "Required strut length" in the Edit form after the change, and which struts Assign Equipment offers. The spec-11 pass did not check whether the 6×6 deductions survive an Edit to T-Shore. Put the result under "Safety observations".
