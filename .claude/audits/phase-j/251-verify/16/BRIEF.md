# Brief 16 — End of operation / archive / after-action

- **Spec:** `docs/v4-design/09-workflows/16-end-of-operation.md` · **Phase G issue:** #238 (epic #135)
- **Reconciled against:** ADR-010, ADR-016, ADR-017 (permissions), ADR-018 (+2026-07-02 addendum), ADR-036 (re-open), ADR-041 / #499 (equipment-held checkbox, superseded ops), gate review M3 (`_PHASE-G-GATE-REVIEW*.md`), `99-open-questions.md` #35, `src/`.

**Summary.** The commander closes the incident from the Command tab (SitStat). A confirm dialog explains the end and, when equipment is still out, warns how many shore points still hold equipment (grouped by rig) and offers an "All equipment is back on the rigs" checkbox. Confirming archives the operation: the Operations tab reverts to its "No active operation" empty state and the incident appears under "Past operations", read-only. Tapping it opens a frozen board with a "Re-open this incident" action (Cancel-first confirm) that makes it active again. Other devices follow on sync. The spec's after-action auto-email is a records-only side effect; the setting exists but the sender does not (see Deferred).

## Setup

All on the emulator harness (see `HARNESS.md`). Phone viewport 390x844 unless noted.

1. Device A (`http://localhost:5200`): `/auth` -> Create Account -> Create department (creator becomes Admin, so holds `manageOperations`). A guest has NO permissions, so the End Operation button is hidden for guests (see Risks).
2. Settings -> Inventory/apparatus: make sure at least one apparatus (rig) with strut stock exists (import CSV, or seeded via the app's inventory screens).
3. Operations tab (`/operations`) -> "Start Operation" (empty-state button) -> fill the StartOperationModal and confirm. Name it e.g. "Cascade Building Fire".
4. Add 3+ shore points (Operations -> add shore point). Build two states you need:
   - **State R (all returned):** advance every point through to "Strut Equipment Returned" (or add points with no deployed equipment).
   - **State D (equipment out):** 3 shore points with equipment deployed from a rig (Assign/Deploy equipment) and NOT yet Returned; ideally two different rigs to see grouping.
5. Second device (cross-device criteria): Device B = `http://127.0.0.1:5200`, sign in with a second account that Joins the same department (Join department, invite code) and holds the **Default** role (no `manageOperations`). Also a third account/role with Admin if you want a second capable device.
6. Routes: Command = `/command` (nav tab "Command"), Operations = `/operations`, Settings -> Administration = `/settings/administration`, Audit Log = `/audit-log`.

## Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 16-01 | On `/command` with an active op and Admin role, a button labelled "End Operation" is the last item below the Command rail (phone: stacked column; deck/>=1024px: in the left rail). | Testable | Step 1 | Navigate to Command. Read button text. Spec's "SitStat below the fold" maps to the Command tab. |
| 16-02 | End Operation is styled destructive (secondary + destructive ink) and its tap target is >= 44px high. | Testable | Step 1, a11y | Inspect bounding box (`getBoundingClientRect().height >= 44`). Check text is readable in Light, Dark and Sunlight themes (Step 1 ledger: Sunlight 8.31:1). |
| 16-03 | The gate is the `manageOperations` permission (ADR-017), not the live IC position: an Admin who is NOT Incident Commander still sees the button; a Default-role member (even if assigned IC) does not. | Superseded (ADR-017 #3 / #380) | Role gate | Device B (Default role): Command shows no "End Operation" (hide, not greyed). Device A Admin: visible regardless of who is IC. Read element absence via find/read_page. |
| 16-04 | Hide-not-grey: on a device without the permission, the button is not in the DOM at all (no disabled button). | Testable | Step 1 | read_page on Device B `/command` and the board's foot on `/operations`; search "End Operation". |
| 16-05 | The same End Operation action also exists at the foot of the Operations board (bare red text button beside "Begin Briefing"/"Open Briefing"), for permitted users. | Testable | Step 1 (no spec mention; second entry) | `/operations` scroll to bottom. Both entries open the same dialog. |
| 16-06 | Tapping End Operation opens a modal titled "End Operation?" (ADR-016 destructive confirm). Body states it archives every shore point and ends the active operation and that a new one can be started afterward. | Superseded (copy: spec said "End this operation? ... cannot be re-opened") | Step 2 | Tap, read dialog text. Expected build copy: "This archives every shore point and ends the active operation. You can start a new one afterward." |
| 16-07 | The modal does NOT say the record "cannot be re-opened" (archive is recoverable). | Superseded (ADR-036) | Step 2, OQ2 | Read dialog text; absence of "cannot be re-opened". |
| 16-08 | Cancel is the default-focused button; footer has two buttons "Cancel" (leading) and destructive "End Operation" (trailing). | Testable | Step 2, a11y | After open, `document.activeElement` text = "Cancel" (element has `data-modal-cancel`). Check order in DOM. |
| 16-09 | Focus is trapped inside the modal (Tab cycles within dialog); Escape and scrim close it with no change. | Testable | Step 2, a11y | Press Tab repeatedly, read activeElement; press Escape; confirm op still active (Command still shows its picture). Sheet scrim-close may need a reload per HARNESS. |
| 16-10 | Cancel returns to the active board with the operation unchanged; no OperationEnded in the Audit Log. | Testable | State diagram | Tap Cancel; `/audit-log` has no "Operation ended" row. |
| 16-11 | With State D (3 points holding equipment), the modal shows an alert paragraph: "3 shore points still hold equipment — <Rig> (n), ..." naming each rig with its count. | Superseded (copy/grouping per #499; spec: "3 shore points still deployed - ... short for the next call") | Step 2, M3 / OQ3 | Open modal in State D. Read `role="alert"` paragraph. Counts per rig sum may exceed total if a point drew from two rigs (counted once per rig). Singular: "1 shore point still holds equipment". |
| 16-12 | The warning does not block ending: End Operation confirm button is enabled with the warning showing and the box unchecked. | Testable | Step 2, OQ3 | Confirm in State D with checkbox unchecked; operation archives (see 16-16). |
| 16-13 | With State R (every point Returned / none deployed), neither the warning nor the checkbox appears. | Testable | Step 2 | Open modal in State R; no `role="alert"` paragraph, no checkbox. |
| 16-14 | In State D the modal offers a checkbox labelled "All equipment is back on the rigs", unchecked by default and reset to unchecked each time the dialog is opened. | Superseded (ADR-041 D5 / #499; spec has no checkbox) | Step 2 | Open, read checkbox state, check it, Cancel, reopen: unchecked again. |
| 16-15 | Inventory effect of the checkbox: ending with it UNchecked leaves the rigs' "available" short (equipment still held); ending with it CHECKED returns available to full quantity. | Superseded (ADR-041 D2-stock/D5; spec's "short for the next incident" consequence is now this derived-stock rule) | Step 2, M3 | Note a rig's Available on `/inventory` before and after, in two separate runs (re-open the op to reset, or use two ops). `available = quantity - held`. |
| 16-16 | The modal does not show the spec's "12 shore points - 14 personnel" summary line. | Testable (QA records NOT-BUILT if absent and not superseded) | Step 2 | Read modal text for a shore-point/personnel summary. No later decision found removing it. |
| 16-17 | Confirming "End Operation" (modal) closes the modal and, on the same device, `/operations` shows the empty state "No active operation" with a "Start Operation" button. | Testable | Step 3 | Tap confirm; navigate to `/operations`. Read headline/button. Watch for a stale frame immediately after tap (HARNESS probe). |
| 16-18 | Below the empty state, a "Past operations" section lists the just-ended op as a card: name, "Ended <date/time> · N shore points" (singular "1 shore point"). | Testable | Step 3, OQ1 | `/operations` empty state. Read `section[aria-label="Past operations"]`. Newest-ended first when several exist (end a second op to check). |
| 16-19 | Command tab after ending: no active-operation picture (the incident name/IC underline in chrome clears) and End Operation is gone. | Testable | Step 3 | `/command`; read header and absence of button. |
| 16-20 | Shore-point cards in the archive keep the status they had at close (no forced advance to Returned). | Testable | Step 3 | Open Past op (16-21); lane counts match pre-end State D statuses. |
| 16-21 | Tapping the past-operation card opens a read-only drill-in: back button (aria-label "Back to past operations"), title = op name, banner "Viewing a closed incident — read-only", status lanes with the points. | Testable | OQ1 | Tap card; read banner (`role="status"`). Back button returns to the list. |
| 16-22 | In the drill-in cards cannot be slid/edited/deployed (readOnly), and tapping a card opens the Quick View drawer read-only. | Testable | OQ1 | Try dragging a status slider; try opening edit actions; tap card -> drawer. |
| 16-23 | The drill-in has a "Re-open this incident" button; tapping opens a modal "Re-open this incident?" with Cancel (default focus) and "Re-open". | Superseded (ADR-036; spec said not re-openable) | Step 2 note, OQ2 | Tap button; check focus; Cancel leaves it archived. |
| 16-24 | Confirming Re-open makes the op active again with every shore point as left: `/operations` shows the board, Command shows End Operation again, Past operations no longer lists it. | Superseded (ADR-036) | OQ2 | Confirm; verify state/counts equal pre-end; Audit Log row "Operation re-opened". |
| 16-25 | Re-open is rejected when another op is active: with a new op started, the Past list/empty-state (where the drill-in is reachable) is not shown, so Re-open cannot be reached; no two active ops. | Superseded (ADR-036 one-active rule) | OQ2 | Start a new op after ending the first; confirm Past operations list is not on the active board. Cross-device race (two devices start ops while offline) -> later one shows as "<name> — superseded" in the list ("Started ..." not "Ended ..."). Optional, ADR-041. |
| 16-26 | Ending then re-opening an op that had equipment held restores the held stock (re-holds), even if "back on the rigs" was checked at end. | Superseded (ADR-041 D5) | OQ3 | End with checkbox checked (available restores), Re-open, `/inventory` available drops again. |
| 16-27 | Audit Log (`/audit-log`) shows a row "Operation ended" for the close, in order with "Operation re-opened" if applicable. The event log is retained (archive still readable). | Testable | Step 3, Step 4 (record persists) | Open `/audit-log` as Admin. |
| 16-28 | Cross-device: Device B (online) sees the active board switch to "No active operation" and the op under Past operations after A ends it (no push, no toast required). | Testable | Cross-surface | A ends op; wait on B (focus `/operations`); read empty state and list. Two origins per HARNESS. |
| 16-29 | Cross-device offline: if B was offline while A ended the op and B then deploys/advances a point, after reconnect B's change folds as no effect on every device and B sees the quiet "had no effect" line; the archive is not modified. | Superseded (ADR-041; spec silent) | Cross-surface | B offline per HARNESS (goOffline + offline event), act, reconnect; read sync-area line "Synced — N of your changes had no effect". |
| 16-30 | Announcement: after confirm, a live region announces the end (spec: "Operation ended. Cascade Building Fire archived." assertive). | Testable (expect NOT-BUILT) | a11y | Search build for `role="status" aria-live="assertive"` text after confirm. The only live regions in `OperationsBoard` carry other announcements; grep found no "Operation ended" string in `src/ui` or `src/app`. |
| 16-31 | Button accessible name: spec says "End operation. Cascade Building Fire. Incident Commander only." | Testable (expect SPEC-DRIFT/NOT-BUILT) | a11y | Read accessible name; build label is plain "End Operation". Record the name and the IC-only note as gate-drift (ADR-017). |
| 16-32 | Settings -> Administration -> "Department policies" shows a toggle "Send after-action record by email", on by default, with the helper text; the preference persists across reload and is visible only with `manageSettings`. | Testable | Step 4 opt-out | `/settings/administration`, toggle, reload. Helper says delivery "turns on in a later release". |
| 16-33 | Ending an operation sends an after-action email to IC + Operations Section Chief (fallback IC only, then Admins). | Deferred (see below) | Step 4 | Not drivable: `functions/src/index.ts` exports only `provisionAccount`, `adminUpdateAccount`, `deleteOwnAccount`. QA records NOT-BUILT (expected / accepted). |
| 16-34 | Ending an operation never produces a push, toast-to-others, or any in-app message to other devices (Principle 10); only the board state changes on sync. | Testable | Cross-surface | On B during A's end, check no notification/dialog appears; console has no Notification permission requests. |

## Superseded / Deferred

| Item | Status | Citing decision |
|---|---|---|
| IC-position gate (live `myRole` = IC) for End Operation | Superseded -> `manageOperations` permission, hide-not-grey | ADR-017 #3, #380; criterion 16-03 |
| Modal title "End this operation?" and body "cannot be re-opened" | Superseded -> "End Operation?" + archive/new-op copy | ADR-036 (re-open), 16-06/07 |
| Terminal / no Re-open transition in state diagram | Superseded -> Re-open from Past-operations drill-in, Cancel-first confirm, any capable device | ADR-036; spec OQ2 (itself marked RESOLVED) |
| Warning text "N shore points still deployed ... short for the next call" | Superseded -> "N shore points still hold equipment — Rig (n)" + checkbox "All equipment is back on the rigs" | ADR-041 D5, #499; gate review M3 (warn, don't block, still in force) |
| "available short for next call" = stored-count decrement | Superseded -> derived `available = quantity − held`, may go negative | ADR-041 D2-stock |
| Past operations: only "Ended ..." rows | Superseded -> adds "— superseded / Started ..." rows for the loser of an active-op race | ADR-041 |
| After-action packet email on End Operation (ICS-201/203/207/208/209 + PAR + Hazard Log + CSV) to IC/Ops/Admins | **Deferred** — transport decided (backend function + transactional provider), not built; toggle saves preference only; Audit Log is the record. | ADR-018 addendum (#406 / #305 / OQ #32); OQ #35 resolved as design only |
| "12 shore points - 14 personnel" summary in modal, SR announcements 16-30/31 | No later decision found; QA records NOT-BUILT if absent | gate review M3 verification table lists only the warning as resolved |

## Risks for the QA agent

- **Guest = no button.** A guest (no department, `NO_PERMISSIONS`) never sees End Operation; use a department Admin. A Default-role member also doesn't see it. That is correct, not a bug.
- **Two entry points** (Command tab and Operations board foot) with the same dialog; test at least the Command one for the spec flow.
- **Dialog copy differs from the spec** by design (16-06/11/14); don't FAIL on the spec's literal text.
- **Rig counts can sum above the total** when one point draws on two rigs; the headline count is points.
- **Checkbox only affects stock**, it does not change whether the op ends. Unchecked is the default and is correct.
- **Past operations list renders only on the empty state** (no active op); after Re-open it disappears. A superseded entry only arises from a two-device race.
- **After-action toggle is a stub**: saving it does nothing observable besides persisting; absence of any email is expected.
- **PWA/service worker**: stale build after a deploy can mask changes (two cold starts); clear storage per HARNESS.
- **Stale frame/exit flash**: probe the modal's close animation and the first frame after confirm for old board text.
- **Sunlight theme**: End Operation label contrast was fixed in Step 1; include it in the 16-02 check.

## Orchestrator note (2026-10-13)
The after-action email **send** is Deferred past v4.0 by #495 ("After-action email send mechanism — deferred past v4.0 (ADR-018 amended)"). Only the department toggle saving its preference is in scope; do not record the missing send as NOT-BUILT.

## Orchestrator addendum (2026-10-21, HEAD 5a6f4e5)
- Wood is required at Add Shore Point (2026-10-17): pick header and footer wood for every point you add.
- The spec-15 pass (15-16) already saw the "N shore points still hold equipment — Rescue 2 (N)" alert with Returned points excluded and Secured included; re-drive it here as 16-11 (do not reuse that evidence).
- #499 / ADR-041: `available = quantity − held` is derived; read inventory rows via their aria-label "N of M available" for 16-15 and 16-26.
