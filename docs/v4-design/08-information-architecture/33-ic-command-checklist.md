# IA Spec: IC Command Checklist

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules (tab map, navigation, modal-vs-sheet row, four-surface framework, persistent chrome) and does not re-derive them.
> Source: [`03-primitives/nested-checklist.md`](../03-primitives/nested-checklist.md) — **the component is fully specified there; this spec composes it, it does not re-spec it** — its "one primitive, three screens" table fixes this screen's depth (deep, 3–4 levels) and primary surface (tablet command post). [`06-synthesis.md`](../06-synthesis.md) §3.5 (the checklist feature) + Open-Q5 (content deferral), essays [`05-essays/03-ic-workflow.md`](../05-essays/03-ic-workflow.md) (the IC's phase-by-phase checklist + the ICS-201 brief), [`05-essays/06-domain-ux.md`](../05-essays/06-domain-ux.md); [ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [ADR-010](../11-decisions/ADR-010-status-commit-model.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)/[015](../11-decisions/ADR-015-navigation-pattern.md)/[016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); GitHub [#203](https://github.com/Vergo402/paratech-struts/issues/203). **Net-new — no v3 antecedent** (a repo grep for `checklist` returns nothing; [`nested-checklist.md`](../03-primitives/nested-checklist.md) §v3 grounding).

---

## Purpose

The Incident Commander's **doctrine attestation tree**: the phase-by-phase command checklist (size-up → ongoing command → transfer/termination), worked top-down, where every step is *signed* — who attested it and when — so the IC never loses the thread of what command has done, and the after-action record shows who attested what (Principle 7 — visible safety; D7.5 — audit).

## Where it lives

- **Tab / parent:** **Command** — a screen nested under the Command tab (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)). It is **not** SitStat (SitStat is the Command home composition — [30-command-sitstat.md](30-command-sitstat.md)); the checklist is its own destination.
- **How it is reached:** one tap from [SitStat](30-command-sitstat.md), alongside the [Org Chart](31-org-chart.md) and [Hazard Log](32-hazard-log.md) entries — push navigation within the Command tab, the tab bar stays mounted (per the [navigation model](00-ia-foundation.md), [ADR-015](../11-decisions/ADR-015-navigation-pattern.md)).
- **Placement is changing (#217 gate, Alex):** like the [Task Level Checklist](22-task-level-checklist.md), this moves from a front-and-center destination to a **small side tab (a checkmark-box affordance) that slides open** on demand, via a **new side-drawer primitive** (the 15th primitive — a gate escalation). The primitive + the re-home are a **Phase F gate follow-up** (its own issue); the checklist's depth, attestation, and content below are **unchanged** — only how it is reached changes.
- **Issue:** [#203](https://github.com/Vergo402/paratech-struts/issues/203).

## Primary role(s) and surface(s)

- **Primary role(s):** the **Incident Commander** (attests). The **Operations Section Chief** and **Group Supervisors** may read it (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **phone is the floor** — a solo IC must be able to work the checklist phone-only (the active phase focuses; completed ancestors collapse to headers). **Tablet (command post) is the canonical surface** ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Surface adaptations) — multiple phases visible at once, full attribution captions without truncation. This is the one checklist whose richest surface is the tablet, but the floor rule holds: nothing is tablet-only.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** the **persistent chrome** (Safety Officer + OP-period header — see [`00-ia-foundation.md`](00-ia-foundation.md) §Persistent chrome); the **active (incomplete) phase**, its next undone step highest, with the overall progress count ("Phase II — Ongoing command, 4 / 9").
- **Below fold:** completed phases, **auto-collapsed** to a one-line "complete" header + checkmark (below); the **ICS-201 briefing** entry.

### Tablet (CP)
- **Above fold:** **multiple phases visible at once** as a board; full attribution captions ("Incident Commander · 14:32"); the ICS-201 brief readable alongside.

### Laptop (Toughbook)
- **Above fold:** keyboard-first (arrows move row-to-row, Space/Enter toggles the focused leaf); the dense audit / after-action view; the **ICS-201 auto-populate** (a D6 v4 expansion — [`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ3) is this surface's affair.

### Broadcast TV (read-only projection)
- Phase **headers + completion counts** and checkboxes at `--icon-size-xl` (48px), body ≥ 32pt, **zero motion** ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Surface adaptations). It is a snapshot of attested progress on the poll — **no toggle affordance renders** (the board cannot attest). Completion % per phase is the whole-room glance.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **attest the next step** — a **tap on the leaf row** (the whole 56pt row toggles). It is deliberately **a tap, not a slide**: a checklist attestation is reversible at re-tap cost, so it uses the lightest gesture — the slide is reserved for safety-consequential shore-point status ([`card.md`](../03-primitives/card.md) / [ADR-010](../11-decisions/ADR-010-status-commit-model.md); the tap-vs-slide rule is [`nested-checklist.md`](../03-primitives/nested-checklist.md) Universal Rule 4).
- **Secondary actions:** expand / collapse a phase (the chevron); open the **ICS-201 briefing view**.
- **Destructive / terminal:** **none in the common path.** Un-checking a leaf is a reversible, **audited** event (the log records the un-check, its actor, and time — D7.5); it never raises an "Are you sure?" (Principle 6; [`nested-checklist.md`](../03-primitives/nested-checklist.md) anti-patterns).

## Composed primitives

- [x] [nested-checklist](../03-primitives/nested-checklist.md) — **the spine of this screen.** The deep 3–4-level tree (Phases I–IV → assessments → sub-items); leaf-vs-section rule; every check signed; auto-collapse ON (below). The component is owned by that doc; this screen sets only the IA decisions it defers.
- [x] [list](../03-primitives/list.md) — the tree/drill-down arrangement the checklist rides (order is doctrine order, never alphabetical).
- [x] [badge](../03-primitives/badge.md) — the section **count badge** ("8 / 13", tabular) and the **completion checkmark** at 100%.
- [x] [card](../03-primitives/card.md) — the **ICS-201 briefing** card (current objectives, resource summary, Safety Officer, hazard log — the doctrine-derived fields that ship v4.0; below).
- [x] [button](../03-primitives/button.md) — expand/collapse; the ICS-201 briefing entry.
- [x] [empty-state](../03-primitives/empty-state.md) — no active operation (first-run → Start Operation); the content-deferral posture (below).
- [x] [sheet](../03-primitives/sheet.md) — the **ICS-201 briefing review surface** (a review sheet; or a pushed full-screen route if it outgrows 60vh — [`modal.md`](../03-primitives/modal.md) OQ2). Leaf checks raise **no overlay**.
- [ ] picker · modal · input · toggle · segmented · slider · toast · loading-state · warning-gate — not core. **Leaf checks tap-toggle in place; no modal, no confirm** (the [`00-ia-foundation.md`](00-ia-foundation.md) modal-vs-sheet doctrine; this screen has no per-screen row of its own, so it follows the **Task Level Checklist** row — tap-toggle in place — and adds only the ICS-201 review surface).

> **A new primitive would be a gate escalation, not a spec decision.** Everything here composes the 14.

## What ships v4.0 vs. v4.1 (the content-deferral line)

[`nested-checklist.md`](../03-primitives/nested-checklist.md) (OQ7) and [`06-synthesis.md`](../06-synthesis.md) Open-Q5 draw this line, and this screen honors it exactly:

- **v4.0 ships:** the screen + the primitive + the **ICS-201 briefing structure** — the *doctrine-derived field set* (current objectives, resource summary, Safety Officer identity, hazard-log summary), assembled from role history + the operation with **no extra entry at transfer time** (essay 03). That is structure, not paraphrase.
- **v4.1 ships (behind a feature flag):** the **IC command-doctrine checklist content** — the paraphrased phase/step strings — after the first Hartsdale drill validates that an IC engages with a digital checklist mid-incident. The strings are sourced doctrine, **paraphrase-then-approved by Alex**, never invented (Principle 1; [`nested-checklist.md`](../03-primitives/nested-checklist.md) Universal Rule 6).

The IA — where the screen lives, what it composes, how it behaves across four surfaces — is fixed now (Phase F); the words come later.

## Auto-collapse default (resolves [`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ2 for this screen)

**Auto-collapse completed branches = ON.** With four long phases, collapsing a finished phase to its one-line "complete" summary keeps the IC's focus on the active phase. **The active (incomplete) branch never auto-collapses** — hiding the next undone step would violate visible safety (Principle 7). A per-user override is a Phase G / Settings concern.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — usable phone-only (active phase focuses; ancestors collapse to headers). Tablet is an enhancement, never an assumption.
- [x] **NIMS terminology** — titles spelled out; attribution shows the **role spelled out** ("Incident Commander · 14:32", never "IC") ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md), [`voice-and-tone.md`](../07-design-system/voice-and-tone.md)).
- [x] **Every check is signed** (D7.5) — who (role) + when (mono time), visible on the row and audited; a check with no attribution is forbidden ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Attribution).
- [x] **Tap-to-attest, never slide** — the deliberate departure from the card's safety-slide ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)); never import the slide here.
- [x] **No safety-hold / no in-app comms / no push** (Principle 10) — a checklist step is **never a gate**; it records, it does not block.
- [x] **No celebration on completion** — finishing Phase IV swaps in a "complete" count + checkmark; no confetti, no chime (Principle 3/11).
- [x] **Tap geometry** — the whole 56pt row toggles, not the 24px box; 8pt dead zones.
- [x] **Capacity demoted** — not a datum on this screen.
- [x] **Modal-vs-sheet** — leaf checks tap-toggle in place (no overlay); the ICS-201 brief = a review sheet / pushed route ([`modal.md`](../03-primitives/modal.md) OQ2). Cites the [`00-ia-foundation.md`](00-ia-foundation.md) doctrine (no IC-Command row exists; follows the Task Level Checklist row).
- [x] **Persistent Safety Officer + OP header** (IC-facing).

## The four-surface table (this screen)

| Dimension | Phone | Tablet (CP) | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | single column; active phase focused | multi-phase board | dense + keyboard + ICS-201 auto-populate | phase headers + counts grid |
| Above fold | active phase + next undone step + progress | several phases at once + attribution | several phases + audit columns | phase headers + completion % |
| Primary-action affordance | tap the leaf row | tap the leaf row | Space/Enter on focused leaf | — (read-only) |
| Added density | one phase focus | full attribution captions | ICS-201 auto-populate; after-action | — |
| Does NOT render | — | — | — | toggle affordance, any overlay |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading; only the particular here.)

- **Empty — no active operation:** the first-run [`empty-state`](../03-primitives/empty-state.md) — "No active operation" + **Start Operation** (the checklist belongs to an operation).
- **Empty — content not yet seeded (v4.0):** before the v4.1 doctrine content ships, the screen presents the **ICS-201 briefing** (the v4.0 deliverable), not a bare "no checklist" void — a safety-relevant screen never reads as missing data (Principle 7; [`00-ia-foundation.md`](00-ia-foundation.md)).
- **Error:** a failed check write **queues locally** (sync indicator); never `alert()`.
- **Loading:** local-first — the tree renders instantly from local state; the only genuine wait is ICS-201 assembly if it pulls history → determinate ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each leaf is a real `role="checkbox"` + `aria-checked`; **sections are `group`s whose name carries the progress as words** ("Phase I, Size up, 8 of 13 complete") — never `aria-checked="mixed"` ([`nested-checklist.md`](../03-primitives/nested-checklist.md) §Accessibility; the script registry lives in [`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- **Attribution is announced with the state** — "Checkbox, Determine location, checked, Incident Commander 14:32. Double tap to uncheck."
- **Keyboard parity:** Space/Enter toggles a focused leaf, Enter expands/collapses a section, arrows move row-to-row — no toggle is pointer-only ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).
- Reduced motion loses nothing (the fill becomes an instant swap; the chevron snaps).

## Open questions (per-screen)

1. **Checklist content deferred to v4.1** — the IC-command doctrine strings ship behind a flag after the first Hartsdale drill; v4.0 ships the ICS-201 briefing structure ([`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ7, [`06-synthesis.md`](../06-synthesis.md) Open-Q5). IA only here.
2. **ICS-201 auto-populate** — driving the brief's fields from checklist state + role history is a D6 v4 expansion and a Phase G workflow ([`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ3); the reserved attribution record is what makes it possible.
3. **Phone visible-depth cap** — exactly how many of the 3–4 levels stay visible before ancestors collapse to focus the active branch is affordance geometry for the Phase H slice ([`nested-checklist.md`](../03-primitives/nested-checklist.md) OQ6).
4. **Auto-collapse default = ON resolved here**; the per-user override is a Phase G / Settings call.
