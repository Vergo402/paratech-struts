# BRIEF 25 — Customizing checklists (department editor)

**Spec:** `docs/v4-design/09-workflows/25-customizing-checklists.md` · **Phase G issue:** #230 · **Governing decision:** ADR-020 (departments fully author; provenance marks baseline vs dept-authored; Admin-only).

**Summary.** An Admin opens a checklist in Settings, edits it (add/rename/remove/reorder steps and sections), and the first edit forks it from the FieldShore baseline; the checklist is then badged "Customized by <department>" instead of "FieldShore baseline". Reset to baseline throws the fork away. Crews using the IC Command, Task Level and TCRM checklists in an operation should then see the department's version, with a provenance marker. Edits are meant to be audited and to reach other devices on next sync, with no push.

## Setup

Harness: see `HARNESS.md` (emulators + `npm run dev:emu`, :5200, device A `localhost`, device B `127.0.0.1`). Phone viewport 390x844 unless stated.

1. Device A: `/auth` -> Create Account (`qa251-25-1@example.test`) -> Create department (name it e.g. "Hamden Fire Rescue"). Creator is Admin (ADR-017). Verify the name you pick, because it appears in the badge.
2. Editor location (verified in `src/`): bottom nav Settings -> **Administration** (route `/settings/administration`; row description "Users, roles, audit log, checklists") -> section **Checklists** (`ChecklistEditor`, `src/ui/settings/ChecklistEditor.tsx`). It is rendered only when `department && perms.manageSettings`.
3. Rows: "IC Command Checklist", "Task Level Checklist", and the third checklist (template id `orm-tcrm`, check its title in the list). Each row has a provenance badge and an **Edit** / **Done** button. Inside: per-row grip handle (aria-label "Reorder <label>"), **Edit**, **Remove**, **+ Add step** (per section), **+ Add section**, and (only once customized) **Reset to FieldShore baseline**.
4. Consumer screens to verify propagation and provenance: IC Command Checklist = Command tab, edge tab with aria-label "IC Command Checklist" (`SitStat.tsx`); Task Level Checklist = Operations tab, edge tab aria-label "Task Level Checklist" (needs an active operation); TCRM = Operations, button "Begin Briefing" / "Open Briefing" -> modal "Risk briefing (ORM / TCRM)". Start an operation first (Operations tab) so the last two are reachable.
5. A non-Admin: on device B (`127.0.0.1`) create a second account, join the department via invite code (Users & roles -> invite on A), keep the **Default** role (read + run field work only).
6. A custom-role Admin-lite: on A, Users & roles, create a custom role with only "Manage department settings" on and assign it to a third account (needed for 25-04).

## Criteria

| ID | Criterion (observable outcome) | Tag | Spec § | How to drive / what to read |
|---|---|---|---|---|
| 25-01 | As Admin, Settings -> Administration shows a "Checklists" section listing exactly three checklists, each with a provenance badge. | Testable | Step 1 | Open `/settings/administration`; read section heading "Checklists" and three cards. |
| 25-02 | A never-edited checklist's badge reads "FieldShore baseline". | Testable | Step 1 | Read `.fs-cke-badge` text on a fresh department. |
| 25-03 | On a non-Admin account (Default role) the Checklists section is absent (hidden, not greyed); Administration may not even appear in Settings. | Testable | Role gate, Step 1 | Device B: open `/settings` and `/settings/administration`; confirm no "Checklists" heading and no disabled editor. |
| 25-04 | A custom role with only manageSettings is NOT able to edit checklists (spec: Admin only, no new toggle). Build gates on `manageSettings`, so a custom role holding it will see the editor. Record which. | Testable | Role gate | Device C or reassign role; open Administration. Expect NOT-BUILT/FAIL-or-SPEC-DRIFT per ADR-017 (permission toggle) - report what you see. |
| 25-05 | Tapping "Edit" on a row opens the tree editor in place (button flips to "Done"); "Done" closes it. | Testable | Step 2 | Tap Edit, read section/step rows; tap Done. |
| 25-06 | The editor shows sections (with nested steps) and per-section "+ Add step" and a footer "+ Add section". | Testable | Step 2 wireframe | Read DOM in open editor. |
| 25-07 | "+ Add step" opens an inline field (placeholder/aria-label "New step") with Save and Cancel; saving appends the step. (Spec says a sheet with text-area; build is inline input.) | Testable | Step 2 | Tap + Add step, type, Enter/Save; confirm step appears, Cancel/Escape discards. |
| 25-08 | "+ Add section" adds an empty section (field label "New section"). | Testable | Step 2 | Tap + Add section, type, Save. |
| 25-09 | "Edit" on a step opens the same field pre-filled with its current text (aria-label "Step label"); Save renames it; empty text is ignored. | Testable | Step 2 | Tap Edit on a step; change; Save; try empty. |
| 25-10 | Editing a baseline step's wording is allowed (not extend-only). | Testable | Step 2 | Rename a baseline step; confirm it sticks after reload. |
| 25-11 | The first successful edit flips that checklist's badge to "Customized by <department name>" and shows "Reset to FieldShore baseline"; before the first edit the Reset link is absent. | Testable | Step 2 fork | Compare card before/after one edit; read badge with the exact dept name. |
| 25-12 | Other checklists are unaffected by editing one (still "FieldShore baseline"). | Testable | Step 1 | Check the other two badges after 25-11. |
| 25-13 | Reorder by keyboard: focus a step's grip (aria-label "Reorder <label>"), ArrowUp / ArrowDown moves it, crossing section boundaries at the ends. | Testable | Step 2, a11y | Focus grip, press arrows, read order. |
| 25-14 | Reorder by drag: dragging the grip moves a step within or into another section, and a section carries its steps; a drop indicator shows during drag. | Testable | Step 2 | Pointer drag via real pointer events on grip; read order after. |
| 25-15 | Phone has visible "Move up / Move down / Move under..." buttons as an assistive-tech alternative to drag (spec). Build exposes only arrow keys on the grip. | Testable | Step 2, a11y | Look for those buttons at 390x844 and via accessibility tree. Expect NOT-BUILT; record that the arrow-key path exists. |
| 25-16 | "Remove" on a step opens a destructive modal titled `Remove "<step>"?` with body "This removes the step for your whole department." and Cancel / Remove buttons. | Testable | Step 2, a11y | Tap Remove; read modal. |
| 25-17 | Remove on a section shows "This removes the section and every step under it. This affects the whole department." | Testable | Step 2 | Tap Remove on a section. |
| 25-18 | Remove modal: Cancel leaves the tree unchanged; focus lands on Cancel (default Cancel); Remove deletes the item. | Testable | a11y, state diagram | Check document.activeElement on open; Cancel then repeat with Remove. |
| 25-19 | "Reset to FieldShore baseline" opens a destructive modal titled `Reset <checklist title>?` with body "This discards your department's customizations and restores the shipped FieldShore version." and Cancel / "Reset to baseline". Default focus Cancel. | Testable | Step 2, a11y | Tap Reset; read modal. |
| 25-20 | Confirming Reset restores the baseline tree and the badge returns to "FieldShore baseline"; Reset link disappears. | Testable | Reversibility | Confirm; compare steps with an untouched control checklist. |
| 25-21 | Cancel on the Reset modal keeps the customizations. | Testable | Reversibility | Cancel, confirm badge still "Customized by ...". |
| 25-22 | Edits persist across reload (and offline reload). | Testable | Cross-surface (local-first) | Edit, reload `/settings/administration`, reopen; then go offline per HARNESS and repeat. |
| 25-23 | An edited checklist is what crews see: the IC Command Checklist drawer (Command tab) and Task Level drawer / TCRM modal (Operations) show the department's tree, live, in the same session. | Testable | Step 3 | Rename a step in editor; open the matching consumer screen on the same device. |
| 25-24 | Provenance marker "Customized by <department>" appears on the IC Command, Task Level and TCRM attestation screens when the template is a department fork; baseline ones show none or "FieldShore baseline". Source search found no such marker in those screens. | Testable | Step 3, a11y | Open each consumer after 25-11; look for the text. Expect NOT-BUILT. |
| 25-25 | Cross-device: after Admin's edit on device A, device B (another member, online) shows the customized checklist in the consumer screens without an alert/toast/push. | Testable | Cross-surface | A edits; B opens the checklist after sync; confirm text and no notification. |
| 25-26 | Cross-device: the editor stays hidden for B (Default role) while B still receives the fork (25-03 + 25-25). | Testable | Role gate | Combined read on B. |
| 25-27 | Reset on A reverts B to baseline on next sync. | Testable | Reversibility | A resets; B reloads/reads. |
| 25-28 | Existing attestations survive a rename (node ids stable): attest a step, then rename it; the check mark remains. (Spec silent; build keys on node id.) | Testable | Instance vs template | Attest in an active op; rename in editor; reopen. |
| 25-29 | Template edits are audited (who/when) and appear in the Audit log. Source: describe.ts has no template-edit event and the store file states the audit is deferred. | Testable | Intro, Reversibility | Edit, then open Audit log (Administration -> Audit log); record whether an entry exists. Expect NOT-BUILT; check #504 / ADR-020 text before filing. |
| 25-30 | Reorder, add, edit controls and the Edit/Done/Save buttons meet 48pt (non-operational) tap targets on phone; the text-style Edit/Remove links are the risk. | Testable | Actors/role gate | Measure bounding boxes at 390x844. |
| 25-31 | The Checklists screen row copy for TCRM carries the honest note "Content ships v4.1 · structure on" (spec). | Testable | Step 1 wireframe | Look in the TCRM card. Expect NOT-BUILT; the section instead has a description paragraph. |
| 25-32 | Section intro copy reads "Tailor the IC Command, Task Level, and risk-briefing checklists... crews see "Customized by <dept>"". (Build copy, record for the spec-drift list.) | Testable | Step 2 | Read `.fs-set-group-desc`. |
| 25-33 | Screen-reader names: row/badge read provenance; editor opens with an announced editor title; step sheet announces "Edit step. <text>". Build uses grip aria-label "Reorder <label>", `aria-roledescription` "Drag handle", `aria-keyshortcuts` ArrowUp/ArrowDown, inputs aria-labelled. | Testable | Accessibility | Read the accessibility tree. Record literal strings; expect partial drift from spec wording. |

## Superseded / Deferred

- **Editor UI ships v4.1 with baseline content (spec Open question 2, 99-open-questions #32, Gate Review §10 B5)** - **Superseded in effect:** the editor is built and live in v4.0 (`ChecklistEditor.tsx`). Treat 25-01..25-28 as Testable. Baseline wording is still placeholder (see `src/core/checklist/baseline.ts` header, "CONTENT-PASS"); baseline step text is **not** approved doctrine and is a known v4.1 content deferral, not a bug.
- **Per-step provenance (spec OQ3)** - Deferred to Phase H refinement; v4.0 working choice is per-checklist marker. Not tested.
- **Delegated checklist-author role (OQ4)** - Deferred, forward hook only (ADR-020, ADR-017).
- **Baseline-update propagation / re-merge (OQ1, OQ5)** - Deferred (v4.1+). Not tested.
- **LWW overwrite from reconnecting phone, no tell (#504, [v4.1])** - checklist edits are whole-blob last-write-wins (`checklistTemplateStore`, rules `deptNode['checklists']`); two Admins editing concurrently can lose an edit. Deferred (#504); do not test as a defect, but you may note the behaviour if you try.
- **Sheet for add/edit (spec: `sheet.md` text-area)** - the build uses an inline input; tag as SPEC-DRIFT if it behaves sensibly (no later ADR located for this; record as drift).
- Searched open issues (checklist, Backlog, v4.1, deferred): no issue specifically defers the provenance marker on attestation screens or the template-edit audit; both stay Testable and likely NOT-BUILT. #253 (Type IV sim after checklists) is the sim lane, not this spec.

## Risks for the QA agent

- Gate mismatch: the build shows the editor to anyone with `manageSettings` (Admin has it; custom roles can too), not "Admin only". Do not treat it as a bug on sight; report as in 25-04 and let the orchestrator rule.
- Hidden vs absent: the Administration row can appear for a non-Admin who holds an IC position (`canIncident`), but the Checklists section still must not render.
- Everything is placeholder wording, so compare trees structurally (counts, order), not against the June spec's example steps ("Establish command post" exists in the placeholder IC tree).
- Edit/Remove are plain text links; small hit areas are likely to read as tap-target failures (25-30), which is a real finding, not noise.
- Drag needs real pointer events with pointer capture; synthetic `click`s will not move rows. Use keyboard arrows as the reliable path.
- The IC checklist drawer is on the Command tab; the Task Level drawer needs an active operation and its edge tab only appears there. `<Link>` taps may need `location.assign`.
- Exit animations: a dismissed modal may flash its text for a frame; use the HARNESS probes for that.
- Sunlight theme: check badge contrast ("Customized by ...") since provenance is the safety guardrail.
- Fork is by tree edit only: re-saving the same text still forks and flips the badge; this is not a bug.
- Concurrent LWW (#504): do not run edits on A and B at the same time and call the loss a bug.

## Orchestrator addendum (2026-10-21, HEAD 5a8666e)
- Already observed today (specs 22/23/24, do not reuse as evidence): the Settings → Administration → Checklists editor exists for the IC Command Checklist, the Task Level Checklist and the briefing; badge "FieldShore baseline" ↔ "Customized by <dept>"; Reset to baseline has a confirm; live drawers update without losing attestations; the DRAWERS show no customized cue (only Settings does). Re-drive these here as the spec's own criteria.
- Known filed: #549 (IC drawer focus/Esc), #550 (task checklist keyed per device), #551 (briefing Begin race). Cite instead of re-filing if you hit them.
- Positions follow the account (552faca); Admin = department ROLE (ADR-017) and gates this editor; a non-Admin must not see it.
