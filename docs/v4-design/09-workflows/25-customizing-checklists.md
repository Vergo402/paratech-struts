# Workflow: Customizing checklists (department editor)

> Phase G workflow spec — [#230](https://github.com/Vergo402/paratech-struts/issues/230). Sub-issue of epic [#135](https://github.com/Vergo402/paratech-struts/issues/135).
> Cites [`00-workflow-foundation.md`](00-workflow-foundation.md) for all shared conventions.
> Source: [`50-settings.md`](../08-information-architecture/50-settings.md) (the config home + the Admin-gated Apparatus-Types vocabulary editor — the closest existing precedent); [`nested-checklist.md`](../03-primitives/nested-checklist.md) (the checklist primitive + **Principle-1 rule: doctrine content is sourced, never invented**); [`33-ic-command-checklist.md`](../08-information-architecture/33-ic-command-checklist.md) / [`22-task-level-checklist.md`](../08-information-architecture/22-task-level-checklist.md) / [`23-orm-tcrm.md`](../08-information-architecture/23-orm-tcrm.md) (the three checklist screens whose templates this would govern); [`list.md`](../03-primitives/list.md) + [`toggle.md`](../03-primitives/toggle.md) + [`sheet.md`](../03-primitives/sheet.md) (the curation primitives); [ADR-017](../11-decisions/ADR-017-custom-department-roles.md) (Admin / "Manage department settings" gate); [Principle 1](../02-principles.md) (doctrine fidelity).
> **Precondition:** a department exists and the acting user holds **Admin** (or a custom role granted "Manage department settings"). This is a back-office surface, not a fireground one.

---

## Purpose and goal — and a scope boundary stated up front

This issue is titled "checklist customization (v4 dept editor)." Writing it forced a boundary that the rest
of the spec turns on, so it is stated here rather than buried:

> **A department cannot freely author checklist doctrine in v4.0.** Checklist *content* — the IC Command
> phases, the Task Level sections, the TCRM steps — is **sourced doctrine, paraphrase-then-approved**
> (Principle 1; [`nested-checklist.md`](../03-primitives/nested-checklist.md) rule 6). A free-text editor
> that let any Admin type their own "doctrine" would put unreviewed, possibly-wrong life-safety language in
> front of crews. That is the exact failure Principle 1 exists to prevent.

So v4.0's "customization" is **curation, not authoring**: an Admin chooses *which* approved checklists are
active for the department and (where approved presets exist) *which preset* — the same shape as the
Apparatus-Types vocabulary editor already in Settings. **Whether departments should ever author their own
checklist steps is the central open question of this workflow**, flagged below for the Phase G gate
([#239](https://github.com/Vergo402/paratech-struts/issues/239)) and doctrine review.

**Goal (v4.0):** an Admin opens Checklist Settings, enables/disables the available checklists for the
department, and selects among approved presets where they exist. The *content* of each checklist remains
sourced and locked.

---

## Actors and surfaces

| Actor | Surface | When |
|---|---|---|
| **Admin** (or custom role with "Manage department settings") | Phone (floor) / tablet / laptop | Configuring which checklists the department uses, before/between incidents |
| **Everyone else** | — | Consumes the resulting checklist instances (workflows [#227](22-ic-command-checklist.md) / [#228](23-task-level-checklist.md) / [#229](24-tcrm-briefing.md)) — they cannot edit templates |

**Role gate:** back-office **Admin / "Manage department settings"** (ADR-017) — orthogonal to ICS position.
Editing the *template* (this workflow) is distinct from attesting an *instance* (the checklist workflows),
and is gated differently: template = back-office Admin; attestation = the fireground role on the checklist.

**48pt non-operational targets. No broadcast render.**

---

## Template vs. instance — the load-bearing distinction

| | Template (this workflow) | Instance (workflows #227 / #228 / #229) |
|---|---|---|
| **What** | The set of steps a checklist offers | A specific crew/task going through those steps |
| **Who** | Admin (back-office) | The fireground role (IC / team officer / Rescue Group Supervisor) |
| **Where** | Settings → Checklists | The side-drawer / briefing surface during an operation |
| **Action** | Enable/disable, select preset (curate) | Tap-to-attest each leaf (sign + time) |
| **Content authorship** | **Locked — sourced doctrine** (Principle 1) | n/a (consumes the template) |

Confusing the two is the anti-pattern: this workflow never lets an Admin *check off* doctrine on behalf of
crews, and the attestation workflows never let a field user *edit* the steps.

---

## State diagram

```mermaid
stateDiagram-v2
    [*] --> SettingsHome

    SettingsHome --> ChecklistSettings : Admin · Settings → Checklists → list (role-gated; hidden off-role)
    ChecklistSettings --> SettingsHome : Admin · back → list

    ChecklistSettings --> ChecklistToggled : Admin · toggle a checklist on/off → toggle (immediate, reversible)
    ChecklistToggled --> ChecklistSettings : reflected in the list

    ChecklistSettings --> PresetSheet : Admin · tap a checklist with presets → sheet (choose approved preset)
    PresetSheet --> ChecklistSettings : Admin · select preset / cancel → sheet (commit; reversible)

    note right of ChecklistSettings : v4.0 = curate among APPROVED templates.\nFree-text authoring is OUT (Principle 1) — see open question.
```

Every action here is **reversible** (a toggle flips back; a preset re-selects) — there is **no destructive
path** and no content authoring. Disabling a checklist hides it from new operations; it never deletes the
attestation history of past instances (that lives immutably in the Audit Log, [#236](31-audit-log-review.md)).

---

## Step-by-step

### Step 1 — Open Checklist Settings (Admin)

```
┌─────────────────────────────────────┐
│  Settings                           │
│─────────────────────────────────────│
│  Department policies        (Admin) │  ← role-gated group (hidden off-role)
│   › Checklists                      │  ← this workflow
│   › Apparatus types                 │  ← the existing precedent (vocabulary curation)
│   › After-action auto-email         │  ← ADR-018 toggle (#308)
└─────────────────────────────────────┘
```

Lives under the Admin-gated **Department policies** group in Settings (cites
[`50-settings.md`](../08-information-architecture/50-settings.md) §Administration gating). **Hidden, not
greyed**, for non-Admins (the Settings hide-not-grey rule).

---

### Step 2 — Curate the available checklists

```
┌─────────────────────────────────────┐
│  ‹ Settings    Checklists           │
│─────────────────────────────────────│
│  IC Command Checklist        [ ⏻ on]│  ← enable/disable (immediate, reversible)
│   Approved preset: ICS-201 default ›│  ← choose among APPROVED presets (where they exist)
│  Task Level Checklist        [ ⏻ on]│
│   Approved preset: USAR default    ›│
│  TCRM Briefing               [ ⏻ on]│
│   Content ships v4.1 · structure on │  ← honest status surfaced inline
└─────────────────────────────────────┘
```

A [`list.md`](../03-primitives/list.md) of the three checklists, each with:
- A **[`toggle.md`](../03-primitives/toggle.md)** to enable/disable it for the department (immediate +
  reversible per Principle 6).
- Where **approved presets** exist, a row that opens a **[`sheet.md`](../03-primitives/sheet.md)** to pick
  among them (e.g., a default vs. a Level III+ expanded set). The presets themselves are sourced and locked
  — the Admin selects, never types.

The **content of each checklist is not editable here** — there is no free-text step editor. Inline status
text is honest about what ships when (structure v4.0; doctrine content v4.1 behind a flag).

⇩ commits → the department's active checklist configuration (reversible)

---

## Cross-surface story

| Device | Step | What it sees |
|---|---|---|
| Admin's **device** | 1–2 | Curates which checklists are active + selects presets |
| Field users' **devices** | — | On next sync: enabled checklists appear in their operations; disabled ones don't; **no push** |
| **Broadcast** | — | Never renders checklist settings |

No push (Principle 10) — a configuration change is not an operational event. It applies to new operations
on next sync.

---

## Reversibility

| Action | Reversible? | Mechanism |
|---|---|---|
| Enable / disable a checklist | Yes | Flip the toggle back (immediate) |
| Select a preset | Yes | Re-open the sheet, choose another |
| (Author free-text content) | **Not available in v4.0** | Sourced doctrine, Principle 1 — see open question |

No destructive/terminal path. Disabling never erases past attestation history (immutable in the Audit Log,
[#236](31-audit-log-review.md)).

---

## Composed screens and primitives

- [`50-settings.md`](../08-information-architecture/50-settings.md) — the Department-policies group that
  hosts Checklist Settings (precedent: Apparatus-Types vocabulary editor).
- [`list.md`](../03-primitives/list.md) — the checklist list.
- [`toggle.md`](../03-primitives/toggle.md) — enable/disable per checklist.
- [`sheet.md`](../03-primitives/sheet.md) — the approved-preset picker.
- [`nested-checklist.md`](../03-primitives/nested-checklist.md) — the primitive whose templates this
  governs (and the source of the Principle-1 content-is-sourced rule).

No new primitives.

---

## Accessibility

Cite [`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard,
[`toggle.md`](../03-primitives/toggle.md), and [`sheet.md`](../03-primitives/sheet.md).

Screen-reader behavior particular to this workflow:

- **Checklist Settings opens:** **"Checklists. Enable or disable the checklists your department uses."**
- **Toggle:** **"IC Command Checklist. On. Double-tap to turn off."** (state carried by thumb position +
  word, never color alone).
- **Preset row:** **"IC Command Checklist preset, ICS-201 default. Double-tap to change."**
- **Preset commit:** **"Preset changed to ICS-201 default."** (`aria-live="polite"`).
- **Off-role:** the Department-policies group is not rendered for non-Admins — nothing to announce.
- No new SR script row needed.

---

## Open questions

1. **THE central question — do departments author their own checklist content at all?** v4.0 says **no**
   (curate among approved templates; content is sourced doctrine, Principle 1). The issue title
   ("dept editor") anticipates more. **Flagged for the Phase G gate ([#239](https://github.com/Vergo402/paratech-struts/issues/239))
   and doctrine review:** if departments are eventually allowed to author/extend steps, it needs a review
   gate (a dept-authored step is unreviewed life-safety language) — most likely a "propose → review →
   approve" flow, not a free-text box. This is a product + doctrine decision for Alex, not a UI detail.
2. **Where authored content would be reviewed:** if (1) goes the authoring route, the review/approval
   workflow (who approves, against what source) is itself a new workflow — out of scope until (1) resolves.
3. **Preset catalog:** which approved presets exist per checklist (default vs. Level III+ expanded, agency
   variants) depends on the v4.1 doctrine-content work. v4.0 ships the curation shell; the catalog fills in
   as content is approved.
4. **Ship version:** the curation UI here is plausibly v4.0 (it composes only existing primitives), but it
   has no content to curate until v4.1 lands the approved templates — so it may ship dark/structure-only in
   v4.0 alongside the checklist screens. Phase H sequencing decision.
