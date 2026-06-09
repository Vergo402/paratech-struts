# Workflow: Customizing checklists (department editor)

> Phase G workflow spec — [#230](https://github.com/Vergo402/paratech-struts/issues/230). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/135).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`50-settings.md`](../08-information-architecture/50-settings.md) (the config home + the Admin-gated Department-policies group); [`nested-checklist.md`](../03-primitives/nested-checklist.md) (the checklist primitive; rule 6 — Principle 1 binds the **baseline**, departments author the **overlay**); [`33-ic-command-checklist.md`](../08-information-architecture/33-ic-command-checklist.md) / [`22-task-level-checklist.md`](../08-information-architecture/22-task-level-checklist.md) / [`23-orm-tcrm.md`](../08-information-architecture/23-orm-tcrm.md) (the three checklist screens whose templates this authors); [`list.md`](../03-primitives/list.md) + [`input.md`](../03-primitives/input.md) + [`sheet.md`](../03-primitives/sheet.md) + [`modal.md`](../03-primitives/modal.md) (the authoring primitives); [`badge.md`](../03-primitives/badge.md) (the provenance marker); [ADR-020](../11-decisions/ADR-020-department-checklist-authoring.md) (**the governing decision — departments fully author; the curate-only earlier position is superseded**); [ADR-017](../11-decisions/ADR-017-custom-department-roles.md) (Admin-only; two orthogonal axes); [ADR-002](../11-decisions/ADR-002-principle-1-scope-clarification.md) (doctrine vs. department configuration — the precedent).
> **Precondition:** a department exists and the acting user holds **Admin** (ADR-017). This is a back-office surface, not a fireground one.

---

## Purpose and goal

Let a department make the checklists *theirs* — start from a generalized FieldShore flow and tailor every
step to the department's own SOPs.

**Goal:** an Admin opens a checklist in the department editor, **forks the FieldShore baseline**, and fully
authors it — add, edit, remove, and reorder steps and sections — to match the department's run cards.
The customized checklist is the department's own; the app marks it as such (provenance) so no crew ever
mistakes a tailored step for FieldShore-asserted doctrine. A **reset to baseline** recovers the shipped
version at any time.

This is governed by **[ADR-020](../11-decisions/ADR-020-department-checklist-authoring.md)** — a Principle-1
scope clarification (extending [ADR-002](../11-decisions/ADR-002-principle-1-scope-clarification.md)):

> **A department authoring its own checklist procedures is configuration of its own SOPs — not the app
> inventing doctrine.** FieldShore ships a paraphrase-approved **baseline** (where Principle 1 binds);
> departments **fork and fully tailor** it. The boundary is held by **provenance** (baseline vs.
> department-authored), not by restricting authoring.

*(An earlier draft of this spec read `nested-checklist` rule 6 conservatively and limited departments to
curate-only — enable/disable + approved presets. That position is **superseded by ADR-020**: departments
author fully.)*

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Admin** | Phone (floor) / tablet / laptop | Tailoring the department's checklists to its SOPs, before/between incidents |
| **Everyone else** | — | Consumes the resulting checklist instances (workflows [#227](22-ic-command-checklist.md) / [#228](23-task-level-checklist.md) / [#229](24-tcrm-briefing.md)) — they attest, they do not author |

**Role gate:** **Admin only** (ADR-020 sub-decision 2; no new permission toggle in v4.0). Authoring is a
back-office capability — **orthogonal to ICS position** (a crew attesting an instance is gated by its
fireground role; an Admin editing the template is gated by the back-office role — the two-axes rule of
ADR-017 / ADR-008). **48pt non-operational targets. No broadcast render.**

---

## Template vs. instance — the load-bearing distinction

| | Template (this workflow) | Instance (workflows #227 / #228 / #229) |
|---|---|---|
| **What** | The set of steps a checklist offers | A specific crew/task going through those steps |
| **Who** | **Admin** (back-office) | The fireground role (IC / team officer / Rescue Group Supervisor) |
| **Where** | Settings → Department policies → Checklists | The side-drawer / briefing surface during an operation |
| **Action** | Author — add / edit / remove / reorder; reset to baseline | Tap-to-attest each leaf (sign + time) |
| **Provenance** | Sets it — FieldShore baseline vs. department-authored | Renders it — a crew sees whose step it is |

Confusing the two is the anti-pattern: this workflow never lets an Admin *check off* doctrine on behalf of
crews, and the attestation workflows never let a field user *edit* the steps.

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> ChecklistEditorList

    ChecklistEditorList --> SettingsHome : Admin · back → list
    [*] --> SettingsHome
    SettingsHome --> ChecklistEditorList : Admin · Settings → Department policies → Checklists → list (Admin-only; hidden off-role)

    ChecklistEditorList --> Editor : Admin · tap a checklist → editor (shows baseline or the dept fork)
    Editor --> ChecklistEditorList : Admin · back → editor (edits already saved)

    Editor --> StepSheet : Admin · Add step / tap a step → sheet (text-area; provenance set to department-authored)
    StepSheet --> Editor : Admin · save / cancel → sheet (reversible)
    Editor --> Reordered : Admin · drag / move-button a step or section → editor (reversible)
    Editor --> RemoveModal : Admin · Remove step / section → modal (destructive confirm)
    RemoveModal --> Editor : Admin · Cancel / Remove → modal
    Editor --> ResetModal : Admin · Reset to FieldShore baseline → modal (destructive — discards customizations)
    ResetModal --> Editor : Admin · Cancel / Reset → modal

    note right of Editor : Principle 1 binds the BASELINE.\nEverything the Admin authors is the dept's own SOP, marked by provenance.
```

Authoring edits are **reversible** (re-edit a step, drag it back) with two **destructive** confirms —
**Remove** (a step/section) and **Reset to baseline** (discards the department's customizations). Every
edit is audited (who/when, ADR-009 / D7.5).

---

## Step-by-step

### Step 1 — Open the checklist editor (Admin)

```
┌─────────────────────────────────────┐
│  Settings                           │
│─────────────────────────────────────│
│  Department policies        (Admin) │  ← Admin-only group (hidden off-role)
│   › Checklists                      │  ← this workflow
│   › Apparatus types                 │  ← the precedent (configurable vocabulary, ADR-002)
│   › After-action auto-email         │  ← ADR-018 toggle (#308)
└─────────────────────────────────────┘
```

Lives under the Admin-gated **Department policies** group in Settings (cites
[`50-settings.md`](../08-information-architecture/50-settings.md) §Administration gating). **Hidden, not
greyed**, for non-Admins.

```
┌─────────────────────────────────────┐
│  ‹ Settings    Checklists           │
│─────────────────────────────────────│
│  IC Command Checklist               │
│   [ FieldShore baseline ]         › │  ← provenance badge: unedited
│  Task Level Checklist               │
│   [ Customized by Hamden FR ]     › │  ← provenance badge: department-authored fork
│  TCRM Briefing                      │
│   [ FieldShore baseline ]         › │
│   Content ships v4.1 · structure on │  ← honest status surfaced inline
└─────────────────────────────────────┘
```

A [`list.md`](../03-primitives/list.md) of the three checklists, each carrying a **provenance**
[`badge.md`](../03-primitives/badge.md) — **FieldShore baseline** (unedited) or **Customized by
\<department\>** (a department-authored fork). Tapping one opens the editor.

---

### Step 2 — Author the checklist (fork the baseline; full editing)

```
┌─────────────────────────────────────┐
│  ‹ Checklists   IC Command          │
│   [ Customized by Hamden FR ]       │  ← provenance; editing forks the baseline on first change
│─────────────────────────────────────│
│  ▾ Phase II — Ongoing command       │  ← section (Admin can rename / reorder / remove)
│     ⠿ Establish command post     ✎  │  ← ⠿ drag handle · ✎ edit step text
│     ⠿ Assign Safety Officer      ✎  │
│     ⠿ Confirm accountability (PAR)✎  │
│     [ + Add step ]                  │
│  [ + Add section ]                  │
│  ─────────────────────────────────  │
│  [ Reset to FieldShore baseline ]   │  ← destructive escape hatch
└─────────────────────────────────────┘
```

The editor exposes **full authoring** (ADR-020 sub-decision 3):

- **Add step / Add section** — opens a [`sheet.md`](../03-primitives/sheet.md) with a text-area
  ([`input.md`](../03-primitives/input.md)). New content is **department-authored** by construction.
- **Edit step text** (the ✎) — opens the same sheet pre-filled. Editing a baseline step's wording is
  allowed (ADR-020 rejected extend-only); the step becomes department-authored.
- **Reorder** — drag the ⠿ handle (tablet), or **Move up / Move down / Move under…** button equivalents on
  phone + assistive tech (the *assistive-tech-cannot-drag* contract,
  [`accessibility.md`](../07-design-system/accessibility.md)).
- **Remove step / section** — a destructive confirm [`modal.md`](../03-primitives/modal.md).
- **Reset to FieldShore baseline** — a destructive confirm modal that discards the department's
  customizations and restores the shipped baseline.

**On first edit, the department forks the baseline** — the provenance flips from "FieldShore baseline" to
"Customized by \<department\>." From then on the department's fork is what its operations use; the FieldShore
baseline is still recoverable via Reset.

**Principle 1 is intact:** FieldShore asserts only its own paraphrase-approved baseline as doctrine; every
edit here is the department's own SOP, surfaced as such. The safety engine (load tables, shore types, strut
math) is **not** a checklist template and is never editable here (ADR-002 / ADR-020).

---

### Step 3 — Provenance carries to the attestation screens

The customization is visible **where crews use it**, not just in Settings. On the IC Command / Task Level /
TCRM attestation surfaces (workflows [#227](22-ic-command-checklist.md) / [#228](23-task-level-checklist.md) /
[#229](24-tcrm-briefing.md)), a department-tailored checklist renders its **"Customized by \<department\>"**
provenance marker, so a crew always knows the steps are their department's SOP — not FieldShore-asserted
doctrine. The attestation mechanics are otherwise unchanged (the screens consume whichever template is
active).

---

## Cross-surface story

| Device | Step | What it sees |
|---|---|---|
| Admin's **device** | 1–2 | Forks and authors the department's checklist; edits are audited |
| Field users' **devices** | 3 | On next sync: the department-tailored checklist (with its provenance marker) appears in new operations; **no push** |
| **Broadcast** | — | Never renders the editor |

No push (Principle 10) — a template change is configuration, not an operational event. It applies to new
operations on next sync.

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Add / edit a step | Yes | Re-edit (sheet, no confirm) |
| Reorder | Yes | Drag / move it back |
| Remove a step / section | Terminal per item (destructive modal) | Re-add it; or Reset to baseline to recover shipped content |
| Reset to FieldShore baseline | Terminal (destructive modal — discards customizations) | Re-author from the baseline |
| First edit (fork) | Yes | Reset to baseline returns to the shipped version |

No timed undo (ADR-010). Edits are audited (ADR-009 / D7.5) — the department's checklist is accountable the
same way its incidents are.

---

## Composed screens and primitives

- [`50-settings.md`](../08-information-architecture/50-settings.md) — the Department-policies group that
  hosts the checklist editor (precedent: the Apparatus-Types vocabulary editor, ADR-002).
- [`list.md`](../03-primitives/list.md) — the checklist list + the section/step tree in the editor.
- [`input.md`](../03-primitives/input.md) — the step text-area.
- [`sheet.md`](../03-primitives/sheet.md) — the add/edit-step sheet.
- [`modal.md`](../03-primitives/modal.md) — Remove (step/section) + Reset-to-baseline destructive confirms.
- [`badge.md`](../03-primitives/badge.md) — the provenance marker (FieldShore baseline vs. Customized by
  \<department\>).
- [`nested-checklist.md`](../03-primitives/nested-checklist.md) — the primitive whose templates this
  authors (rule 6: Principle 1 binds the baseline; departments author the overlay).

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard, the
*assistive-tech-cannot-drag* contract, [`input.md`](../03-primitives/input.md), [`sheet.md`](../03-primitives/sheet.md),
and [`modal.md`](../03-primitives/modal.md).

Screen-reader behavior particular to this workflow:

- **Checklist list:** each row reads its provenance — **"IC Command Checklist. FieldShore baseline."** /
  **"Task Level Checklist. Customized by Hamden Fire Rescue."**
- **Editor opens:** **"IC Command Checklist editor. Add, edit, remove, or reorder steps."**
- **Add / edit step:** the sheet announces **"Edit step. Establish command post."**; the text-area is a
  labeled field.
- **Reorder (AT):** button equivalents — **"Move up", "Move down", "Move under…"** — each focusable.
- **Remove step (destructive):** modal traps focus, default on Cancel — **"Remove step? Establish command
  post."**
- **Reset to baseline (destructive):** **"Reset to FieldShore baseline? This discards your department's
  customizations."** (`aria-live="assertive"`; default Cancel).
- **Provenance on attestation screens:** the customized checklist announces **"Customized by Hamden Fire
  Rescue"** when a crew opens it.
- No new SR script row needed (list + input + sheet + modal patterns already registered).

---

## Open questions

1. **Baseline-vs-fork data model** ([ADR-020](../11-decisions/ADR-020-department-checklist-authoring.md)):
   how a department fork stores its divergence from (and reset to) the shipped baseline — a full copy vs. a
   diff overlay — is a Phase H schema decision. Affects how a future baseline update (v4.1+) interacts with
   an existing department fork (does it offer to re-merge, or leave the fork untouched?).
2. **Editor-UI ship version** ([`99-open-questions.md`](../99-open-questions.md) #32): the authoring UI
   composes only existing primitives, but it needs baseline content to fork from — so it ships **with or
   after** the v4.1 paraphrase-approved baseline content. The *decision* (departments author) is locked now
   (ADR-020); the editor build rides the v4.1 checklist-content timeline.
3. **Provenance granularity:** whether the marker is per-checklist ("Customized by \<department\>") or
   per-step (baseline steps vs. department-added steps visually distinguished within one checklist) — the
   per-checklist marker is the v4.0 working choice; per-step provenance is a Phase H refinement.
4. **Delegated checklist authors (forward hook):** v4.0 is Admin-only (ADR-020). If departments later want a
   non-Admin "checklist editor" role, that is a new back-office permission toggle under ADR-017 — noted, not
   built.
5. **Baseline update propagation:** when FieldShore revises a baseline checklist (corrected doctrine), how
   departments on an older fork are notified/offered the update — tied to OQ1's data model. Phase H/v4.1.
