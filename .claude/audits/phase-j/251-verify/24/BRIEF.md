# QA brief 24 — TCRM briefing

- **Spec:** `docs/v4-design/09-workflows/24-tcrm-briefing.md` · **Phase G issue:** #229 (epic #135)
- **Drafted:** 2026-10-13, reconciled against Gate Review §10 / VERIFICATION, ADR-010/016/018/019/020/021/037, `.claude/rules/v4-phase-status.md`, step1-fixes LEDGER (no briefing rulings found), board deferrals (#493–#496, #525; none cover the briefing).

**Workflow in plain words.** On an active operation the Rescue Group Supervisor taps **Begin Briefing**. A full-screen form opens with the four TCRM steps and five crew questions. Each row is tapped to attest (signed with role + 24h time), re-tapped to undo. **End Briefing** closes it and records start/end. There is no countdown, and a briefing (open, ended, or never held) never blocks deploying, status advances, or crew entry. Net-new in v4.

## Setup

Use the emulator harness per `HARNESS.md`, phone viewport 390x844 unless noted.

1. Sign in, create/join a department (account is Admin, so it can manage operations and edit checklists).
2. Create at least one apparatus with stocked equipment (Inventory tab) so a strut can be deployed later (needed for the non-gating criteria).
3. **Operations** tab (`/operations`) -> **Start Operation** (button shown only with manage-operations permission). Fill the form and start it.
4. Add one shore point (Add shore point flow, spec 11) so there is something to advance in the non-gating check.
5. Set **My Role** to a position (Command tab, `/command`; e.g. Rescue Group Supervisor) so the attestation signature shows a position title. A second run with no position assigned shows the fallback role string (record what it reads).
6. Second device (cross-device criteria only): second browser context signed into the same department on the same harness (port :5200), joined as a different member. Optionally assign that member as Safety Officer.

**Where things are (verified in `src/`):**
- Entry: Operations tab, **bottom of the board**, in the footer row beside **End Operation**. Label is **Begin Briefing** (no briefing active) or **Open Briefing** (one active). `OperationsBoard.tsx` ~L1546. **There is no entry on SitStat/Command and no "Add hazard" sibling in a button bar** (spec wireframe differs).
- Surface: Modal, `variant="form"`, title **Risk briefing (ORM / TCRM)** (`OrmBriefingModal.tsx`), footer button **End Briefing**. Header line "Briefing started HH:MM". Footer note: "Records that the briefing happened — it never blocks crew entry, deployment, or any status advance."
- Rows (`core/checklist/baseline.ts`, template `orm-tcrm`): Explain the plan and assignments / List the known hazards / Ask the crew for input / Speak - anyone can stop the operation / section **Crew questions** (0 / 5) with five "Does everyone…?" rows. Rows are `role="checkbox"` with `aria-checked`; sections are buttons with `aria-label="<label>, N of M complete"`.
- Audit log (`/audit-log`): events "Briefing started" / "Briefing ended" (badge Checklist) plus checklist attestation events.
- Template editor: Settings -> Department area, **Checklists** section (`ChecklistEditor.tsx`), card **Risk briefing (ORM/TCRM)**, badge **FieldShore baseline** or **Customized by <dept>**.

## Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 24-01 | With an active operation, the Operations board shows a **Begin Briefing** button; before any session it does not read "Open Briefing". | Testable | Step 1 | `/operations`, scroll to the board foot. Read the button label. |
| 24-02 | The entry is a button on the active-operation screen, not a navigated screen: tapping it does not change the URL path. | Testable | Step 1 | Note `location.pathname` before/after the tap. |
| 24-03 | Tapping Begin Briefing opens a full-screen form modal titled **Risk briefing (ORM / TCRM)** with a close (X) control and an **End Briefing** footer button. | Testable | Step 1, 2 | Screenshot at 390x844; confirm it fills the viewport, not a bottom sheet. |
| 24-04 | The open surface shows "Briefing started HH:MM" with a 24-hour clock stamp of the Begin tap (within the same minute). | Testable | Step 1 | Read header line; compare to wall clock. |
| 24-05 | All four steps are visible on open with no section collapsed (auto-collapse OFF): Explain the plan and assignments, List the known hazards, Ask the crew for input, Speak - anyone can stop the operation. | Testable | Step 2 | Read rows. (Wording differs from the spec wireframe; see Superseded S1.) |
| 24-06 | The five crew questions sit in a **Crew questions** section showing a count of "0 / 5" and all five rows visible. | Testable | Step 2 | Read section header and rows. Count badge, not a progress bar. |
| 24-07 | Tapping a step row checks it; the row then shows its signature as "<role> · HH:MM" (role spelled out, mono 24h time). | Testable | Step 2 | Tap "Explain the plan and assignments"; read the attribution line under the label. |
| 24-08 | The signature role equals the actor's assigned ICS position title (Setup 5); with no position it shows a fallback role, not blank. | Testable | Step 2 | Compare to Command tab My Role. Record fallback string if no position. |
| 24-09 | Tapping a checked row un-checks it with no confirm dialog; the signature disappears. | Testable | Step 2-R | Re-tap the checked row. Expect no modal. |
| 24-10 | Checking crew-question rows updates the section count (e.g. "2 / 5") and section state is derived: no single control completes the whole briefing. | Testable | Step 2 | Check two questions, read count; look for any "complete all" control (expect none). |
| 24-11 | Row tap target is >= 56pt tall (whole row tappable), at least 44px minimum. | Testable | Step 2, A11y | `getBoundingClientRect().height` on `.fs-ck-leaf` at 390 wide. |
| 24-12 | Attesting uses tap only, never a slide/hold gesture (tap-to-attest, not the safety slide). | Testable | Step 2 | Confirm one tap checks; no slider present. |
| 24-13 | Each row exposes `role="checkbox"` and `aria-checked` toggling true/false on tap; section headers expose "<label>, N of M complete". | Testable | A11y | Accessibility tree / `read_page`. |
| 24-14 | The modal is a focus-trapped dialog (`aria-modal`), focus moves into it on open, Esc closes it, focus returns to the Begin/Open Briefing button. | Testable | A11y | Tab through; press Esc; read `document.activeElement`. |
| 24-15 | **End Briefing** closes the surface; reopening the board shows the entry as **Begin Briefing** again (session no longer active). | Testable | Step 3 | Tap End Briefing; read the board-foot button. |
| 24-16 | After End, the audit log lists "Briefing started" and "Briefing ended" with times and attribution, plus the checklist attestations made in between. | Testable | Step 3 | `/audit-log`; read rows. Checks made before End appear. |
| 24-17 | Ending a briefing with zero rows checked is allowed (no block, no warning). | Testable | Step 3 | Begin then End immediately. |
| 24-18 | Never gates: with a briefing open, a strut can still be deployed and a shore point status advanced (do this behind the modal, i.e. close X first, then act; briefing stays open). | Testable | Step 3, Purpose | Close with X, deploy a strut, advance a status; no block/prompt mentioning the briefing. |
| 24-19 | Never gates: with no briefing ever begun, the same deploy/advance works with no prompt. | Testable | Step 3 | Fresh op, deploy/advance. |
| 24-20 | No countdown or timer anywhere in the briefing surface; the only time shown is the start stamp and attestation stamps. | Testable | Why no countdown | Visual inspection plus text search for "seconds", "remaining", a ticking element. |
| 24-21 | Dismissing with X (without End) closes the surface. Record whether a session remains active (entry flips to **Open Briefing**) or none is recorded; the spec says "no session recorded". | Testable | State diagram, Reversibility | Tap X; read the board-foot button; check `/audit-log` for "Briefing started". Expected build behavior: button reads **Open Briefing** (session was stamped at Begin), which contradicts the spec. QA records the actual and the verdict (see Risks R1). |
| 24-22 | Reopening via **Open Briefing** shows the same session: original start time, earlier attestations preserved. | Testable | Step 2 | Check a row, X, Open Briefing; compare. |
| 24-23 | Tapping Begin Briefing twice (or from the second device) does not create a duplicate session; the second tap resumes the active one. | Testable | Step 1 | Two taps; audit log shows a single "Briefing started" for the period. |
| 24-24 | Re-beginning after End starts a new, separate session with no rows pre-checked; the earlier session stays in the log (append-only). | Testable | Reversibility | End, Begin again; rows all unchecked; audit log has both sessions. |
| 24-25 | Checking/unchecking is audited: un-check produces its own audit-log row with actor and time. | Testable | Step 2-R | Check, uncheck, read `/audit-log`. |
| 24-26 | Cross-device: attestations made on device A appear on device B (same department, same op) without reload, with attribution. | Testable | Cross-surface | Device A checks a row; device B opens the briefing (Open Briefing) and reads the signature. Allow sync delay. |
| 24-27 | Cross-device: device B sees the briefing as delivered/ended in its audit log after A ends it; nobody is paged (no push/toast demanding action). | Testable | Cross-surface | Device B `/audit-log`; watch for any blocking prompt (expect none). |
| 24-28 | Offline: with the network blocked, Begin, check rows, and End all work locally and sync on reconnect. | Testable | Foundation (offline) | Toggle offline in the harness; perform flow; reconnect; confirm audit log on device B. |
| 24-29 | Settings -> **Checklists** lists **Risk briefing (ORM/TCRM)** with the badge **FieldShore baseline**; editing a step and saving flips it to **Customized by <dept>** and the new wording appears in the briefing surface. | Testable | ADR-020 (supersedes spec OQ3 wording) | Edit a label in the editor, then Begin Briefing and read it. Also confirm **Reset to FieldShore baseline** restores. |
| 24-30 | Spec "Add note" control in the briefing surface (optional note captured on the record). | Testable | Step 2 | Look for **Add note**. No such control found in `OrmBriefingModal.tsx`; QA records NOT-BUILT unless it exists. |
| 24-31 | Spec: a per-Group/per-task attach target, so two Group Supervisors briefing at once get separate sessions. | Testable | OQ1, OQ4 | Build looks op-wide (`activeBriefing` returns the single most recent un-ended session). QA records NOT-BUILT/DRIFT with evidence from the second device (24-23). |
| 24-32 | Spec: Safety Officer and Operations Section Chief devices show a briefing status (record) alongside the operation. | Testable | Cross-surface | No dedicated indicator found in `src/` outside the audit log. Look on Operations/Command/SitStat on device B for any "briefing in progress/complete" marker; record NOT-BUILT if only the audit log shows it. |
| 24-33 | Spec: dismissing X after attesting steps does not silently destroy delivered work (Gate Review discard-guard concern, Nair). | Testable | Gate Review §10 | Check rows, X, Open Briefing; rows still there. (Pairs with 24-22.) |

## Superseded / Deferred

- **S1 — Step/question wording** (spec wireframe: "Explain the task", "Speak up authority confirmed", "Everyone knows the objective"). Spec OQ3 and Gate Review B5/M5 deferred wording to v4.1. **The build ships a FieldShore-baseline wording now** (`core/checklist/baseline.ts`, listed in 24-05/06) and ADR-020 lets Admins author their own (24-29). Treat baseline text as the expected text; the spec wireframe copy is SPEC-DRIFT.
- **S2 — Entry placement** (spec: button bar with "Begin briefing" and "Add hazard", on Operations or SitStat). Build: board-foot button on Operations only, capitalized **Begin Briefing** / **Open Briefing**, next to End Operation. Treat as SPEC-DRIFT (check Alex ruling R1: drift passes).
- **S3 — Surface title** "TCRM Briefing" -> build title **Risk briefing (ORM / TCRM)**; footer button "End briefing" -> **End Briefing**.
- **S4 — Screen-reader strings** (spec's "Begin TCRM briefing", "Briefing started" live announcements, "Explain the task checked. Rescue Group Supervisor, 09:14."). The build uses generic NestedChecklist roles; no briefing-specific `aria-live` strings found. Not driven as exact copy (covered structurally in 24-13/14); QA may note absence as drift.
- **Deferred (Gate Review §10 / VERIFICATION):** per-crew-member roster binding ("who got briefed" names; Nair) — accepted deferral; numeric ORM/GAR score (spec OQ2, out of scope); a discard-guard on X (raised in §10; check, do not require). No board issue (#493–#496, #525) covers the briefing itself; none of the above needs a Deferred tag against a filed issue.
- **Broadcast read-only indicator**: Broadcast surface is deferred (#496). Do not test.
- **Spec 24 Step 1 "dismiss without End -> no session recorded"** is not a later decision; it is a build deviation candidate (24-21).

## Risks for the QA agent

- **R1 — X vs End.** Begin commits `BriefingStarted` the moment Begin Briefing is tapped, before the modal opens. X only closes the modal. Expect the button to read **Open Briefing** afterwards and the audit log to show "Briefing started". That contradicts the spec ("no session recorded"); report it as a spec/build divergence, not a crash.
- **R2 — Begin button visibility.** It sits at the very bottom of the Operations board, below the lanes/deleted section; scroll. It is not on SitStat or Command.
- **R3 — Wording differs from the spec** (S1). Do not fail rows for text that matches `baseline.ts`.
- **R4 — Role in the signature** depends on My Role; an unassigned account shows a fallback string (24-08).
- **R5 — Only the account's role/permission gates Begin.** There is no check that the actor is a Rescue Group Supervisor; the spec claims that role gate. Record what a non-RGS member sees (Q1 cross-cutting question about position gates applies).
- **R6 — Time format** is 24h HH:MM. Seconds are not shown.
- **R7 — Modal behavior**: form modals do not close on outside tap; only X, Esc, and End Briefing close. Not a bug.
- **R8 — Sync delay** on the emulator harness: wait a few seconds before judging cross-device criteria; PWA service-worker staleness needs a hard refresh after rebuilds.
- **R9 — Past operations**: `PastOperationView` shows no briefing record; don't expect one after End Operation.
