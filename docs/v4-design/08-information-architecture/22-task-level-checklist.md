# IA Spec: Task Level Checklist

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework, persistent chrome) and does not re-derive them.
> Source: [`03-primitives/nested-checklist.md`](../03-primitives/nested-checklist.md) — **the component is fully specified there; this spec composes it** — its "one primitive, three screens" table fixes this screen's depth (2 levels) and primary surface (phone, team officer). [`06-synthesis.md`](../06-synthesis.md) §3.5 (the checklist feature) + Open-Q5 (content deferral), essays [`05-essays/03-ic-workflow.md`](../05-essays/03-ic-workflow.md), [`05-essays/11-scenario-stress.md`](../05-essays/11-scenario-stress.md); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-010](../11-decisions/ADR-010-status-commit-model.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md)/[016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); GitHub [#204](https://github.com/Vergo402/paratech-struts/issues/204). **Net-new — no v3 antecedent** ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §v3 grounding).

---

## Purpose

The team officer's **per-task attestation list**: the doctrine steps for a single task / assignment (Assessment → Search → Access → Extricate → All-clear, each with its steps), worked top-down, every step *signed* — so a crew knows the next undone action and the record shows who completed what (Principle 7; D7.5).

## Where it lives

- **Tab / parent:** **Operations** — reached via a **[side-drawer](../03-primitives/side-drawer.md) side-tab** on the active-operation screen under the Operations tab (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md) / [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)); a companion to [Operations](20-operations.md), the [Cutting Station](21-cutting-station.md), and the [ORM / TCRM](23-orm-tcrm.md) briefing.
- **How it is reached:** from the active operation on the [Operations](20-operations.md) screen — a **persistent edge tab (a checkmark-box affordance)** that **slides the checklist open** on demand and pushes it closed again ([`side-drawer.md`](../03-primitives/side-drawer.md), [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)); the tab bar and the operation canvas stay mounted behind it (on tablet / laptop the canvas stays **live** beside the drawer). (Exactly what it binds to is a per-screen OQ below.)
- **Placement (resolved at the #217 gate, Alex — [#306](https://github.com/Vergo402/paratech-struts/issues/306) / [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)):** not a front-and-center destination — a **side-drawer** summoned from a small edge tab. The checklist's depth, attestation, and content below are **unchanged**; only how it is reached changed (the [side-drawer](../03-primitives/side-drawer.md) is the new 15th primitive that carries it).
- **Issue:** [#204](https://github.com/Vergo402/paratech-struts/issues/204).

## Primary role(s) and surface(s)

- **Primary role(s):** the **team officer** working the task (attests). The **Operations Section Chief** reads it at the CP (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** — genuinely; the officer is in/near the structure, gloved, one-handed. Tablet adds the CP read (the Operations Section Chief reads the tree alongside the resource board — [`nested-checklist.md`](../03-primitives/nested-checklist.md) §Surface adaptations).

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **persistent chrome** (Safety Officer + OP header — [`00-ia-foundation.md`](00-ia-foundation.md) §Persistent chrome); the **active section** (one open at a time, below), its next undone step highest, with the section's progress count.
- **Below fold:** the other sections, collapsed to header + count.

### Tablet (CP)
- **Above fold:** more sections visible at once; the Operations Section Chief reads the task tree **beside the [Operations](20-operations.md) resource board** — the two panes at once.

### Laptop (Toughbook)
- **Above fold:** keyboard-first (arrows move row-to-row, Space/Enter toggles the focused leaf); denser, with attribution columns for review.

### Broadcast TV (read-only projection)
- Minimal — section **headers + completion counts** at ≥ 32pt, **no toggle affordance**, zero motion. (Task-level detail is rarely the room board; the [Operations](20-operations.md) status grid usually is.)

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **attest the next step** — a **tap on the leaf row** (the whole 56pt row). It is a **tap, not a slide** — and this is the deliberate contrast with the **shore-point status slide** on the [Operations](20-operations.md) board ([`card.md`](../03-primitives/card.md) / [ADR-010](../11-decisions/ADR-010-status-commit-model.md)): advancing a shore point is safety-consequential (slide); checking a task step is a reversible attestation (tap) ([`nested-checklist.md`](../03-primitives/nested-checklist.md) Universal Rule 4).
- **Secondary actions:** expand / collapse a section; the breadcrumb back to [Operations](20-operations.md).
- **Destructive / terminal:** **none.** Un-checking is reversible + audited (D7.5); no confirm.

## Composed primitives

- [x] [nested-checklist](../03-primitives/nested-checklist.md) — **the spine.** The 2-level tree (section → step); leaf-vs-section rule; every check signed; one-section-open default (below).
- [x] [list](../03-primitives/list.md) — the sectioned tree arrangement; doctrine order, never alphabetical.
- [x] [badge](../03-primitives/badge.md) — the section **count badge** + the **completion checkmark** at 100%.
- [x] [button](../03-primitives/button.md) — section expand/collapse; the breadcrumb back-path.
- [x] [empty-state](../03-primitives/empty-state.md) — no task in scope (first-run); the content-deferral posture (below).
- [x] [side-drawer](../03-primitives/side-drawer.md) — **the container.** The checklist lives in the edge-summoned companion panel (phone = scrimmed; tablet / laptop = beside a live canvas); the [`nested-checklist`](../03-primitives/nested-checklist.md) is its content ([ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)).
- [ ] picker · card · sheet · modal · input · toggle · segmented · slider · toast · loading-state · warning-gate — not core. **Leaf checks tap-toggle in place inside the drawer; no confirm** — the [`00-ia-foundation.md`](00-ia-foundation.md) modal-vs-sheet **Task Level Checklist** row.

> **A new primitive would be a gate escalation, not a spec decision.**

## What ships v4.0 vs. v4.1 (the content-deferral line)

Same line as its siblings ([`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ7, [`06-synthesis.md`](../06-synthesis.md) Open-Q5): the **screen + the primitive ship v4.0**; the **task-level doctrine step lists** (the paraphrased strings) ship **v4.1 behind a flag**, paraphrase-then-approved by Alex, never invented (Principle 1). Phase F fixes the IA; the words come later.

## Auto-collapse default (resolves [`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ2 for this screen)

**One section open at a time** on phone (the primitive's comfortable default for a shallow phone tree). **Auto-collapse-completed = off by default** — at only 2 levels the benefit is small, and the active branch never auto-collapses regardless (Principle 7).

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — the whole tree works phone-only, gloved, one section at a time.
- [x] **NIMS terminology** — titles spelled out; attribution shows the role spelled out + mono time ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Every check is signed** (D7.5) — who + when, visible + audited ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Attribution).
- [x] **Tap-to-attest, never slide** — the explicit contrast with the shore-point status slide ([ADR-010](../11-decisions/ADR-010-status-commit-model.md) / [`card.md`](../03-primitives/card.md)).
- [x] **No safety-hold / no in-app comms / no push** (Principle 10) — a task step is never a gate.
- [x] **No celebration on completion** (Principle 3/11).
- [x] **Tap geometry** — the whole 56pt row toggles; 8pt dead zones.
- [x] **Capacity demoted** — not a datum here.
- [x] **Reached via the side-drawer** (the third overlay type — [ADR-019](../11-decisions/ADR-019-side-drawer-primitive.md)); leaf checks **tap-toggle in place inside it**, no confirm — the [`00-ia-foundation.md`](00-ia-foundation.md) modal-vs-sheet Task Level Checklist row.
- [x] **Persistent Safety Officer + OP header** (operation-facing).

## The four-surface table (this screen)

| Dimension | Phone | Tablet (CP) | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | side-drawer (near-full-width) over the operation; one section open | side-drawer **companion beside** the resource board (live) | companion drawer + keyboard + attribution columns | section headers + counts (no drawer) |
| Above fold | active section + next undone step + count | more sections + the board pane | sections + audit columns | completion % per section |
| Primary-action affordance | tap the leaf row | tap the leaf row | Space/Enter on focused leaf | — (read-only) |
| Added density | one section focus | two-pane (tree + board) | review columns | — |
| Does NOT render | — | — | — | toggle affordance, any overlay |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — no task in scope:** the first-run [`empty-state`](../03-primitives/empty-state.md) — set-glyph + a one-line reason + the back-path to [Operations](20-operations.md); settle before empty.
- **Empty — content not yet seeded (v4.0):** the calm "checklists arrive with their content" posture, **never a safety-looking void** (Principle 7); the screen and primitive exist, the step strings land v4.1.
- **Error:** a failed check write **queues locally** (sync indicator); never `alert()`.
- **Loading:** local-first — the tree renders instantly; show nothing ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each leaf is a `role="checkbox"` + `aria-checked`; **sections are `group`s with the progress spoken as words** — never `aria-checked="mixed"` ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Accessibility; registry in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- **Attribution announced with state** ("…checked, Rescue Group Supervisor 14:32. Double tap to uncheck").
- **Keyboard parity:** Space/Enter toggles a focused leaf, Enter expands/collapses a section, arrows move row-to-row ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- Reduced motion loses nothing (fill → instant swap; chevron snaps).

## Open questions (per-screen)

1. **Attach-target — DIRECTION DECIDED (Phase G gate review M13).** A Task Level Checklist binds to **a task/assignment under a Group — a per-Group/per-task instance, NOT one operation-wide shared tree** (an op-wide instance would have two Group Supervisors attesting the same tree, collapsing multi-Group visibility). It lives in a **side-drawer** side-tab on the active operation, scoped to "my task." The full data-model representation of a task/assignment + the [Operations](20-operations.md) drilldown that surfaces it is a Phase H/I binding detail; the direction is set (see the [`23-task-level-checklist.md`](../09-workflows/23-task-level-checklist.md) workflow).
2. **Checklist content deferred to v4.1** ([`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ7) — IA only here.
3. **Auto-collapse = one-section-open resolved here**; per-user override is a Phase G / Settings call.
