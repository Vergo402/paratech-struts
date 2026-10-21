# Criteria brief 10 — Starting an operation

- **Spec:** `docs/v4-design/09-workflows/10-starting-an-operation.md` (June 2026)
- **Phase G issue:** #219 (sub-issue of epic #135)
- **Reconciled against:** gate review §10 (no entry touches this spec), ADR-010, 016, 017, 027, 036, 037, 039, 041, `.claude/rules/v4-phase-status.md`, Step 1 LEDGER (no ruling on this flow), `src/ui/operations/*`.

**Summary.** An authorized person opens the Operations tab, finds "No active operation", taps Start Operation, fills a full-screen form (name required; toggles; optional address) and confirms. The empty state is replaced by the live board for that incident. The same form, reopened with an Edit control, changes the name, toggles or address later. End Operation is the terminal gate and belongs to spec 16; here it only has to be present and reachable. Other devices in the department should see the new op appear on sync.

## Setup (the QA agent builds this first)

Fresh department for this spec (HARNESS.md: emulators + `npm run dev:emu`, :5200; phone viewport 390x844).

1. Device A `http://localhost:5200`: `/auth` -> Create Account (`qa251-10-1@example.test`) -> create a department via the app's create-department flow. The founder is **Admin**, which holds `manageOperations`. Note: a guest (no account) and a non-Admin "Default"-role member do NOT get the Start Operation button (see 10-18).
2. Open `/operations` (bottom-nav tab "Operations"). Expect the empty state.
3. Optional for cross-device (10-21/22): create a second account, join the department (via invite code from Settings) on Device B `http://127.0.0.1:5200`. Give B the Default role (no manageOperations) for the read-only check, or Admin for the edit check.
4. Optional for the multi-building criterion (10-17): after starting an op, add one shore point (spec 11 flow) before toggling Multi-building.
5. Apparatus/inventory are not needed for this spec.

Route: `/operations` (guarded by `RequireDepartment`). Source: `src/ui/operations/OperationsBoard.tsx`, `StartOperationModal.tsx`.

## Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 10-01 | With no op, the Operations tab shows an empty state with headline "No active operation" and one primary button "Start Operation". | Testable | Step 1 | `/operations` as Admin. Reason text reads "Start a shoring operation to begin tracking shore points". |
| 10-02 | The Start Operation button is >= 44px tall and reachable one-handed (bottom half of viewport not required, but fully on-screen with no scroll at 390x844). | Testable | Actors; Step 1 | Measure bounding box via DOM. |
| 10-03 | Tapping Start Operation opens a full-screen form dialog titled "Start Operation" (modal, not a sheet). | Testable | Step 2 (ADR-016) | Screenshot; the dialog covers the viewport; `role=dialog` name "Start Operation". |
| 10-04 | The form carries the required field "Operation name" (placeholder "e.g. Cascade Building Fire"), an optional "Location / address" field (placeholder "Optional"), and a "Multi-building" toggle that is OFF by default. | Testable | Step 2 fields | Read labels and toggle `aria-checked`. |
| 10-05 | The footer primary button "Start Operation" is disabled while the name is empty or whitespace-only, with no error toast or banner; it enables as soon as a non-blank name is typed. | Testable | Step 2 commit, Empty states | Type "   " (still disabled), then "QA Fire One" (enabled). Tapping the disabled button may show the reason "Enter an operation name" (build addition). |
| 10-06 | The close control (aria-label "Close") dismisses the form with no state change; the empty state is still shown and no op exists. Reopening shows an empty form. | Testable | Step 2 Dismiss; state diagram StartModal->NoActiveOperation | Type a name, tap Close, confirm empty state, reopen, name field is blank. |
| 10-07 | Confirming with name only creates the op: modal closes and the board shows the op name as the page heading (h1). | Testable | Step 3 | Tap footer Start Operation; read `h1` text. |
| 10-08 | The name is trimmed on save (leading/trailing spaces removed). | Testable | Step 2 | Enter "  Trim Test  "; heading reads "Trim Test". |
| 10-09 | After start, the "No active operation" empty state and its Start Operation button are gone, and the board shows an Add Shore Point action (phone: floating pill "+ Add Shore Point"). | Testable | Step 3 | Read the FAB; confirm no Start Operation button remains. |
| 10-10 | After start, the board is empty and says so. Spec wording is lanes "Pending Equipment (0)", "Equipment Assigned (0)" visible with count 0; the build shows the empty-state "No shore points yet" with "Add shore point" action. Record which appears. | Testable | Step 3 | Screenshot. If lanes are absent and the empty-state is shown, record a SPEC-DRIFT candidate (no ADR found; the empty-state promotion is #435 per code comment). |
| 10-11 | An "End Operation" control exists on the active board and opens a destructive "End Operation?" modal with Cancel first; Cancel returns to the board with the op still active. (Full end choreography is spec 16, not driven here.) | Testable | Step 3; state diagram EndConfirmModal->ActiveOperation | Scroll to board foot; tap End Operation, tap Cancel, heading unchanged. |
| 10-12 | Location/address entered at start is saved and shown after start. | Testable | Step 2 fields; Edit pre-population | Start an op with address "123 Main St" (typed by hand; Google autocomplete may be offline). Reopen via Edit: field holds the value. Where the address is shown on the phone board is not fixed by the spec; the spec only says tablet/laptop chrome. |
| 10-13 | An Edit control (pencil, aria-label "Edit operation") sits next to the op name on the active board and opens the same form titled "Edit Operation" pre-populated with name, toggles and address. | Testable | Step 3-R | Tap pencil. Footer button reads "Save". |
| 10-14 | Editing the name and tapping Save updates the heading immediately; reopening Edit shows the new value. | Testable | Step 3-R; Reversibility row 1 | Rename; read h1. |
| 10-15 | Closing the Edit form without saving (Close) leaves all values unchanged. | Testable | Step 3-R; EditModal->ActiveOperation (Cancel) | Change name in field, Close, read h1 and reopen. |
| 10-16 | Saving the Edit form with no changes closes the form and creates no change. | Testable | Step 3-R | Save untouched; heading and settings unchanged. |
| 10-17 | Multi-building can be toggled after start via Edit (off->on and on->off) and persists. With shore points present, toggling on gives existing points a default building; toggling off hides the building field but keeps data; a non-blocking inline warning notes the change. | Testable | Step 3-R, OQ1 | Toggle with one shore point present; check the shore point's detail and the Add Shore Point form for a Building field. The spec says migration/warning is a Phase H detail: if no warning appears, record NOT-BUILT for the warning only. Expect the multi-building half of #511 to be open (phase-status rule). |
| 10-18 | Starting/ending/editing is permission-gated: an Admin sees Start Operation; a guest or a Default-role member sees no Start button and the text "No operation is active. An operations manager starts one." | Testable (replaces spec's "IC/Ops Section Chief by convention") | Actors; OQ3 | Device B (Default role) or a guest browser profile on `/operations`. Supersedes the convention per ADR-017 (`manageOperations`). |
| 10-19 | The form shows a "Utilize Pending Card" toggle with helper text, positioned above Multi-building, OFF by default (one-step inline deploy). | Testable (replaces: spec has only two fields) | Step 2 (ADR-027) | Open the form; read the toggle (`aria-checked=false`), helper "On: save a Pending card... Off: find and deploy struts right in the form". |
| 10-20 | The "Utilize Pending Card" setting can be flipped via Edit mid-incident and the Add Shore Point form follows it (ON: no Find Available Struts in the form; OFF: Find Available Struts + Deploy). | Testable | ADR-027 | Edit, flip, open "+ Add Shore Point". |
| 10-21 | Cross-device: Device B (same department, signed in) sees the new op appear on `/operations` without the user doing anything beyond waiting for sync; "No active operation" is replaced. | Testable | Cross-surface story | Start on A, observe B (allow a few seconds on the emulator). Record elapsed time. |
| 10-22 | Cross-device: an Edit made on A (rename) shows on B. | Testable | Cross-surface (implied) | Rename on A, read B heading. |
| 10-23 | Offline start: with Device A offline, creating an op succeeds locally with no blocking error and appears at once; on reconnect it syncs to Device B. | Testable | Empty/error states "Offline at form submit" | HARNESS offline recipe; start while offline; read board; go online; check B. |
| 10-24 | While offline, the app indicates it is offline/queued (the spec calls this the "sync dot"; the build shows a banner only when offline/queued, nothing when healthy). | Testable | Step 3 chrome; Empty states offline | Read `SyncBanner` text while offline; record whether any always-on sync dot exists (record NOT-BUILT/SPEC-DRIFT if not). Banner is member-only; a guest has no sync. |
| 10-25 | Persistent chrome shows the operation name (spec: replaces "No active operation" placeholder). Build shows the name as the board's h1 within the Operations screen. Record whether the name also appears in the app shell header on other tabs (Quick Find, Inventory). | Testable | Step 3 | Switch tabs and read the shell. Likely SPEC-DRIFT; no ADR found. |
| 10-26 | Accessibility: on open the dialog is announced with the title "Start Operation"; focus moves into the dialog; Escape closes it; focus returns to the Start Operation button (or the board) on close. | Testable | Accessibility; Step 2 | `document.activeElement` after open/close; role/name via accessibility snapshot. Spec's phrase "full-screen form" in the announcement is not required of the build. |
| 10-27 | Accessibility: the name input has a visible label "Operation name" tied to the input (programmatic name), and the Edit pencil and Close have accessible names. | Testable | Accessibility | Accessibility snapshot. |
| 10-28 | Accessibility: after a successful commit the board is the focus context and its first landmark/heading reads the op name. | Testable | Accessibility (SR script "Cascade Building Fire, Operations board, no shore points") | Check `h1` and focus after close. The exact SR sentence is not required; record what a snapshot reads. |
| 10-29 | Only one operation is active: when an op is active the Start Operation form cannot be reached from the Operations tab (no second Start button), so a second concurrent op is not creatable by the UI. | Testable | State diagram (single op) | Inspect board; the only entry is Edit. |
| 10-30 | Persistence: reloading the page (and restarting the browser context) keeps the op active with the same name and settings. | Testable | Loading ("renders from local state instantly") | Reload; read h1 within a second or two with no spinner blocking. |
| 10-31 | Long name: a very long name (e.g. 120 chars) does not break the layout at 390px (no horizontal page scroll; name wraps or truncates). | Testable | OQ2 (no limit fixed) | Enter 120 chars; check `document.documentElement.scrollWidth <= 390`. No character-count indicator is promised; record whether one exists. |

## Superseded / Deferred

| Spec item | Status | Citing decision |
|---|---|---|
| Form has only two fields (name, multi-building, address) | **Superseded** by an added top toggle "Utilize Pending Card" (inverse of `Operation.inlineDeploy`), restated as 10-19/20 | ADR-027 |
| Start/Edit/End by "IC + Operations Section Chief by convention" (OQ3) | **Superseded**: gated by the `manageOperations` permission (Admin, or a custom role) not an ICS position | ADR-017; code `OperationsBoard.tsx` `canManageOps`; restated as 10-18 |
| End Operation is terminal, "cannot be re-opened" (state diagram `[*]`) | **Superseded**: an ended op can be re-opened from the Past operations drill-in; the End modal also asks about equipment still deployed ("All equipment is back on the rigs") | ADR-036, ADR-041, #499. Driven in spec 16, not here |
| Edit via overflow menu (⋮) or Edit button | **Superseded in detail**: pencil icon beside the op name; no overflow menu | code comment "Edit sits right next to the incident name (Alex)" |
| Add Shore Point as primary button under the header | Build: phone floating pill / desktop "+ Shore Point" in the title bar | Alex 2026-07-03 (code comments); not an ADR |
| Archived operations "below the fold" on the empty state | Build: section "Past operations" below the empty state, only after one op has been archived (not driven here; spec 16) | #238 |
| Persistent-chrome "Location / address" display on tablet/laptop | Not located in `src/`; **Deferred / not found**: check on a tablet viewport only if time allows, otherwise record NOT-BUILT | none found |
| Character-limit indicator (OQ2) and the on->off field-preservation warning (OQ1) | Phase H details the spec leaves open; no later decision found | `99-open-questions.md` not citing; record observed behavior |
| Operational periods | Op now starts with Period 1 seeded; shown in the header ("OP" count) | ADR-039 |
| Gate review §10 | No resolution changes this spec | — |

## Risks for the QA agent

- **No Start button for guests or Default-role members** is by design (10-18), not a bug. Use the Admin founder account.
- **The "sync dot" does not exist as an always-on dot**; only an offline/queued banner (10-24). Judge that against the criterion's wording, not a missing glyph.
- **Toggle wording is inverted**: "Utilize Pending Card" ON means the data field `inlineDeploy` is false. Default for a new op is OFF (one-step inline). Do not call the helper text ("On: ... Off: ...") a bug.
- **Address autocomplete** (Google Places) may not work on the emulator or without a key; type the address by hand. A hand-typed address is valid.
- **Empty board** shows "No shore points yet", not lanes with (0) counts (10-10); phone lanes may collapse or group.
- **TanStack Link taps** may not respond to synthetic clicks; use `location.assign('/operations')` (HARNESS).
- **Modal exit animation**: probe the text flash and stale frame right after Start (HARNESS evidence discipline).
- **Two origins** (localhost vs 127.0.0.1) are separate devices; both must sign in separately.
- **Sunlight theme**: the disabled Start button and toggle helper contrast; check once.
- Edit controls appear only for `manageOperations`; a Default-role member on Device B will not see the pencil (consistent with 10-18).
